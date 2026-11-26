import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { after, test } from 'node:test';
import { handleSelfUpdate } from '../index.js';
import { detectInstallation } from '../install.js';
import { newestRelease, type Fetch, type Release } from '../sources.js';
import { readState, writeState } from '../state.js';
import { cleanVersion, compareVersions } from '../version.js';

const NAME = '@ewanc26/opal';
const temp = realpathSync(mkdtempSync(join(tmpdir(), 'self-update-')));
after(() => rmSync(temp, { recursive: true, force: true }));

function installed(version: string, ...parent: string[]) {
  const dir = join(temp, ...parent, NAME);
  mkdirSync(join(dir, 'dist'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: NAME, version }));
  writeFileSync(join(dir, 'dist', 'bin.js'), '');
  return { dir, from: pathToFileURL(join(dir, 'dist', 'bin.js')).href };
}

const asset = (version: string) => ({
  tag_name: `opal-v${version}`,
  assets: [
    {
      name: `ewanc26-opal-${version}.tgz`,
      browser_download_url: `https://github.com/ewanc26/pkgs/releases/download/opal-v${version}/ewanc26-opal-${version}.tgz`,
    },
  ],
});

function fakeFetch(npm: string | null, github: unknown[] | null): Fetch {
  return (async (url: string | URL | Request) => {
    const body = String(url).includes('registry.npmjs.org') ? npm && { version: npm } : github;
    return body ? new Response(JSON.stringify(body)) : new Response('', { status: 500 });
  }) as Fetch;
}

test('versions follow semver precedence', () => {
  assert.equal(compareVersions('0.10.0', '0.9.9'), 1);
  assert.equal(compareVersions('1.0.0-rc.1', '1.0.0'), -1);
  assert.equal(compareVersions('1.0.0-rc.2', '1.0.0-rc.10'), -1);
  assert.equal(compareVersions('v1.2.3', '1.2.3'), 0);
  assert.equal(cleanVersion('v1.2.3+build'), '1.2.3');
  assert.equal(cleanVersion('1.2'), null);
});

test('the newer source wins and npm wins a tie', async () => {
  const pick = (npm: string | null, gh: unknown[] | null) => newestRelease(NAME, fakeFetch(npm, gh));
  assert.equal((await pick('0.3.1', [asset('0.4.0')]))?.source, 'github');
  assert.equal((await pick('0.5.0', [asset('0.4.0')]))?.source, 'npm');
  assert.equal((await pick('0.4.0', [asset('0.4.0')]))?.source, 'npm');
  assert.equal((await pick('0.3.1', null))?.version, '0.3.1');
  assert.equal((await pick(null, [asset('0.4.0')]))?.version, '0.4.0');
  await assert.rejects(pick(null, null));
});

test('GitHub releases that cannot be trusted or installed are ignored', async () => {
  const bad = [
    { ...asset('9.0.0'), draft: true },
    { ...asset('9.0.1'), prerelease: true },
    { tag_name: 'opal-v9.0.2', assets: [] },
    { ...asset('9.0.3'), tag_name: 'jasper-v9.0.3' },
    {
      tag_name: 'opal-v9.0.4',
      assets: [{ name: 'ewanc26-opal-9.0.4.tgz', browser_download_url: 'https://example.com/x.tgz' }],
    },
  ];
  assert.equal((await newestRelease(NAME, fakeFetch('0.3.1', bad)))?.version, '0.3.1');
});

test('only global installs are updated', () => {
  const root = () => '/usr/lib/node_modules';
  const pnpm10 = `/home/a/.local/share/pnpm/global/5/.pnpm/@ewanc26+opal@0.4.0/node_modules/${NAME}`;
  const pnpm12 = `/home/a/Library/pnpm/store/v11/links/${NAME}/0.4.0/abc/node_modules/${NAME}`;
  const globals = () => [pnpm10, pnpm12];
  const manager = (dir: string) => detectInstallation(dir, NAME, root, globals).manager;
  assert.equal(manager(`/usr/lib/node_modules/${NAME}`), 'npm');
  assert.equal(manager(pnpm10), 'pnpm');
  assert.equal(manager(pnpm12), 'pnpm');
  // A project's copy in the same store is not one pnpm lists as global.
  assert.equal(manager(pnpm12.replace('/abc/', '/def/')), null);
  assert.equal(manager(`/home/a/.bun/install/global/node_modules/${NAME}`), 'bun');
  assert.equal(manager('/home/a/git/pkgs/packages/opal'), null);
  assert.equal(manager(`/home/a/.npm/_npx/abc/node_modules/${NAME}`), null);
  assert.equal(manager(`/home/a/project/node_modules/${NAME}`), null);
});

const release: Release = { source: 'npm', version: '0.4.0', spec: `${NAME}@0.4.0` };

function context(argv: string[], npmRoot: string) {
  const out: string[] = [];
  const ran: string[] = [];
  const refreshed: string[] = [];
  return {
    out,
    ran,
    refreshed,
    overrides: {
      argv,
      env: { EWANC26_STATE_DIR: join(temp, 'state') },
      isTTY: true,
      log: (l: string) => out.push(l),
      error: (l: string) => out.push(l),
      newest: async () => release,
      npmRoot: () => npmRoot,
      pnpmGlobals: () => [] as string[],
      run: (c: string, a: string[]) => (ran.push([c, ...a].join(' ')), 0),
      refresh: (n: string) => refreshed.push(n),
    },
  };
}

test('self-update installs a newer release through npm', async () => {
  const { from } = installed('0.3.1', 'global', 'node_modules');
  const c = context(['self-update'], join(temp, 'global', 'node_modules'));
  assert.equal(await handleSelfUpdate({ packageName: NAME, from }, c.overrides), 0);
  assert.deepEqual(c.ran, [`npm install -g ${NAME}@0.4.0`]);
});

test('self-update installs through pnpm when pnpm lists the package as global', async () => {
  const { dir, from } = installed('0.3.1', 'store', 'links', 'abc', 'node_modules');
  const c = context(['self-update'], '/nowhere');
  const overrides = { ...c.overrides, pnpmGlobals: () => [dir] };
  assert.equal(await handleSelfUpdate({ packageName: NAME, from }, overrides), 0);
  assert.deepEqual(c.ran, [`pnpm add -g ${NAME}@0.4.0`]);
});

test('--check and a current version install nothing', async () => {
  const old = installed('0.3.1', 'check', 'node_modules');
  const checking = context(['self-update', '--check'], join(temp, 'check', 'node_modules'));
  assert.equal(await handleSelfUpdate({ packageName: NAME, from: old.from }, checking.overrides), 0);
  const current = installed('0.4.0', 'current', 'node_modules');
  const updating = context(['self-update'], join(temp, 'current', 'node_modules'));
  assert.equal(await handleSelfUpdate({ packageName: NAME, from: current.from }, updating.overrides), 0);
  assert.deepEqual([...checking.ran, ...updating.ran], []);
});

test('a checkout is never overwritten', async () => {
  const { from } = installed('0.3.1', 'checkout');
  const c = context(['self-update'], '/nowhere');
  assert.equal(await handleSelfUpdate({ packageName: NAME, from }, c.overrides), 1);
  assert.deepEqual(c.ran, []);
});

test('other commands get a cached notice and at most one daily check', async () => {
  const { from } = installed('0.3.1', 'notice', 'node_modules');
  const c = context(['--help'], '/nowhere');
  const call = () => handleSelfUpdate({ packageName: NAME, from }, c.overrides);
  assert.equal(await call(), null);
  assert.deepEqual([c.out, c.refreshed], [[], [NAME]]);
  writeState(NAME, { ...readState(NAME, c.overrides.env), latest: '0.4.0' }, c.overrides.env);
  assert.equal(await call(), null);
  assert.match(c.out[0], /0\.3\.1 -> 0\.4\.0.*opal self-update/);
  assert.equal(c.refreshed.length, 1);
});

test('no notice or check in CI, when opted out, or without a terminal', async () => {
  const { from } = installed('0.3.1', 'quiet', 'node_modules');
  for (const patch of [{ env: { CI: '1' } }, { env: { NO_UPDATE_NOTIFIER: '1' } }, { isTTY: false }]) {
    const c = context([], '/nowhere');
    await handleSelfUpdate({ packageName: NAME, from }, { ...c.overrides, ...patch });
    assert.deepEqual([c.out, c.refreshed], [[], []]);
  }
});
