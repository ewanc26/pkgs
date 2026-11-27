import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render } from 'ink-testing-library';
import { App } from '../app.js';
import { formatSeconds, progressBar } from '../format.js';
import { shouldUseTui } from '../detect.js';
import { Store, type Prompt } from '../store.js';
import { emptyField, erase, insert, move } from '../text-field.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 40));
const KEY = { enter: '\r', down: '\u001b[B', left: '\u001b[D', backspace: '\u007f', ctrlC: '\u0003' };

async function mount(prompt?: Prompt) {
  const store = new Store();
  if (prompt) store.set({ prompt });
  let interrupts = 0;
  const ui = render(<App store={store} onInterrupt={() => interrupts++} />);
  await tick();
  const press = async (...keys: string[]) => {
    for (const key of keys) {
      ui.stdin.write(key);
      await tick();
    }
  };
  return { ui, store, press, interrupts: () => interrupts };
}

describe('select', () => {
  const choose = async (...keys: string[]) => {
    let chosen = -1;
    const view = await mount({
      kind: 'select', id: 1, message: 'Pick', initial: 0,
      options: Array.from({ length: 13 }, (_, i) => ({ value: i, label: `Option ${i + 1}` })),
      done: (i) => { chosen = i; },
    });
    await view.press(...keys);
    view.ui.unmount();
    return chosen;
  };

  it('moves with the arrows, wrapping round', async () => {
    assert.equal(await choose(KEY.down, KEY.down, KEY.enter), 2);
    assert.equal(await choose('k', KEY.enter), 12);
  });

  it('takes keys that arrive together', async () => {
    assert.equal(await choose('13', KEY.enter), 12);
    assert.equal(await choose('12\r'), 11);
  });

  it('accepts one and two digit numbers, confirmed by Enter', async () => {
    assert.equal(await choose('1', '3', KEY.enter), 12);
    assert.equal(await choose('7', KEY.enter), 6);
    assert.equal(await choose('7'), -1);
  });
});

describe('confirm', () => {
  const answer = async (defaultYes: boolean, ...keys: string[]) => {
    let value: boolean | null = null;
    const view = await mount({
      kind: 'confirm', id: 1, message: 'Delete?', defaultYes, done: (v) => { value = v; },
    });
    await view.press(...keys);
    view.ui.unmount();
    return value;
  };

  it('keeps the default on Enter', async () => {
    assert.equal(await answer(false, KEY.enter), false);
    assert.equal(await answer(true, KEY.enter), true);
  });

  it('takes y, n and the arrows', async () => {
    assert.equal(await answer(false, 'y'), true);
    assert.equal(await answer(true, 'n'), false);
    assert.equal(await answer(false, KEY.left, KEY.enter), true);
  });
});

describe('input', () => {
  it('edits, validates and submits', async () => {
    let value: string | null = null;
    const view = await mount({
      kind: 'input', id: 1, message: 'Name', mask: false,
      validate: (v) => (v.length < 2 ? 'Too short' : null), done: (v) => { value = v; },
    });
    await view.press('a', KEY.enter);
    assert.match(view.ui.lastFrame()!, /Too short/);
    await view.press('c', KEY.left, 'b', 'x', KEY.backspace, KEY.enter);
    assert.equal(value, 'abc');
    view.ui.unmount();
  });

  it('never shows a masked value', async () => {
    const view = await mount({ kind: 'input', id: 1, message: 'Password', mask: true, done: () => {} });
    await view.press('hunter2');
    assert.doesNotMatch(view.ui.lastFrame()!, /hunter2/);
    assert.match(view.ui.lastFrame()!, /•••••••/);
    view.ui.unmount();
  });
});

describe('live area', () => {
  it('counts down, and Enter asks to retry', async () => {
    const view = await mount();
    let retried = false;
    view.store.set({ wait: { reason: 'rate limited', resumeAt: Date.now() + 125_000, retry: () => { retried = true; } } });
    await tick();
    assert.match(view.ui.lastFrame()!, /Paused: rate limited/);
    assert.match(view.ui.lastFrame()!, /2m 0[45]s/);
    await view.press(KEY.enter);
    assert.equal(retried, true);
    view.ui.unmount();
  });

  it('draws progress and reports Ctrl+C', async () => {
    const view = await mount();
    view.store.set({ progress: { label: 'Importing', done: 50, total: 200, startedAt: Date.now(), startedFrom: 0 } });
    await tick();
    assert.match(view.ui.lastFrame()!, /25%/);
    await view.press(KEY.ctrlC);
    assert.equal(view.interrupts(), 1);
    view.ui.unmount();
  });
});

describe('helpers', () => {
  it('only takes over a capable interactive terminal', () => {
    const tty = { isTTY: true };
    assert.equal(shouldUseTui([], {}, tty, tty), true);
    assert.equal(shouldUseTui([], {}, tty, {}), false);
    assert.equal(shouldUseTui([], {}, {}, tty), false);
    assert.equal(shouldUseTui([], { CI: '1' }, tty, tty), false);
    assert.equal(shouldUseTui([], { TERM: 'dumb' }, tty, tty), false);
    assert.equal(shouldUseTui(['--no-tui'], {}, tty, tty), false);
    assert.equal(shouldUseTui(['--non-interactive'], {}, tty, tty), false);
  });

  it('edits text without control characters', () => {
    const field = insert(emptyField, 'a\u0007bc\n');
    assert.deepEqual(field, { value: 'abc', cursor: 3 });
    assert.deepEqual(erase(move(field, 1)), { value: 'bc', cursor: 0 });
  });

  it('formats time and bars', () => {
    assert.deepEqual([45, 185, 8040].map(formatSeconds), ['45s', '3m 05s', '2h 14m']);
    assert.equal(progressBar(5, 10, 4), '██░░');
    assert.equal(progressBar(0, 0, 4), '░░░░');
  });
});
