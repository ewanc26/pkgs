/**
 * ATProto OAuth client — browser-only.
 * Wraps @atproto/oauth-client-browser for use across the app.
 */

import { BrowserOAuthClient } from '@atproto/oauth-client-browser';
import { Agent } from '@atproto/api';

const SCOPE = 'atproto repo:click.croft.toolkit.use';

const CLIENT_ID = import.meta.env.DEV
	? `http://localhost?${new URLSearchParams([
			['redirect_uri', 'http://127.0.0.1:5176/convert'],
			['scope', SCOPE]
		])}`
	: 'https://bismuth.croft.click/client-metadata.json';

// Singleton promise — BrowserOAuthClient.load() is async.
let _client: Promise<BrowserOAuthClient> | null = null;

function getClient(): Promise<BrowserOAuthClient> {
	if (!_client) {
		_client = BrowserOAuthClient.load({
			clientId: CLIENT_ID,
			handleResolver: 'https://bsky.social'
		});
	}
	return _client;
}

/**
 * Call once on mount on the /convert page.
 */
export async function initOAuth(): Promise<Agent | null> {
	const client = await getClient();
	const result = await client.init();
	if (!result) return null;
	return new Agent(result.session);
}

/**
 * Kicks off the OAuth sign-in flow.
 */
export async function signInWithOAuth(handle: string): Promise<never> {
	const client = await getClient();
	await client.signIn(handle, { scope: SCOPE });
	throw new Error('redirect should have occurred');
}
