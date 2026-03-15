/**
 * Spotify JSON — web layer.
 * Re-exports the shared core logic and adds a browser File API loader.
 */
import type { SpotifyRecord } from '@ewanc26/malachite/core';
import { parseSpotifyJsonContent, convertSpotifyToPlayRecord } from '@ewanc26/malachite/core';

export { parseSpotifyJsonContent, convertSpotifyToPlayRecord };

/** Read one or more browser File objects and parse them as Spotify JSON exports. */
export async function parseSpotifyFiles(files: File[]): Promise<SpotifyRecord[]> {
  let all: SpotifyRecord[] = [];
  for (const file of files) {
    all = all.concat(JSON.parse(await file.text()) as SpotifyRecord[]);
  }
  return parseSpotifyJsonContent(all);
}
