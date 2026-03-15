/**
 * File-backed OAuth state and session stores for the malachite CLI.
 * State is persisted at ~/.malachite/oauth.json, chmod 600.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from '@atproto/oauth-client-node';
import { getMalachiteStateDir } from '../utils/platform.js';

export function getOAuthStorePath(): string {
  return path.join(getMalachiteStateDir(), 'oauth.json');
}

interface OAuthFile {
  states: Record<string, NodeSavedState>;
  sessions: Record<string, NodeSavedSession>;
  handles: Record<string, string>; // DID → handle
}

async function load(): Promise<OAuthFile> {
  try {
    const content = await fs.readFile(getOAuthStorePath(), 'utf-8');
    const parsed = JSON.parse(content) as Partial<OAuthFile>;
    return {
      states: parsed.states ?? {},
      sessions: parsed.sessions ?? {},
      handles: parsed.handles ?? {},
    };
  } catch {
    return { states: {}, sessions: {}, handles: {} };
  }
}

async function save(store: OAuthFile): Promise<void> {
  const file = getOAuthStorePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(store, null, 2), 'utf-8');
  if (process.platform !== 'win32') await fs.chmod(file, 0o600);
}

// ─── ATProto OAuth client stores ─────────────────────────────────────────────

export const stateStore: NodeSavedStateStore = {
  async set(key, state) {
    const s = await load();
    s.states[key] = state;
    await save(s);
  },
  async get(key) {
    return (await load()).states[key];
  },
  async del(key) {
    const s = await load();
    delete s.states[key];
    await save(s);
  },
};

export const sessionStore: NodeSavedSessionStore = {
  async set(sub, session) {
    const s = await load();
    s.sessions[sub] = session;
    await save(s);
  },
  async get(sub) {
    return (await load()).sessions[sub];
  },
  async del(sub) {
    const s = await load();
    delete s.sessions[sub];
    await save(s);
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function setOAuthHandle(did: string, handle: string): Promise<void> {
  const s = await load();
  s.handles[did] = handle;
  await save(s);
}

export async function getOAuthHandle(did: string): Promise<string | undefined> {
  return (await load()).handles[did];
}

export async function listOAuthSessions(): Promise<string[]> {
  return Object.keys((await load()).sessions);
}

export async function listOAuthSessionsWithHandles(): Promise<Array<{ did: string; handle?: string }>> {
  const s = await load();
  return Object.keys(s.sessions).map((did) => ({ did, handle: s.handles[did] }));
}

export async function deleteOAuthSession(did: string): Promise<boolean> {
  const s = await load();
  if (!s.sessions[did]) return false;
  delete s.sessions[did];
  delete s.handles[did];
  await save(s);
  return true;
}
