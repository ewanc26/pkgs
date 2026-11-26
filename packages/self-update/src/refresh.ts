// Run detached by the notice: look up the newest version and cache it.
import { newestRelease } from './sources.js';
import { readState, writeState } from './state.js';

const name = process.argv[2];
if (name) {
  try {
    const release = await newestRelease(name);
    if (release) writeState(name, { ...readState(name), latest: release.version });
  } catch {
    // Offline or rate limited: try again tomorrow.
  }
}
