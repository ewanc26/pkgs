import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatResumeTime, sleepWithCountdown, terminalWaitCallbacks } from '../utils/wait-display.js';
import { formatTimeLeft } from '../lib/publisher.js';

describe('quota wait countdown', () => {
  it('names the day only when the wait runs past today', () => {
    const now = new Date(2026, 0, 5, 12, 0).getTime();
    const soon = formatResumeTime(now + 3_600_000, now);
    const later = formatResumeTime(now + 86_400_000, now);
    assert.ok(later.endsWith(soon.slice(-2)) && later.length > soon.length, `${soon} / ${later}`);
  });

  it('ends at once when cancelled', async () => {
    const start = Date.now();
    await sleepWithCountdown({ resumeAt: start + 3_600_000, reason: 'test', isCancelled: () => true });
    assert.ok(Date.now() - start < 2000);
  });

  it('does not ask to retry unless the user did', async () => {
    const wait = terminalWaitCallbacks();
    wait.onWait({ reason: 'test', totalWaitSeconds: 1, remainingSeconds: 1, resumeAt: Date.now() + 50, serverConfirmed: true });
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.strictEqual(wait.retryNow(), false);
  });
});

describe('time left estimate (#163)', () => {
  it('does not round slow throughput up to a record a second', () => {
    // 63,102 records at 0.11 rec/s is about 159 hours, not 17.
    assert.match(formatTimeLeft(63_102, 0.11), /^~159h/);
    assert.strictEqual(formatTimeLeft(10, 0), 'time left unknown');
  });
});
