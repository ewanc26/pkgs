/**
 * NodeOAuthClient singleton for the malachite CLI.
 */

import { NodeOAuthClient, type NodeOAuthClientOptions } from '@atproto/oauth-client-node';
import { sessionStore, stateStore } from './oauth-store.js';

const CALLBACK_PORT = 8765;
const CALLBACK_HOST = '127.0.0.1';

export const CALLBACK_URL = `http://${CALLBACK_HOST}:${CALLBACK_PORT}/oauth/callback`;
export const OAUTH_SCOPE = 'atproto transition:generic';

// Simple in-process lock — prevents NodeOAuthClient's "no lock mechanism" warning.
const locks = new Map<string, Promise<void>>();
async function requestLock<T>(key: string, fn: () => T | PromiseLike<T>): Promise<T> {
  while (locks.has(key)) await locks.get(key);
  let resolve!: () => void;
  const p = new Promise<void>((r) => { resolve = r; });
  locks.set(key, p);
  try { return await fn(); } finally { locks.delete(key); resolve(); }
}

let _client: NodeOAuthClient | null = null;

export async function getOAuthClient(): Promise<NodeOAuthClient> {
  if (_client) return _client;

  const opts: NodeOAuthClientOptions = {
    clientMetadata: {
      client_id: `http://localhost?${new URLSearchParams([
        ['redirect_uri', CALLBACK_URL],
        ['scope', OAUTH_SCOPE],
      ])}`,
      client_name: 'Malachite CLI',
      client_uri: 'https://malachite.croft.click',
      redirect_uris: [CALLBACK_URL],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      application_type: 'web',
      scope: OAUTH_SCOPE,
      dpop_bound_access_tokens: false,
    },
    stateStore,
    sessionStore,
    plcDirectoryUrl: 'https://plc.directory',
    requestLock,
  };

  _client = new NodeOAuthClient(opts);
  return _client;
}

export function getCallbackPort(): number {
  return CALLBACK_PORT;
}
