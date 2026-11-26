export type Installation =
  | { manager: 'npm' | 'pnpm' | 'bun' }
  | { manager: null; reason: string };

/**
 * Who installed the package at `packageDir` (a real path, symlinks resolved).
 * Only a global install is ever updated: anything else belongs to a checkout,
 * a project or a runner that this command must not overwrite.
 */
export function detectInstallation(packageDir: string, name: string, npmRoot: () => string | null): Installation {
  const dir = packageDir.replaceAll('\\', '/').replace(/\/$/, '');
  if (!dir.includes('/node_modules/')) {
    return { manager: null, reason: 'it is running from a source checkout or a linked install' };
  }
  if (dir.includes('/_npx/')) {
    return { manager: null, reason: `it was run through npx; use \`npx ${name}@latest\`` };
  }
  if (dir.includes('/pnpm/global/')) return { manager: 'pnpm' };
  if (dir.includes('/.bun/install/global/')) return { manager: 'bun' };
  const root = npmRoot()?.replaceAll('\\', '/').replace(/\/$/, '');
  if (root && dir === `${root}/${name}`) return { manager: 'npm' };
  return { manager: null, reason: 'it is not a global install; update it through the project that depends on it' };
}

export function installCommand(manager: 'npm' | 'pnpm' | 'bun', spec: string): [string, string[]] {
  return [manager, [manager === 'npm' ? 'install' : 'add', '-g', spec]];
}
