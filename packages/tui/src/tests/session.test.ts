import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Tui } from '../index.js';
import { setTui, startTui, waitCallbacks } from '../session.js';

describe('session', () => {
  afterEach(() => setTui(null));

  it('stays plain when not at a terminal', async () => {
    assert.equal(await startTui(), null);
  });

  it('shows each wait once and reports an early retry once', async () => {
    let shown = 0;
    setTui({ countdown: async () => void shown++ } as unknown as Tui);
    const wait = waitCallbacks();
    const info = { reason: 'limited', resumeAt: Date.now() + 60_000 };
    wait.onWait(info);
    wait.onWait(info);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(shown, 1);
    assert.equal(wait.retryNow(), true);
    assert.equal(wait.retryNow(), false);
  });

  it('does not ask to retry a cancelled wait', async () => {
    setTui({ countdown: async () => {} } as unknown as Tui);
    const wait = waitCallbacks(() => true);
    wait.onWait({ reason: 'limited', resumeAt: Date.now() + 60_000 });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(wait.retryNow(), false);
  });
});
