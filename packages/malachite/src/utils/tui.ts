/**
 * The full-screen-capable terminal interface, when a person is at a terminal.
 * Ink and React are loaded only then; scripts, pipes and CI keep the plain
 * output, and so does anything that fails to start the interface.
 */
import type { Tui } from '@ewanc26/tui';

let active: Tui | null = null;

/** The running interface, or null in plain mode. */
export function getTui(): Tui | null {
  return active;
}

export function setTui(tui: Tui | null): void {
  active = tui;
}

export async function startTui(): Promise<Tui | null> {
  const { shouldUseTui } = await import('@ewanc26/tui/detect');
  if (!shouldUseTui()) return null;
  try {
    const { createTui } = await import('@ewanc26/tui');
    active = createTui({
      // Ctrl+C reaches the interface as a key: hand it to the killswitch.
      onInterrupt: () => process.emit('SIGINT', 'SIGINT'),
    });
  } catch (error) {
    console.warn(`Terminal interface unavailable (${(error as Error).message}); continuing in plain mode.`);
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
