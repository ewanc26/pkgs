/**
 * Apple Music / iTunes `Library.xml` (an XML property list). Optional companion
 * to the Play Activity CSV: many rows lack a track length, and some lost their
 * album or artist. The library knows each track's Total Time, Album and Artist.
 */

import * as fs from "fs";
import type { AppleMusicRecord } from "@ewanc26/croft-click-core";

export interface AppleLibraryTrack {
  name: string;
  artist?: string;
  album?: string;
  durationMs?: number;
}

type PlistDict = { [key: string]: PlistValue };
type PlistValue =
  | string
  | number
  | boolean
  | PlistValue[]
  | PlistDict
  | undefined;

const TOKEN = /<(\/?)([a-zA-Z]+)\s*(\/?)>([^<]*)/g;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decode(text: string): string {
  return text.replace(
    /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g,
    (whole, body: string) => {
      if (body[0] === "#") {
        const code =
          body[1] === "x"
            ? parseInt(body.slice(2), 16)
            : parseInt(body.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      return ENTITIES[body] ?? whole;
    },
  );
}

function parsePlist(xml: string): PlistValue {
  type Frame = { dict?: PlistDict; array?: PlistValue[]; key?: string };
  const stack: Frame[] = [];
  let root: PlistValue;

  const attach = (value: PlistValue) => {
    const top = stack[stack.length - 1];
    if (!top) root = value;
    else if (top.array) top.array.push(value);
    else if (top.dict && top.key !== undefined) {
      top.dict[top.key] = value;
      top.key = undefined;
    }
  };

  for (const match of xml.matchAll(TOKEN)) {
    const [, closing, tag, selfClosing, rawText] = match;
    if (closing) {
      if (tag === "dict" || tag === "array") {
        const frame = stack.pop()!;
        attach(frame.dict ?? frame.array);
      }
      continue;
    }
    const text = decode(rawText);
    switch (tag) {
      case "dict":
        if (selfClosing) attach({});
        else stack.push({ dict: {} });
        break;
      case "array":
        if (selfClosing) attach([]);
        else stack.push({ array: [] });
        break;
      case "key":
        stack[stack.length - 1].key = text;
        break;
      case "string":
      case "date":
      case "data":
        attach(text);
        break;
      case "integer":
      case "real":
        attach(Number(text));
        break;
      case "true":
        attach(true);
        break;
      case "false":
        attach(false);
        break;
    }
  }
  return root;
}

const isDict = (v: PlistValue): v is PlistDict =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const text = (v: PlistValue): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

export function parseAppleLibraryContent(xml: string): AppleLibraryTrack[] {
  const root = parsePlist(xml);
  const tracks = isDict(root) ? root.Tracks : undefined;
  if (!isDict(tracks)) return [];

  const out: AppleLibraryTrack[] = [];
  for (const track of Object.values(tracks)) {
    if (!isDict(track)) continue;
    const name = text(track.Name);
    if (!name) continue;
    const totalTime = track["Total Time"];
    out.push({
      name,
      artist: text(track.Artist),
      album: text(track.Album),
      durationMs:
        typeof totalTime === "number" && totalTime > 0 ? totalTime : undefined,
    });
  }
  return out;
}

export function parseAppleLibraryXml(filePath: string): AppleLibraryTrack[] {
  return parseAppleLibraryContent(fs.readFileSync(filePath, "utf-8"));
}

/** Mirrors croft-click-core's title normalisation so Play Activity titles line up. */
function titleKey(title: string): string {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s*\([^)]*\)$/g, "")
    .replace(/\s*-\s*(single|ep)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

const artistKey = (artist: string) =>
  artist.normalize("NFKC").toLowerCase().trim();

const firstFilled = (
  row: AppleMusicRecord,
  columns: string[],
): string | undefined => {
  for (const column of columns) {
    const value = (row as Record<string, string | undefined>)[column]?.trim();
    if (value) return value;
  }
  return undefined;
};

/**
 * Fill missing duration, album and artist on Play Activity rows from the
 * library. A row is only matched when exactly one library track fits, so a
 * title shared by several tracks never gets another track's length.
 */
export function backfillAppleRecords(
  records: AppleMusicRecord[],
  tracks: AppleLibraryTrack[],
): { records: AppleMusicRecord[]; filled: number } {
  const byTitle = new Map<string, AppleLibraryTrack[]>();
  for (const track of tracks) {
    const key = titleKey(track.name);
    const group = byTitle.get(key);
    if (group) group.push(track);
    else byTitle.set(key, [track]);
  }

  let filled = 0;
  const out = records.map((row) => {
    const title = firstFilled(row, ["Content Name", "Song Name"]);
    if (!title) return row;
    const artist = firstFilled(row, ["Artist Name", "Container Artist Name"]);

    const candidates = byTitle.get(titleKey(title)) ?? [];
    const pool = artist
      ? candidates.filter(
          (c) => !c.artist || artistKey(c.artist) === artistKey(artist),
        )
      : candidates;
    if (pool.length !== 1) return row;
    const match = pool[0];

    const patch: Partial<AppleMusicRecord> = {};
    if (
      !(Number(row["Media Duration In Milliseconds"]) > 0) &&
      match.durationMs
    ) {
      patch["Media Duration In Milliseconds"] = String(match.durationMs);
    }
    if (
      !firstFilled(row, ["Album Name", "Container Album Name"]) &&
      match.album
    ) {
      patch["Album Name"] = match.album;
    }
    if (!artist && match.artist) {
      patch["Artist Name"] = match.artist;
    }
    if (Object.keys(patch).length === 0) return row;

    filled++;
    return { ...row, ...patch };
  });

  return { records: out, filled };
}
