/** Kept free of Ink and React, so a program can ask before loading them. */

/** Whether both ends are a person at a capable terminal who has not opted out. */
export function shouldUseTui(
  argv: readonly string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
  stdin: { isTTY?: boolean } = process.stdin,
  stdout: { isTTY?: boolean } = process.stdout,
): boolean {
  return Boolean(
    stdin.isTTY &&
      stdout.isTTY &&
      !env.CI &&
      env.TERM !== 'dumb' &&
      !argv.includes('--no-tui') &&
      !argv.includes('--non-interactive'),
  );
}
