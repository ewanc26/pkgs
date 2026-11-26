/**
 * One interface per process, started only for a person at a terminal. Nothing
 * here loads Ink or React until then, and anything that fails to start the
 * interface leaves the program in plain mode.
 */
import { shouldUseTui } from './detect.js';
import type { Tui, TuiOptions } from './index.js';

let active: Tui | null = null;

/** The running interface, or null in plain mode. */
export function getTui(): Tui | null {
  return active;
}

/** Replace the interface; for tests. */
export function setTui(tui: Tui | null): void {
  active = tui;
}

export async function startTui(options: TuiOptions = {}): Promise<Tui | null> {
  if (active || !shouldUseTui()) return active;
  try {
    const { createTui } = await import('./index.js');
    active = createTui(options);
  } catch (error) {
    console.warn(
      `Terminal interface unavailable (${(error as Error).message}); continuing in plain mode.`,
    );
  }
  return active;
}

export async function stopTui(): Promise<void> {
  const tui = active;
  active = null;
  await tui?.close();
}

/** End the process, restoring the terminal first. */
export async function exit(code: number): Promise<never> {
  await stopTui();
  process.exit(code);
}

/**
 * Rate-limit callbacks for a publisher that does the waiting itself: show its
 * wait as a countdown, and report once when the user asks to retry early.
 */
export function waitCallbacks(isCancelled: () => boolean = () => false): {
  onWait: (wait: { reason: string; resumeAt: number }) => void;
  retryNow: () => boolean;
} {
  let shown = 0;
  let retry = false;
  return {
    onWait: ({ reason, resumeAt }) => {
      if (!active || resumeAt === shown) return; // a heartbeat of the same wait
      shown = resumeAt;
      retry = false;
      void active.countdown({ reason, resumeAt, isCancelled }).then(() => {
        // Ended early without a cancellation: the user pressed Enter.
        if (Date.now() < resumeAt && !isCancelled()) retry = true;
      });
    },
    retryNow: () => {
      const requested = retry;
      retry = false;
      return requested;
    },
  };
}
