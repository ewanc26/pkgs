/**
 * OAuth client setup for Jasper
 * Note: Full OAuth implementation requires client registration with PDS/ATProto services.
 * This module provides the infrastructure for future OAuth support.
 */

/**
 * Placeholder for OAuth client initialization.
 * OAuth requires:
 * 1. A client-metadata.json hosted at a public URL
 * 2. A callback server to receive OAuth redirects
 * 3. Session and state storage
 *
 * For now, users should authenticate with app passwords.
 */
export async function getOAuthClient(): Promise<never> {
  throw new Error(
    "OAuth not yet implemented. Use app password authentication instead.\n" +
      "Create an app password at: https://bsky.app/settings/app-passwords",
  );
}
