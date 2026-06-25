/**
 * Apple Music CSV — web layer.
 * Re-exports the shared core logic and adds a browser File API loader.
 */
import type { AppleMusicRecord } from '@ewanc26/croft-click-core';
import { parseAppleMusicCsvContent, convertAppleMusicToPlayRecord } from '@ewanc26/croft-click-core';

export { parseAppleMusicCsvContent, convertAppleMusicToPlayRecord };

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
