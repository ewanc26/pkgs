import { describe, expect, it } from "vitest";
import {
  aggregateToolkitUsage,
  deduplicateToolkitRecords,
  parseToolkitRecord,
  type AuthoredToolkitRecord,
} from "./toolkit-usage";

function record(
  did: string,
  type: string,
  createdAt: string,
  metric: Record<string, unknown> = {},
): AuthoredToolkitRecord {
  const value = parseToolkitRecord({
    $type: "click.croft.toolkit.use",
    tool: { $type: type, ...metric },
    createdAt,
  });
  if (!value) throw new Error("Invalid test fixture");
  return { did, value };
}

describe("parseToolkitRecord", () => {
  it("accepts known, bounded toolkit records", () => {
    expect(
      parseToolkitRecord({
        $type: "click.croft.toolkit.use",
        tool: {
          $type: "click.croft.tools.jasper",
          recordsImported: 42,
        },
        createdAt: "2026-07-17T09:00:00.000Z",
      }),
    ).toMatchObject({ tool: { recordsImported: 42 } });
  });

  it("rejects unknown tool types, invalid dates, and negative metrics", () => {
    expect(
      parseToolkitRecord({
        $type: "click.croft.toolkit.use",
        tool: { $type: "click.croft.tools.unknown" },
        createdAt: "2026-07-17T09:00:00.000Z",
      }),
    ).toBeNull();
    expect(
      parseToolkitRecord({
        $type: "click.croft.toolkit.use",
        tool: { $type: "click.croft.tools.jasper" },
        createdAt: "not-a-date",
      }),
    ).toBeNull();
    expect(
      parseToolkitRecord({
        $type: "click.croft.toolkit.use",
        tool: { $type: "click.croft.tools.jasper", recordsImported: -1 },
        createdAt: "2026-07-17T09:00:00.000Z",
      }),
    ).toBeNull();

    expect(
      parseToolkitRecord({
        $type: "click.croft.toolkit.not-use",
        tool: { $type: "click.croft.tools.jasper", recordsImported: 1 },
        createdAt: "2026-07-17T09:00:00.000Z",
      }),
    ).toBeNull();
  });
});

describe("toolkit aggregation", () => {
  const jasperType = "click.croft.tools.jasper";
  const malachiteType = "click.croft.tools.malachite";

  it("collapses historical route/core double writes from the same DID", () => {
    const records = [
      record("did:plc:alice", jasperType, "2026-05-24T17:21:21.418Z", {
        recordsImported: 5,
      }),
      record("did:plc:alice", jasperType, "2026-05-24T17:21:21.643Z", {
        recordsImported: 5,
      }),
    ];
    expect(deduplicateToolkitRecords(records)).toHaveLength(1);
  });

  it("preserves distinct users and sessions more than two seconds apart", () => {
    const records = [
      record("did:plc:alice", jasperType, "2026-05-24T17:21:21.000Z", {
        recordsImported: 5,
      }),
      record("did:plc:bob", jasperType, "2026-05-24T17:21:21.100Z", {
        recordsImported: 5,
      }),
      record("did:plc:alice", jasperType, "2026-05-24T17:21:24.000Z", {
        recordsImported: 5,
      }),
    ];
    expect(deduplicateToolkitRecords(records)).toHaveLength(3);
  });

  it("aggregates network-wide tools, metrics, modes, and repository coverage", () => {
    const summary = aggregateToolkitUsage(
      [
        record("did:plc:alice", jasperType, "2026-05-24T17:21:21.000Z", {
          recordsImported: 5,
        }),
        record("did:plc:bob", malachiteType, "2026-05-25T17:21:21.000Z", {
          recordsImported: 12,
          mode: "lastfm",
        }),
      ],
      2,
      false,
      new Date("2026-07-17T09:00:00.000Z"),
    );

    expect(summary.totalRecords).toBe(2);
    expect(summary.totalRepositories).toBe(2);
    expect(summary.updatedAt).toBe("2026-07-17T09:00:00.000Z");
    expect(summary.toolStats).toEqual([
      expect.objectContaining({ name: "Jasper", count: 1, total: 5 }),
      expect.objectContaining({
        name: "Malachite",
        count: 1,
        total: 12,
        modes: { lastfm: 1 },
      }),
    ]);
  });
});
