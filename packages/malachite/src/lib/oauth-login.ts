/**
 * Browser-based OAuth login flow for the malachite CLI.
 *
 * Spins up a loopback HTTP server, opens the user's browser for PDS
 * authentication, waits for the callback, exchanges the code for tokens,
 * and persists the session via oauth-store.
 */

import http from 'node:http';
import { Agent } from '@atproto/api';
import { resolveIdentity } from '../core/auth.js';
import * as ui from '../utils/ui.js';
import { prompt } from '../utils/input.js';
import {
  OAUTH_SCOPE,
  getCallbackPort,
  getOAuthClient,
} from './oauth-client.js';
import {
  deleteOAuthSession,
  getOAuthHandle,
  getOAuthStorePath,
  listOAuthSessions,
  listOAuthSessionsWithHandles,
  setOAuthHandle,
} from './oauth-store.js';

export {
  deleteOAuthSession,
  getOAuthHandle,
  listOAuthSessions,
  listOAuthSessionsWithHandles,
};

const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface CallbackResult {
  success: boolean;
  params?: Record<string, string>;
  error?: string;
}

function waitForCallback(): Promise<CallbackResult> {
  return new Promise((resolve) => {
    const port = getCallbackPort();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
      if (url.pathname !== '/oauth/callback') {
        res.writeHead(404).end('Not found');
        return;
      }

      const params: Record<string, string> = {};
      url.searchParams.forEach((v, k) => { params[k] = v; });
      if (timeoutId) clearTimeout(timeoutId);

      const success = !params['error'];
      res.writeHead(200, { 'Content-Type': 'text/html' }).end(`
        <!doctype html>
        <html>
          <head><meta charset="utf-8"><title>Malachite</title></head>
          <body style="font-family:monospace;background:#1e1e2e;color:#cdd6f4;padding:3rem;text-align:center">
            <h1 style="font-weight:400">${success ? 'Authentication successful' : 'Authentication failed'}</h1>
            <p>${success ? 'You can close this tab and return to the terminal.' : (params['error_description'] ?? params['error'] ?? '')}</p>
          </body>
        </html>`);

      server.close(() =>
        resolve(
          success
            ? { success: true, params }
            : { success: false, error: params['error_description'] ?? params['error'] }
        )
      );
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve({
        success: false,
        error:
          err.code === 'EADDRINUSE'
            ? `Port ${port} is already in use. Close whatever is using it and try again.`
            : `Server error: ${err.message}`,
      });
    });

    server.listen(port, '127.0.0.1');

    timeoutId = setTimeout(() => {
      server.close(() =>
        resolve({ success: false, error: 'Timed out waiting for OAuth callback. Please try again.' })
      );
    }, CALLBACK_TIMEOUT_MS);
  });
}

/**
 * Full browser-based OAuth login.
 * Resolves the identity, opens the browser, waits for the callback,
 * exchanges the code for a session, and saves it to disk.
 */
export async function loginWithOAuth(handle?: string): Promise<Agent> {
  ui.header('ATProto OAuth Login');

  if (!handle) {
    handle = await prompt('Handle or DID: ');
  } else {
    ui.keyValue('Handle or DID', handle);
  }
  if (!handle) throw new Error('Handle is required.');

  console.log('');

  ui.startSpinner('Resolving identity…');
  const identity = await resolveIdentity(handle);
  ui.succeedSpinner(`Resolved: ${identity.did}`);

  ui.startSpinner('Initialising OAuth client…');
  const client = await getOAuthClient();
  const authUrl = await client.authorize(identity.did, { scope: OAUTH_SCOPE });
  ui.succeedSpinner('Ready — opening browser…');
  ui.info(`Login URL: ${authUrl}`);

  try {
    const open = (await import('open')).default;
    await open(authUrl.toString());
  } catch {
    ui.warning('Could not open browser automatically. Please visit the URL above.');
  }

  ui.startSpinner('Waiting for authentication…');
  const result = await waitForCallback();

  if (!result.success) {
    ui.failSpinner('Authentication failed');
    throw new Error(result.error ?? 'OAuth callback failed');
  }

  ui.startSpinner('Completing authentication…');
  const { session } = await client.callback(new URLSearchParams(result.params!));

  // Store the handle for friendly display, unless the user typed a DID directly.
  if (!handle.startsWith('did:')) {
    await setOAuthHandle(session.did, handle);
  }

  ui.succeedSpinner(`Logged in as ${handle}`);
  ui.info(`Session saved to ${getOAuthStorePath()}`);
  ui.info('Your session will refresh automatically when needed.');
  console.log('');

  return new Agent(session);
}

/**
 * Restore a stored OAuth session for the given DID.
 * Returns null if no session is stored or if the refresh fails.
 */
export async function restoreOAuthSession(did: string): Promise<Agent | null> {
  try {
    const client = await getOAuthClient();
    const session = await client.restore(did);
    return new Agent(session);
  } catch {
    return null;
  }
}
