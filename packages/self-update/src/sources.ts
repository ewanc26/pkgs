import { cleanVersion, compareVersions } from './version.js';

export interface Release {
  source: 'npm' | 'github';
  version: string;
  /** What to hand the package manager: `name@version`, or a release tarball URL. */
  spec: string;
}

export type Fetch = typeof fetch;

const REPO = 'ewanc26/pkgs';

async function getJson(url: string, fetcher: Fetch, timeoutMs: number): Promise<unknown> {
  const res = await fetcher(url, {
    headers: { accept: 'application/json', 'user-agent': 'ewanc26-self-update' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.json();
}

export async function npmRelease(name: string, fetcher: Fetch, timeoutMs: number): Promise<Release | null> {
  const body = (await getJson(`https://registry.npmjs.org/${name}/latest`, fetcher, timeoutMs)) as {
    version?: unknown;
  };
  const version = typeof body.version === 'string' ? cleanVersion(body.version) : null;
  return version ? { source: 'npm', version, spec: `${name}@${version}` } : null;
}

interface GitHubRelease {
  tag_name?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: { name?: string; browser_download_url?: string }[];
}

/**
 * The newest published release tagged `<short name>-vX.Y.Z` (or `@scope/name@X.Y.Z`)
 * that carries the package tarball. A release without one cannot be installed, so
 * it does not count.
 */
export async function githubRelease(name: string, fetcher: Fetch, timeoutMs: number): Promise<Release | null> {
  const body = await getJson(`https://api.github.com/repos/${REPO}/releases?per_page=100`, fetcher, timeoutMs);
  if (!Array.isArray(body)) return null;
  const short = name.slice(name.indexOf('/') + 1);
  const prefixes = [`${short}-v`, `${name}@`];
  const download = `https://github.com/${REPO}/releases/download/`;
  let best: Release | null = null;
  for (const release of body as GitHubRelease[]) {
    const tag = release.tag_name ?? '';
    const prefix = prefixes.find((p) => tag.startsWith(p));
    if (!prefix || release.draft || release.prerelease) continue;
    const version = cleanVersion(tag.slice(prefix.length));
    if (!version || version.includes('-')) continue;
    // `npm pack` names a scoped tarball <scope>-<name>-<version>.tgz.
    const tarball = `${name.replace('@', '').replace('/', '-')}-${version}.tgz`;
    const url = release.assets?.find((a) => a.name === tarball)?.browser_download_url;
    if (!url?.startsWith(download) || !/^[\w./%@+:-]+$/.test(url)) continue;
    if (!best || compareVersions(version, best.version) > 0) best = { source: 'github', version, spec: url };
  }
  return best;
}

/**
 * The newer of what npm and GitHub offer; npm wins a tie. One source failing is
 * tolerated, both failing is an error.
 */
export async function newestRelease(name: string, fetcher: Fetch = fetch, timeoutMs = 5000): Promise<Release | null> {
  const results = await Promise.allSettled([
    npmRelease(name, fetcher, timeoutMs),
    githubRelease(name, fetcher, timeoutMs),
  ]);
  if (results.every((r) => r.status === 'rejected')) {
    throw new Error((results[0] as PromiseRejectedResult).reason?.message ?? 'no update source answered');
  }
  let best: Release | null = null;
  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    if (!best || compareVersions(r.value.version, best.version) > 0) best = r.value;
  }
  return best;
}
