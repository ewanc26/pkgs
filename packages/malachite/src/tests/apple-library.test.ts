import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseAppleLibraryContent,
  backfillAppleRecords,
} from "../lib/apple-library.js";
import { convertAppleMusicRecords } from "../lib/apple-music.js";
import type { AppleMusicRecord } from "@ewanc26/croft-click-core";

const LIBRARY = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Major Version</key><integer>1</integer>
  <key>Tracks</key>
  <dict>
    <key>101</key>
    <dict>
      <key>Track ID</key><integer>101</integer>
      <key>Name</key><string>Mer &amp; Sky</string>
      <key>Artist</key><string>Kōhei</string>
      <key>Album</key><string>Blue</string>
      <key>Total Time</key><integer>201500</integer>
      <key>Compilation</key><true/>
    </dict>
    <key>102</key>
    <dict>
      <key>Name</key><string>Untimed</string>
      <key>Artist</key><string>Kōhei</string>
    </dict>
    <key>103</key>
    <dict>
      <key>Name</key><string>Shared Title</string>
      <key>Artist</key><string>Band A</string>
      <key>Total Time</key><integer>180000</integer>
    </dict>
    <key>104</key>
    <dict>
      <key>Name</key><string>Shared Title</string>
      <key>Artist</key><string>Band B</string>
      <key>Total Time</key><integer>240000</integer>
    </dict>
  </dict>
</dict>
</plist>`;

const row = (over: Partial<AppleMusicRecord>): AppleMusicRecord => ({
  "Content Name": "Song",
  "Event End Timestamp": "2024-03-01 10:00:00",
  ...over,
});

describe("parseAppleLibraryContent", () => {
  it("reads tracks with name, artist, album and length, decoding entities", () => {
    const tracks = parseAppleLibraryContent(LIBRARY);
    const first = tracks.find((t) => t.name === "Mer & Sky");
    assert.deepEqual(first, {
      name: "Mer & Sky",
      artist: "Kōhei",
      album: "Blue",
      durationMs: 201500,
    });
  });

  it("leaves durationMs undefined when Total Time is absent", () => {
    const untimed = parseAppleLibraryContent(LIBRARY).find(
      (t) => t.name === "Untimed",
    );
    assert.ok(untimed);
    assert.equal(untimed.durationMs, undefined);
  });

  it("returns nothing for a document without a Tracks dict", () => {
    assert.deepEqual(
      parseAppleLibraryContent(
        "<plist><dict><key>Other</key><string>x</string></dict></plist>",
      ),
      [],
    );
  });
});

describe("backfillAppleRecords", () => {
  const tracks = parseAppleLibraryContent(LIBRARY);

  it("fills a missing duration, album and artist from the single matching track", () => {
    const rows = [
      row({ "Content Name": "Mer & Sky", "Artist Name": undefined }),
    ];
    const { records, filled } = backfillAppleRecords(rows, tracks);
    assert.equal(filled, 1);
    assert.equal(records[0]["Media Duration In Milliseconds"], "201500");
    assert.equal(records[0]["Album Name"], "Blue");
    assert.equal(records[0]["Artist Name"], "Kōhei");
  });

  it("keeps a duration the export already has", () => {
    const rows = [
      row({
        "Content Name": "Mer & Sky",
        "Media Duration In Milliseconds": "150000",
        "Artist Name": "Kōhei",
      }),
    ];
    const { records } = backfillAppleRecords(rows, tracks);
    assert.equal(records[0]["Media Duration In Milliseconds"], "150000");
    assert.equal(records[0]["Album Name"], "Blue");
  });

  it("skips ambiguous titles when no artist disambiguates them", () => {
    const rows = [row({ "Content Name": "Shared Title" })];
    const { records, filled } = backfillAppleRecords(rows, tracks);
    assert.equal(filled, 0);
    assert.equal(records[0]["Media Duration In Milliseconds"], undefined);
  });

  it("uses the artist on the row to pick between same-titled tracks", () => {
    const rows = [
      row({ "Content Name": "Shared Title", "Artist Name": "Band B" }),
    ];
    const { records } = backfillAppleRecords(rows, tracks);
    assert.equal(records[0]["Media Duration In Milliseconds"], "240000");
  });

  it("does not mutate the input rows", () => {
    const input = [row({ "Content Name": "Mer & Sky" })];
    backfillAppleRecords(input, tracks);
    assert.equal(input[0]["Media Duration In Milliseconds"], undefined);
  });

  it("feeds the backfilled length through to the published play record", () => {
    const rows = [row({ "Content Name": "Mer & Sky", "Artist Name": "Kōhei" })];
    const { records } = backfillAppleRecords(rows, tracks);
    const [play] = convertAppleMusicRecords(records);
    assert.equal(play.duration, 202);
    assert.equal(play.releaseName, "Blue");
  });
});
