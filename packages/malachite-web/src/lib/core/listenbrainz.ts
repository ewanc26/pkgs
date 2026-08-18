/**
 * ListenBrainz export — web layer.
 * Re-exports the shared core logic and adds a browser File API loader.
 */
import type { ListenBrainzRecord } from '@ewanc26/croft-click-core';
import {
  parseListenBrainzJsonContent,
  parseListenBrainzArchive,
  convertListenBrainzToPlayRecord,
} from '@ewanc26/croft-click-core';

export { parseListenBrainzJsonContent, convertListenBrainzToPlayRecord };

/** File extensions the ListenBrainz drop zone accepts. */
export const LISTENBRAINZ_ACCEPT = '.zip,.json,.jsonl';

function isArchive(file: File): boolean {
  return file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip';
}

/** Read a single browser File and parse it as a ListenBrainz export. */
export async function parseListenBrainzFile(file: File): Promise<ListenBrainzRecord[]> {
  if (isArchive(file)) {
    return parseListenBrainzArchive(new Uint8Array(await file.arrayBuffer()));
  }
  return parseListenBrainzJsonContent(await file.text());
}

/**
 * Read every selected file as one history.
 *
 * A ListenBrainz export is a .zip containing `listens/<year>/<month>.jsonl`,
 * so users arrive with either the archive itself or a pile of per-month files —
 * both must work, and reading only the first file would silently drop most of
 * someone's listening history.
 */
export async function parseListenBrainzFiles(files: File[]): Promise<ListenBrainzRecord[]> {
  // Sort by name so per-month files land in chronological order.
  const ordered = [...files].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));

  const records: ListenBrainzRecord[] = [];
  for (const file of ordered) {
    records.push(...(await parseListenBrainzFile(file)));
  }
  return records;
}
