/**
 * Update notice and `self-update` command shared by the @ewanc26 CLI tools.
 *
 * Nothing is installed unless the user runs `<tool> self-update`. The check
 * behind the notice runs in a detached process at most once a day, so it never
 * delays the command being run.
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readState, writeState } from './state.js';
import { detectInstallation, installCommand } from './install.js';
import { newestRelease, type Release } from './sources.js';
import { compareVersions } from './version.js';

export { compareVersions, cleanVersion } from './version.js';
export { newestRelease, type Release } from './sources.js';
export { detectInstallation } from './install.js';

const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;

export interface Options {
  /** The npm package name, e.g. `@ewanc26/opal`. */
  packageName: string;
  /** The caller's `import.meta.url`, used to find its installed package. */
  from: string;
}

/** Injection points for tests. */
export interface Context {
  argv: string[];
  env: NodeJS.ProcessEnv;
  isTTY: boolean;
  log: (line: string) => void;
  error: (line: string) => void;
  newest: (name: string) => Promise<Release | null>;
  npmRoot: () => string | null;
  run: (command: string, args: string[]) => number;
  refresh: (name: string) => void;
}

const shell = process.platform === 'win32';

function defaults(): Context {
  return {
    argv: process.argv.slice(2),
    env: process.env,
    isTTY: Boolean(process.stderr.isTTY),
    log: (line) => console.log(line),
    error: (line) => console.error(line),
    newest: (name) => newestRelease(name),
    npmRoot: () => {
      try {
        return realpathSync(execFileSync('npm', ['root', '-g'], { encoding: 'utf8', shell }).trim());
      } catch {
        return null;
      }
    },
    run: (command, args) => spawnSync(command, args, { stdio: 'inherit', shell }).status ?? 1,
    refresh: (name) => {
      const script = fileURLToPath(new URL('./refresh.js', import.meta.url));
      spawn(process.execPath, [script, name], { detached: true, stdio: 'ignore', windowsHide: true })
        .on('error', () => {})
        .unref();
    },
  };
}

/** The directory and version of the installed package that `from` belongs to. */
export function findPackage(from: string, name: string): { dir: string; version: string } {
  let dir = dirname(realpathSync(fileURLToPath(from)));
  for (;;) {
    const manifest = join(dir, 'package.json');
    if (existsSync(manifest)) {
      const pkg = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string; version?: string };
      if (pkg.name === name && pkg.version) return { dir, version: pkg.version };
    }
    if (dirname(dir) === dir) throw new Error(`cannot find the package.json of ${name}`);
    dir = dirname(dir);
  }
}

async function selfUpdate(name: string, from: string, ctx: Context): Promise<number> {
  const checkOnly = ctx.argv.includes('--check');
  const { dir, version } = findPackage(from, name);
  let release: Release | null;
  try {
    release = await ctx.newest(name);
  } catch (err) {
    ctx.error(`Could not check for updates: ${(err as Error).message}`);
    return 1;
  }
  if (!release || compareVersions(release.version, version) <= 0) {
    ctx.log(`${name} ${version} is up to date.`);
    return 0;
  }
  ctx.log(`${name} ${release.version} is available from ${release.source} (installed: ${version}).`);
  if (checkOnly) return 0;
  const install = detectInstallation(dir, name, ctx.npmRoot);
  if (install.manager === null) {
    ctx.error(`Not updating: ${install.reason}.`);
    return 1;
  }
  const [command, args] = installCommand(install.manager, release.spec);
  ctx.log(`Running: ${command} ${args.join(' ')}`);
  const status = ctx.run(command, args);
  if (status !== 0) ctx.error(`Update failed (${command} exited with ${status}).`);
  return status;
}

function notify(name: string, from: string, ctx: Context): void {
  const { env } = ctx;
  if (!ctx.isTTY || env.CI || env.NO_UPDATE_NOTIFIER || env.EWANC26_NO_UPDATE_CHECK) return;
  const { dir, version } = findPackage(from, name);
  // A checkout or npx run cannot be updated from here, so do not nag it.
  if (!dir.replaceAll('\\', '/').includes('/node_modules/') || dir.includes('_npx')) return;
  const state = readState(name, env);
  if (state.latest && compareVersions(state.latest, version) > 0) {
    const bin = name.slice(name.indexOf('/') + 1);
    ctx.error(`Update available: ${name} ${version} -> ${state.latest}. Run \`${bin} self-update\`.`);
  }
  if (Date.now() - (state.checkedAt ?? 0) >= CHECK_EVERY_MS) {
    // Recorded before the check so that a failing one is not retried on every run.
    if (writeState(name, { ...state, checkedAt: Date.now() }, env)) ctx.refresh(name);
  }
}

/**
 * Call first thing in a CLI entry point. Returns the exit code when the command
 * was `self-update`, which the caller should exit with; otherwise null, after
 * printing an update notice if one is due.
 */
export async function handleSelfUpdate(options: Options, overrides: Partial<Context> = {}): Promise<number | null> {
  const ctx = { ...defaults(), ...overrides };
  if (ctx.argv[0] === 'self-update') return selfUpdate(options.packageName, options.from, ctx);
  try {
    notify(options.packageName, options.from, ctx);
  } catch {
    // The notice must never break the command the user asked for.
  }
  return null;
}
