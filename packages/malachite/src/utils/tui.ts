/**
 * Malachite's use of the shared terminal interface: only for a person at a
 * terminal, with Ctrl+C handed to the killswitch.
 */
import { startTui as start } from '@ewanc26/tui/session';

export { getTui, setTui, stopTui, exit } from '@ewanc26/tui/session';

export function startTui() {
  // Ctrl+C reaches the interface as a key: pass it on as the signal.
  return start({ onInterrupt: () => process.emit('SIGINT', 'SIGINT') });
}
