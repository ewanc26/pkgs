import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert';
import type { Tui } from '@ewanc26/tui';
import { setTui } from '../utils/tui.js';
import { confirm, menu, prompt } from '../utils/input.js';
import { createProgressBar, startSpinner, succeedSpinner } from '../utils/ui.js';
import { sleepWithCountdown } from '../utils/wait-display.js';

/** A stand-in interface that records what it was asked to show. */
function recorder(answer = '') {
  const calls: unknown[][] = [];
  const note = (...call: unknown[]) => void calls.push(call);
  setTui({
    select: async (message: string, options: { value: unknown }[]) => (note('select', message), options[0]!.value),
    input: async (message: string, options?: { mask?: boolean }) => (note('input', message, options?.mask), answer),
    confirm: async (message: string, defaultYes?: boolean) => (note('confirm', message, defaultYes), Boolean(defaultYes)),
    status: (text: string | null) => note('status', text),
    progress: (p: unknown) => note('progress', p),
    countdown: async (wait: { reason: string }) => note('countdown', wait.reason),
    close: async () => {},
  } as unknown as Tui);
  return calls;
}

// Prompting refuses to run without a terminal, which the test runner lacks.
const asTerminal = async (run: () => Promise<void>) => {
  const { isTTY } = process.stdin;
  const { CI } = process.env;
  process.stdin.isTTY = true;
  delete process.env.CI;
  try {
    await run();
  } finally {
    process.stdin.isTTY = isTTY;
    if (CI !== undefined) process.env.CI = CI;
  }
};

describe('prompts through the terminal interface', () => {
  afterEach(() => setTui(null));

  it('keeps deletion confirmations defaulting to No, without a typed hint', async () => {
    const calls = recorder();
    await asTerminal(async () => {
      assert.strictEqual(await confirm('Are you sure you want to continue? (y/N)'), false);
      assert.strictEqual(await confirm('Are you sure you want to continue?', false), false);
    });
    for (const call of calls) assert.deepStrictEqual(call, ['confirm', 'Are you sure you want to continue?', false]);
  });

  it('masks passwords and unquotes dragged-in paths', async () => {
    const calls = recorder("'/tmp/a b.csv'");
    await asTerminal(async () => {
      assert.strictEqual(await prompt('Path: '), '/tmp/a b.csv');
      assert.strictEqual(await prompt('App password: ', true), "'/tmp/a b.csv'");
    });
    assert.deepStrictEqual(calls.map((c) => c[2]), [false, true]);
  });

  it('shows menus, spinners, progress bars and waits in the interface', async () => {
    const calls = recorder();
    assert.strictEqual(await menu('Source', [{ key: 'A', label: 'First' }]), 'a');
    startSpinner('Fetching');
    succeedSpinner('Fetched');
    const bar = createProgressBar(10, 'Backfilling');
    bar.update(4);
    bar.stop();
    await sleepWithCountdown({ resumeAt: Date.now() + 60_000, reason: 'rate limited' });
    assert.deepStrictEqual(calls, [
      ['select', 'Source'],
      ['status', 'Fetching'],
      ['status', null],
      ['progress', { label: 'Backfilling', done: 0, total: 10 }],
      ['progress', { label: 'Backfilling', done: 4, total: 10 }],
      ['progress', null],
      ['countdown', 'rate limited'],
    ]);
  });
});
