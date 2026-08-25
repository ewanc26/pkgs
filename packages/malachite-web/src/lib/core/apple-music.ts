/**
 * Apple Music CSV — web layer.
 * Re-exports the shared core logic and adds a browser File API loader.
 */
import type { AppleMusicRecord, PlayRecord, AppleCatalogHint } from '@ewanc26/croft-click-core';
import {
  parseAppleMusicCsvContent,
  convertAppleMusicToPlayRecord,
  parseDailyTracksArtistMap,
  appleCatalogHintFromAppleMusicRecord,
  appleCatalogHintKey,
} from '@ewanc26/croft-click-core';
import { CLIENT_AGENT } from '../config.js';

export { parseAppleMusicCsvContent, convertAppleMusicToPlayRecord, parseDailyTracksArtistMap };

/**
 * Convert rows while retaining source-only hints used to validate Apple
 * catalogue matches. The hint map is separate from the ATProto records, so
 * media duration/country never leak into the published lexicon object.
 */
export function convertAppleMusicRecords(
  records: AppleMusicRecord[],
  artistLookup?: Map<string, string>
): { records: PlayRecord[]; withoutArtist: number; hints: Map<string, AppleCatalogHint> } {
  const converted: PlayRecord[] = [];
  const hints = new Map<string, AppleCatalogHint>();

  for (const source of records) {
    const record = convertAppleMusicToPlayRecord(source, CLIENT_AGENT, artistLookup);
    if (!record) continue;
    converted.push(record);
    hints.set(appleCatalogHintKey(record), appleCatalogHintFromAppleMusicRecord(source));
  }

  return {
    records: converted,
    withoutArtist: converted.filter((r) => !r.artists?.length).length,
    hints,
  };
}

/**
 * Minimal CSV parser for browser since we don't have Node's csv-parse/sync.
 * Matches the logic in malachite/src/core/csv.ts for consistency.
 */
function parseCSV(content: string, delimiter: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === delimiter && !inQuote) {
        cells.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  };

  const headers = parseRow(lines[0]);
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => { record[h] = cells[idx] ?? ''; });
    records.push(record);
  }
  return records;
}

/** Read a browser File object and parse it as an Apple Music CSV export. */
export async function parseAppleMusicFile(file: File): Promise<AppleMusicRecord[]> {
  let text = await file.text();
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const raw = parseCSV(text, ',');
  return parseAppleMusicCsvContent(raw as unknown as AppleMusicRecord[]);
}

/** Read the Daily Tracks companion and build its unambiguous title → artist map. */
export async function parseAppleMusicDailyTracksFile(file: File): Promise<Map<string, string>> {
  let text = await file.text();
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  return parseDailyTracksArtistMap(parseCSV(text, ','));
}

/**
 * Sort uploaded Apple CSVs into the play-activity file and optional daily-tracks
 * companion, using columns rather than filenames.
 */
export async function splitAppleMusicFiles(
  files: File[]
): Promise<{ playActivity?: File; dailyTracks?: File }> {
  const out: { playActivity?: File; dailyTracks?: File } = {};

  for (const file of files) {
    let head = await file.slice(0, 64 * 1024).text();
    if (head.charCodeAt(0) === 0xfeff) head = head.slice(1);
    const header = head.split(/\r?\n/, 1)[0] ?? '';

    if (/"?Track Description"?/.test(header)) {
      out.dailyTracks ??= file;
    } else if (/"?(Song|Content) Name"?/.test(header)) {
      out.playActivity ??= file;
    }
  }

  out.playActivity ??= files.find((f) => f !== out.dailyTracks);
  return out;
}
