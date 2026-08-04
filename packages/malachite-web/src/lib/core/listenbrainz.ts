/**
 * ListenBrainz JSON — web layer.
 * Re-exports the shared core logic and adds a browser File API loader.
 */
import type { ListenBrainzRecord } from '@ewanc26/croft-click-core';
import { parseListenBrainzJsonContent, convertListenBrainzToPlayRecord } from '@ewanc26/croft-click-core';

export { parseListenBrainzJsonContent, convertListenBrainzToPlayRecord };

/** Read a browser File object and parse it as a ListenBrainz export. */
export async function parseListenBrainzFile(file: File): Promise<ListenBrainzRecord[]> {
  const text = await file.text();
  return parseListenBrainzJsonContent(text);
}
