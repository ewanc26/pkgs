/**
 * Apple Music CSV — web layer.
 * Re-exports the shared core logic and adds a browser File API loader.
 */
import type { AppleMusicRecord, PlayRecord } from '@ewanc26/croft-click-core';
import {
  parseAppleMusicCsvContent,
  convertAppleMusicToPlayRecord,
  parseDailyTracksArtistMap,
} from '@ewanc26/croft-click-core';
import { CLIENT_AGENT } from '../config.js';

export { parseAppleMusicCsvContent, convertAppleMusicToPlayRecord, parseDailyTracksArtistMap };

/**
 * Convert rows, dropping any whose artist couldn't be resolved.
 *
 * Returns the skipped count so the caller can say why the import is smaller
 * than the file — current Apple exports carry no artist column, so without the
 * daily-tracks companion file this can be most of them.
 */
export function convertAppleMusicRecords(
  records: AppleMusicRecord[],
  artistLookup?: Map<string, string>
): { records: PlayRecord[]; skipped: number } {
  const converted = records.map((r) => convertAppleMusicToPlayRecord(r, CLIENT_AGENT, artistLookup));
  const kept = converted.filter((r): r is PlayRecord => r !== null);
  return { records: kept, skipped: converted.length - kept.length };
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
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  
  // Apple Music CSV usually uses comma
  const raw = parseCSV(text, ',');
  return parseAppleMusicCsvContent(raw as unknown as AppleMusicRecord[]);
}

/**
 * Read `Apple Music - Play History Daily Tracks.csv` and build the title → artist
 * lookup that current Play Activity exports need.
 */
export async function parseAppleMusicDailyTracksFile(file: File): Promise<Map<string, string>> {
  let text = await file.text();
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  return parseDailyTracksArtistMap(parseCSV(text, ','));
}

/**
 * Sort the uploaded Apple CSVs into the play-activity file and the optional
 * daily-tracks companion.
 *
 * Identified by columns rather than filename: people rename downloads, and
 * localised exports don't necessarily keep the English names.
 */
export async function splitAppleMusicFiles(
  files: File[]
): Promise<{ playActivity?: File; dailyTracks?: File }> {
  const out: { playActivity?: File; dailyTracks?: File } = {};

  for (const file of files) {
    // Only the header is needed to tell them apart, and these files can be
    // tens of MB — read a slice rather than the whole thing.
    let head = await file.slice(0, 64 * 1024).text();
    if (head.charCodeAt(0) === 0xfeff) head = head.slice(1);
    const header = head.split(/\r?\n/, 1)[0] ?? '';

    if (/"?Track Description"?/.test(header)) {
      out.dailyTracks ??= file;
    } else if (/"?(Song|Content) Name"?/.test(header)) {
      out.playActivity ??= file;
    }
  }

  // Nothing recognisable: fall back to the first file so the schema error from
  // the parser explains the problem, rather than a vague "no file" here.
  out.playActivity ??= files.find((f) => f !== out.dailyTracks);
  return out;
}
