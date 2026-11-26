import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { cleanVersion } from './version.js';

export interface State {
  checkedAt?: number;
  latest?: string;
}

// The same root the tools keep their other state in (croft-click-core/paths).
function statePath(name: string, env: NodeJS.ProcessEnv): string {
  const root = env.EWANC26_STATE_DIR || join(homedir(), '.ewanc26');
  return join(root, 'self-update', `${name.replace('@', '').replace('/', '-')}.json`);
}

export function readState(name: string, env: NodeJS.ProcessEnv = process.env): State {
  try {
    const raw = JSON.parse(readFileSync(statePath(name, env), 'utf8')) as State;
    return {
      checkedAt: typeof raw.checkedAt === 'number' ? raw.checkedAt : undefined,
      latest: typeof raw.latest === 'string' ? (cleanVersion(raw.latest) ?? undefined) : undefined,
    };
  } catch {
    return {};
  }
}

export function writeState(name: string, state: State, env: NodeJS.ProcessEnv = process.env): boolean {
  try {
    const path = statePath(name, env);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
