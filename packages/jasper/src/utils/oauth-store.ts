/**
 * OAuth session storage
 * Stores OAuth sessions in ~/.jasper/oauth.json
 */
import fs from "fs";
import path from "path";
import type { OAuthSession } from "../core/types.js";
import { getJasperDir } from "./logger.js";

const OAUTH_FILE = "oauth.json";

function getOAuthFilePath(): string {
  const jasperDir = getJasperDir();
  if (!fs.existsSync(jasperDir)) {
    fs.mkdirSync(jasperDir, { recursive: true });
  }
  return path.join(jasperDir, OAUTH_FILE);
}

/**
 * Load all OAuth sessions
 */
export function loadOAuthSessions(): Map<string, OAuthSession> {
  const filePath = getOAuthFilePath();

  if (!fs.existsSync(filePath)) {
    return new Map();
  }

  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const sessions = JSON.parse(data) as Record<string, OAuthSession>;
    return new Map(Object.entries(sessions));
  } catch (error) {
    console.error("Failed to load OAuth sessions:", error);
    return new Map();
  }
}

/**
 * Save an OAuth session
 */
export function saveOAuthSession(did: string, handle?: string): void {
  const sessions = loadOAuthSessions();
  const existing = sessions.get(did);

  sessions.set(did, {
    did,
    handle: handle || existing?.handle,
    createdAt: existing?.createdAt || Date.now(),
    lastUsedAt: Date.now(),
  });

  const filePath = getOAuthFilePath();
  const obj = Object.fromEntries(sessions);
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

/**
 * Delete an OAuth session
 */
export function deleteOAuthSession(did: string): boolean {
  const sessions = loadOAuthSessions();
  if (!sessions.has(did)) {
    return false;
  }
  sessions.delete(did);

  const filePath = getOAuthFilePath();
  const obj = Object.fromEntries(sessions);
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
  return true;
}

/**
 * List all stored OAuth session DIDs
 */
export function listOAuthSessions(): string[] {
  const sessions = loadOAuthSessions();
  return Array.from(sessions.keys());
}

/**
 * Get the handle for a DID (if stored)
 */
export function getOAuthHandle(did: string): string | undefined {
  const sessions = loadOAuthSessions();
  return sessions.get(did)?.handle;
}

/**
 * Check if any OAuth sessions exist
 */
export function hasOAuthSessions(): boolean {
  const sessions = loadOAuthSessions();
  return sessions.size > 0;
}
