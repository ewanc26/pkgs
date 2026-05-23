/**
 * AT Protocol OAuth client — browser-only.
 * Wraps @atproto/oauth-client-browser for the share flow.
 * This is the only "write" path in Tourmaline — used solely
 * to post a personality card to Bluesky.
 */

import { BrowserOAuthClient } from "@atproto/oauth-client-browser";
import { Agent } from "@atproto/api";

const SCOPE = "atproto repo:app.bsky.feed.post blob:image/png repo:click.croft.toolkit.use";

const CLIENT_ID = import.meta.env.DEV
  ? `http://localhost?${new URLSearchParams([
      ["redirect_uri", "http://127.0.0.1:5173/share"],
      ["scope", SCOPE],
    ])}`
  : "https://tourmaline.croft.click/oauth-client-metadata.json";

let _client: Promise<BrowserOAuthClient> | null = null;

function getClient(): Promise<BrowserOAuthClient> {
  if (!_client) {
    _client = BrowserOAuthClient.load({
      clientId: CLIENT_ID,
      handleResolver: "https://bsky.social",
    });
  }
  return _client;
}

/**
 * Call once on mount on the /share page.
 * Processes any OAuth callback params in the URL and restores stored sessions.
 * Returns an Agent if a session is active, or null if the user still needs to sign in.
 */
export async function initOAuth(): Promise<Agent | null> {
  const client = await getClient();
  const result = await client.init();
  if (!result) return null;
  return new Agent(result.session);
}

/**
 * Kicks off the OAuth sign-in flow for the given handle.
 * Redirects the browser away — this never resolves normally.
 */
export async function signInWithOAuth(handle: string): Promise<never> {
  const client = await getClient();
  await client.signIn(handle, { scope: SCOPE });
  throw new Error("redirect should have occurred");
}
