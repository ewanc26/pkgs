/**
 * YouTube Music JSON — web layer.
 * Re-exports the shared core logic and adds a browser File API loader.
 */
import type { YouTubeMusicRecord } from '@ewanc26/croft-click-core';
import { parseYouTubeMusicJsonContent, convertYouTubeMusicToPlayRecord } from '@ewanc26/croft-click-core';

export { parseYouTubeMusicJsonContent, convertYouTubeMusicToPlayRecord };

/** Read one or more browser File objects and parse them as YouTube Music JSON exports. */
export async function parseYouTubeMusicFiles(files: File[]): Promise<YouTubeMusicRecord[]> {
  let all: YouTubeMusicRecord[] = [];
  for (const file of files) {
    try {
      const records = JSON.parse(await file.text()) as YouTubeMusicRecord[];
      all = all.concat(records);
    } catch (err) {
      console.warn('Could not parse file as YouTube Music JSON:', file.name);
    }
  }
  return parseYouTubeMusicJsonContent(all);
}
