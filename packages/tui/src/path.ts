import { existsSync } from 'node:fs';
import { homedir } from 'node:os';

/**
 * Turn what a terminal delivers for a typed or dragged-in file into a path:
 * surrounding quotes, shell backslash escapes and a leading `~` are removed.
 */
export function cleanPathInput(raw: string, platform: NodeJS.Platform = process.platform): string {
  const trimmed = raw.trim();
  let cleaned = trimmed.replace(/^(['"])(.*)\1$/, '$2');
  // Backslashes separate directories on Windows; elsewhere an unquoted one that
  // does not name a real file is an escape.
  if (cleaned === trimmed && platform !== 'win32' && !existsSync(cleaned)) {
    cleaned = cleaned.replace(/\\(.)/g, '$1');
  }
  return cleaned === '~' || cleaned.startsWith('~/') ? homedir() + cleaned.slice(1) : cleaned;
}
