/**
 * Terminal countdown for quota waits: shows when the import resumes, lets the
 * user retry early, and stays responsive to Ctrl+C.
 */
import type { PermitWaitInfo } from '@ewanc26/croft-click-core';
import { log } from './logger.js';
import { formatDuration } from './helpers.js';
import { isImportCancelled } from './killswitch.js';

export interface CountdownOptions {
  /** Unix time in milliseconds at which the wait ends. */
  resumeAt: number;
  reason: string;
  isCancelled?: () => boolean;
}

/** `14:05`, or with the day when the time is not today. */
export function formatResumeTime(resumeAt: number, now = Date.now()): string {
  const at = new Date(resumeAt);
  const time = at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return at.toDateString() === new Date(now).toDateString()
    ? time
    : `${at.toLocaleDateString(undefined, { weekday: 'short' })} ${time}`;
}

/**
 * Sleep until `resumeAt`, resolving early on cancellation or, in an interactive
 * terminal, when the user presses Enter.
 */
export function sleepWithCountdown(opts: CountdownOptions): Promise<void> {
  const { resumeAt, reason, isCancelled = isImportCancelled } = opts;
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const left = () => Math.max(0, resumeAt - Date.now());

  log.warn(`⏸️  ${reason}.`);
  log.info(`   Resuming at ${formatResumeTime(resumeAt)} (in ${formatDuration(left())}).`);
  if (interactive) log.info('   Enter: try again now · Ctrl+C: stop');

  return new Promise((resolve) => {
    let lastShownAt = Date.now();
    const finish = () => {
      clearInterval(timer);
      if (interactive) {
        process.stdin.off('data', finish);
        process.stdin.pause();
        process.stdout.write('\r\x1b[2K');
      }
      resolve();
    };
    const timer = setInterval(() => {
      if (isCancelled() || left() === 0) return finish();
      if (interactive) {
        if (Date.now() - lastShownAt < 1000) return;
        process.stdout.write(`\r\x1b[2K⏳ ${formatDuration(left())} left`);
      } else {
        // Piped or CI output: one line a minute, so a long wait never looks hung.
        if (Date.now() - lastShownAt < 60_000) return;
        log.info(`⏳ ${formatDuration(left())} until ${formatResumeTime(resumeAt)}`);
      }
      lastShownAt = Date.now();
    }, 200);
    if (interactive) {
      process.stdin.on('data', finish);
      process.stdin.resume();
    }
  });
}

/**
 * The same countdown for the shared core's limiter, which does the waiting
 * itself and asks only to be told whether to end it early.
 */
export function terminalWaitCallbacks(): { onWait: (info: PermitWaitInfo) => void; retryNow: () => boolean } {
  let shown = 0;
  let retry = false;
  return {
    onWait: ({ resumeAt, reason }) => {
      if (resumeAt === shown) return; // heartbeat of a wait already on screen
      shown = resumeAt;
      retry = false;
      void sleepWithCountdown({ resumeAt, reason }).then(() => {
        // Ended before time without a cancellation: the user pressed Enter.
        if (Date.now() < resumeAt && !isImportCancelled()) retry = true;
      });
    },
    retryNow: () => {
      const requested = retry;
      retry = false;
      return requested;
    },
  };
}
