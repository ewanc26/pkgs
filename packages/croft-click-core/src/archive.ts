/**
 * ZIP extraction — environment-agnostic.
 *
 * ListenBrainz (and increasingly other services) hand out a .zip rather than a
 * single file, so the import flows need to look inside one without caring
 * whether they are running in Node or the browser. fflate has no platform
 * dependencies, which keeps this module usable from both.
 */

import { unzipSync } from 'fflate';

export interface ArchiveEntry {
  /** Path of the entry within the archive, e.g. `listens/2026/1.jsonl`. */
  name: string;
  /** Decoded UTF-8 contents. */
  text: string;
}

/** ZIP local-file-header magic — "PK\x03\x04". */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

/**
 * Detect a ZIP archive from its leading bytes, so callers can accept a file
 * whose name has been changed or whose type the browser did not report.
 */
export function isZipArchive(bytes: Uint8Array): boolean {
  return ZIP_MAGIC.every((b, i) => bytes[i] === b);
}

/**
 * Extract the text entries of a ZIP archive.
 *
 * @param include Optional predicate on the entry path. Entries it rejects are
 *                never decompressed, which matters for exports that ship large
 *                files we have no use for.
 */
export function extractTextEntries(
  bytes: Uint8Array,
  include?: (name: string) => boolean,
): ArchiveEntry[] {
  const files = unzipSync(bytes, {
    filter: (file) =>
      // Directory entries carry a trailing slash and no content.
      !file.name.endsWith('/') && (!include || include(file.name)),
  });

  const decoder = new TextDecoder();
  const entries: ArchiveEntry[] = [];
  for (const [name, content] of Object.entries(files)) {
    if (content.length === 0) continue;
    entries.push({ name, text: decoder.decode(content) });
  }

  // Archives enumerate in central-directory order; sort so a per-year/per-month
  // export is processed chronologically and progress reporting reads sensibly.
  entries.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
  return entries;
}
