/**
 * Authentication wrapper for Jasper
 * Supports OAuth (recommended) and app password fallback
 */
import { AtpAgent, Agent } from "@atproto/api";
import { prompt } from "../utils/input.js";
import * as ui from "../utils/ui.js";
import { log } from "../utils/logger.js";
import {
  listOAuthSessions,
  deleteOAuthSession,
  getOAuthHandle as getStoredOAuthHandle,
} from "../utils/oauth-store.js";
import {
  loginWithOAuth as _loginWithOAuth,
  restoreOAuthSession,
  listOAuthSessionsWithHandles as _listOAuthSessionsWithHandles,
} from "./oauth-login.js";

// Re-export OAuth functions
export {
  loginWithOAuth,
  restoreOAuthSession,
  listOAuthSessionsWithHandles,
} from "./oauth-login.js";

export function getOAuthHandle(did: string): Promise<string | undefined> {
  return getStoredOAuthHandle(did);
}

/**
 * Resolve a handle or DID to get PDS URL
 */
export async function resolveIdentity(
  identifier: string,
): Promise<{ did: string; handle: string; pds: string }> {
  // Handle DIDs directly
  if (identifier.startsWith("did:")) {
    const did = identifier;
    const didDocUrl = did.startsWith("did:plc:")
      ? `https://plc.directory/${did}`
      : `https://${did.slice("did:web:".length)}/.well-known/did.json`;

    const didRes = await fetch(didDocUrl);
    if (!didRes.ok) {
      throw new Error(`Failed to fetch DID document: ${didRes.status}`);
    }

    const didDoc = (await didRes.json()) as {
      alsoKnownAs?: string[];
      service?: Array<{ id: string; type: string; serviceEndpoint: string }>;
    };

    const pdsService = didDoc.service?.find((s) => s.id === "#atproto_pds");
    if (!pdsService) {
      throw new Error("No PDS service found in DID document");
    }

    // Get handle from alsoKnownAs
    const handle =
      didDoc.alsoKnownAs
        ?.find((aka) => aka.startsWith("at://"))
        ?.slice("at://".length) ?? did;

    return { did, handle, pds: pdsService.serviceEndpoint };
  }

  // Use the public Bluesky resolver for handles
  const resolverUrl =
    "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle";
  const url = `${resolverUrl}?handle=${encodeURIComponent(identifier)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to resolve handle: ${res.status}`);
  }

  const data = (await res.json()) as { did: string };
  const did = data.did;
  const handle = identifier;

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

  return { did, handle, pds: pdsService.serviceEndpoint };
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
 * Delete an OAuth session
 */
export async function logout(did?: string): Promise<boolean> {
  const sessions = await listOAuthSessions();

  if (sessions.length === 0) {
    log.info("No stored sessions");
    return false;
  }

  const targetDid = did || sessions[0];
  if (!targetDid) {
    return false;
  }

  return deleteOAuthSession(targetDid);
}

/**
 * Authenticate — try OAuth session first, then app password
 */
export async function authenticate(
  handle?: string,
  password?: string,
  useOAuth = true,
): Promise<Agent> {
  // Try to restore existing OAuth session
  if (useOAuth) {
    const sessions = await listOAuthSessions();
    if (sessions.length > 0) {
      const did = handle?.startsWith("did:") ? handle : sessions[0]!;
      log.info(`Attempting to restore OAuth session for ${did}...`);
      const agent = await restoreOAuthSession(did);
      if (agent) {
        log.info("Restored OAuth session successfully.");
        return agent;
      }
      log.warn("Could not restore OAuth session.");
    }
  }

  // Fall back to app password
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
