/**
 * Shared local save-directory resolution for pkgs' write-capable CLI tools.
 *
 * Node-only — deliberately not re-exported from `index.ts`, which stays
 * environment-agnostic for browser consumers (e.g. malachite-web).
 * Import via `@ewanc26/croft-click-core/paths`.
 *
 * Every tool used to keep its own dotfile directly under the home directory
 * (~/.malachite, ~/.jasper, ...). They now share one root, ~/.ewanc26/<tool>,
 * so credentials, logs, and caches only need to be found/backed up/cleaned
 * up in one place. `EWANC26_STATE_DIR` overrides the root for all tools.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function getEwanc26RootDir(): string {
  return process.env.EWANC26_STATE_DIR || path.join(os.homedir(), '.ewanc26');
}

/**
 * Resolve a tool's state directory under the shared ~/.ewanc26 root.
 *
 * If the unified directory doesn't exist yet but a legacy per-tool
 * directory does (`~/.<tool>`, or the transitional `~/.pkgs/<tool>`), the
 * legacy directory is renamed into place so existing credentials/logs/state
 * survive the switch without user action.
 */
export function getToolStateDir(tool: string): string {
  const target = path.join(getEwanc26RootDir(), tool);

  if (!fs.existsSync(target)) {
    const legacyCandidates = [
      path.join(os.homedir(), `.${tool}`),
      path.join(os.homedir(), '.pkgs', tool),
    ];

    for (const legacy of legacyCandidates) {
      if (fs.existsSync(legacy)) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.renameSync(legacy, target);
        break;
      }
    }
  }

  return target;
}
