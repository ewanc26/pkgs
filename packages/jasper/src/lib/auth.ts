/**
 * Authentication wrapper for Jasper
 * Supports OAuth (requires setup) and app password fallback
 */
import { AtpAgent } from "@atproto/api";
import {
  saveOAuthSession,
  loadOAuthSessions,
  deleteOAuthSession,
  getOAuthHandle as getStoredOAuthHandle,
} from "../utils/oauth-store.js";
import { prompt } from "../utils/input.js";
import * as ui from "../utils/ui.js";
import { log } from "../utils/logger.js";

export function getOAuthHandle(did: string): string | undefined {
  return getStoredOAuthHandle(did);
}

/**
 * Resolve a handle or DID to get PDS URL
 */
async function resolveIdentity(
  identifier: string,
): Promise<{ did: string; pds: string }> {
  // Use the public Bluesky resolver
  const resolverUrl =
    "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle";
  const url = `${resolverUrl}?handle=${encodeURIComponent(identifier)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to resolve handle: ${res.status}`);
  }

  const data = (await res.json()) as { did: string };
  const did = data.did;

  // Get DID document to find PDS
  const didDocUrl = did.startsWith("did:plc:")
    ? `https://plc.directory/${did}`
    : `https://${did.slice("did:web:".length)}/.well-known/did.json`;

  const didRes = await fetch(didDocUrl);
  if (!didRes.ok) {
    throw new Error(`Failed to fetch DID document: ${didRes.status}`);
  }

  const didDoc = (await didRes.json()) as {
    service?: Array<{ id: string; type: string; serviceEndpoint: string }>;
  };

  const pdsService = didDoc.service?.find((s) => s.id === "#atproto_pds");
  if (!pdsService) {
    throw new Error("No PDS service found in DID document");
  }

  return { did, pds: pdsService.serviceEndpoint };
}

/**
 * Login with app password
 */
export async function loginWithPassword(
  identifier: string,
  password: string,
): Promise<AtpAgent> {
  ui.header("Jasper Login");

  ui.startSpinner("Resolving identity...");
  const { did, pds } = await resolveIdentity(identifier);
  ui.succeedSpinner(`Resolved to ${did}`);

  ui.startSpinner("Authenticating...");
  const agent = new AtpAgent({ service: pds });

  try {
    await agent.login({ identifier: did, password });
    ui.succeedSpinner("Logged in successfully!");
    ui.keyValue("DID", agent.session?.did || "unknown");
    ui.keyValue("Handle", agent.session?.handle || "unknown");

    return agent;
  } catch (error) {
    ui.failSpinner("Login failed");
    const err = error as Error;

    if (err.message.includes("AuthFactorTokenRequired")) {
      throw new Error(
        "Two-factor authentication required. Please use your app password.",
      );
    } else if (err.message.includes("AccountTakedown")) {
      throw new Error("Account is suspended or has been taken down.");
    } else if (err.message.includes("InvalidCredentials")) {
      throw new Error(
        "Invalid credentials. Please check your handle and app password.",
      );
    } else {
      throw new Error(`Login failed: ${err.message}`);
    }
  }
}

/**
 * Login with OAuth (placeholder - requires OAuth client registration)
 * OAuth requires registering a client metadata file and running a callback server.
 * For now, this function provides guidance on using app password instead.
 */
export async function loginWithOAuth(): Promise<AtpAgent> {
  ui.header("OAuth Login");

  log.blank();
  log.info("OAuth login requires setting up an OAuth client.");
  log.info("For now, please use app password authentication instead.");
  log.blank();
  log.info("To create an app password:");
  log.info("  1. Go to https://bsky.app/settings/app-passwords");
  log.info("  2. Create a new app password");
  log.info(
    "  3. Use it with: jasper --handle <handle> --password <app-password>",
  );
  log.blank();
  log.warn("OAuth support will be added in a future version.");

  throw new Error("OAuth login not yet implemented. Use app password instead.");
}

/**
 * List OAuth sessions with handles
 */
export async function listOAuthSessionsWithHandles(): Promise<
  Array<{ did: string; handle?: string }>
> {
  const sessions = loadOAuthSessions();
  const result: Array<{ did: string; handle?: string }> = [];

  for (const [did, session] of sessions) {
    result.push({ did, handle: session.handle });
  }

  return result;
}

/**
 * Delete an OAuth session
 */
export async function logout(did?: string): Promise<boolean> {
  const sessions = loadOAuthSessions();

  if (sessions.size === 0) {
    log.info("No stored sessions");
    return false;
  }

  // If no DID specified, logout from first session
  const targetDid = did || Array.from(sessions.keys())[0];
  if (!targetDid) {
    return false;
  }

  return deleteOAuthSession(targetDid!);
}

/**
 * Authenticate with app password
 */
export async function authenticate(
  handle?: string,
  password?: string,
): Promise<AtpAgent> {
  // No OAuth session, use app password
  if (!handle || !password) {
    log.blank();
    log.info("Please provide your credentials:");
    log.blank();

    if (!handle) {
      handle = await prompt("Handle or DID: ");
    }
    if (!password) {
      password = await prompt("App password: ", true);
    }
  }

  return loginWithPassword(handle!, password!);
}
