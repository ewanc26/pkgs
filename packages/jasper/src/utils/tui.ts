/**
 * Jasper's use of the shared terminal interface. During an import, Ctrl+C asks
 * it to stop after the current post; otherwise it exits.
 */
import { startTui as start } from "@ewanc26/tui/session";

export { getTui, setTui, stopTui, exit, waitCallbacks } from "@ewanc26/tui/session";

let stopHandler: (() => void) | null = null;
let stopping = false;

/** Register how to stop the running import; null once it has finished. */
export function onStopRequest(handler: (() => void) | null): void {
  stopHandler = handler;
  stopping = false;
}

export function stopRequested(): boolean {
  return stopping;
}

/** Ctrl+C. Returns false when there is nothing to wind down. */
export function requestStop(): boolean {
  if (!stopHandler) return false;
  stopping = true;
  stopHandler();
  return true;
}

export function startTui() {
  return start({ onInterrupt: requestStop });
}
