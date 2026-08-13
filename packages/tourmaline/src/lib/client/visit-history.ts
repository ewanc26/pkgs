/**
 * "Since your last visit" delta — localStorage only, no server infra.
 *
 * A full recurring digest (email/Bluesky push on a schedule) would need
 * external infrastructure this stateless app doesn't have (a scheduler, an
 * email provider, a subscriber list). This is the on-demand equivalent:
 * remember what a listener's profile looked like the last time they opened
 * it on this browser, and surface what's changed since, computed the
 * moment they return rather than pushed to them.
 */
import type { ListenerProfile } from "$lib/types";

interface VisitSnapshot {
  totalScrobbles: number;
  uniqueArtists: number;
  /** ms epoch */
  timestamp: number;
}

export interface VisitDelta {
  daysSinceLastVisit: number;
  newScrobbles: number;
  newArtistCount: number;
  /** Artists first heard since the last visit, most recent first. */
  newArtists: string[];
}

const KEY_PREFIX = "tm:visit:";

function readSnapshot(did: string): VisitSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + did);
    if (!raw) return null;
    return JSON.parse(raw) as VisitSnapshot;
  } catch {
    return null;
  }
}

function writeSnapshot(did: string, profile: ListenerProfile): void {
  try {
    const snapshot: VisitSnapshot = {
      totalScrobbles: profile.totalScrobbles,
      uniqueArtists: profile.uniqueArtists,
      timestamp: Date.now(),
    };
    localStorage.setItem(KEY_PREFIX + did, JSON.stringify(snapshot));
  } catch {
    /* storage full or unavailable — silent fail */
  }
}

/**
 * Reads the last-visit snapshot (if any), computes what's changed against
 * the current profile, then overwrites the snapshot with the current state.
 * Call once per completed profile load — returns null on a first-ever visit.
 */
export function checkInAndComputeDelta(did: string, profile: ListenerProfile): VisitDelta | null {
  const previous = readSnapshot(did);
  writeSnapshot(did, profile);

  if (!previous) return null;

  const daysSinceLastVisit = Math.floor((Date.now() - previous.timestamp) / (1000 * 60 * 60 * 24));

  // Nothing meaningful to report for a same-day repeat visit.
  if (daysSinceLastVisit < 1) return null;

  const newArtists = profile.discoveredArtists
    .filter((a) => new Date(a.firstListen + "T00:00:00Z").getTime() > previous.timestamp)
    .sort((a, b) => b.firstListen.localeCompare(a.firstListen))
    .map((a) => a.name);

  return {
    daysSinceLastVisit,
    newScrobbles: Math.max(0, profile.totalScrobbles - previous.totalScrobbles),
    newArtistCount: Math.max(0, profile.uniqueArtists - previous.uniqueArtists),
    newArtists,
  };
}
