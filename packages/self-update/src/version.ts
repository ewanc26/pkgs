const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

/** The version without a leading "v" or build metadata, or null if it is not semver. */
export function cleanVersion(input: string): string | null {
  const m = SEMVER.exec(input);
  return m ? `${m[1]}.${m[2]}.${m[3]}${m[4] ? `-${m[4]}` : ''}` : null;
}

/** semver.org precedence. Both arguments must already be valid versions. */
export function compareVersions(a: string, b: string): number {
  const [x, y] = [SEMVER.exec(a), SEMVER.exec(b)];
  if (!x || !y) throw new Error(`not a version: ${x ? b : a}`);
  for (let i = 1; i <= 3; i++) {
    const d = Number(x[i]) - Number(y[i]);
    if (d !== 0) return Math.sign(d);
  }
  const [p, q] = [x[4], y[4]];
  if (p === q) return 0;
  if (p === undefined) return 1;
  if (q === undefined) return -1;
  const [l, r] = [p.split('.'), q.split('.')];
  for (let i = 0; i < Math.max(l.length, r.length); i++) {
    if (l[i] === undefined) return -1;
    if (r[i] === undefined) return 1;
    if (l[i] === r[i]) continue;
    const [ln, rn] = [/^\d+$/.test(l[i]), /^\d+$/.test(r[i])];
    if (ln && rn) return Math.sign(Number(l[i]) - Number(r[i]));
    if (ln !== rn) return ln ? -1 : 1;
    return l[i] < r[i] ? -1 : 1;
  }
  return 0;
}
