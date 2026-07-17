export const TOOLKIT_COLLECTION = "click.croft.toolkit.use";

export interface ToolRecord {
  $type: string;
  recordsImported?: number;
  postsImported?: number;
  documentsConverted?: number;
  scrobblesAnalyzed?: number;
  sharedToBluesky?: boolean;
  mode?: string;
}

export interface ToolkitRecord {
  tool: ToolRecord;
  createdAt: string;
  context?: string;
}

export interface AuthoredToolkitRecord {
  did: string;
  value: ToolkitRecord;
}

export interface ToolStats {
  type: string;
  slug: string;
  name: string;
  accent: string;
  count: number;
  total: number;
  metricLabel: string;
  modes?: Record<string, number>;
  sharedCount?: number;
}

export interface ToolkitUsageSummary {
  totalRecords: number;
  totalRepositories: number;
  toolStats: ToolStats[];
  partial: boolean;
  updatedAt: string;
}

interface ToolMeta {
  slug: string;
  name: string;
  accent: string;
  metricLabel: string;
}

export const TOOL_META: Record<string, ToolMeta> = {
  "click.croft.tools.malachite": {
    slug: "malachite",
    name: "Malachite",
    accent: "#3fb968",
    metricLabel: "records imported",
  },
  "click.croft.tools.jasper": {
    slug: "jasper",
    name: "Jasper",
    accent: "#fb923c",
    metricLabel: "photos imported",
  },
  "click.croft.tools.bismuth": {
    slug: "bismuth",
    name: "Bismuth",
    accent: "#c4b5fd",
    metricLabel: "docs converted",
  },
  "click.croft.tools.opal": {
    slug: "opal",
    name: "Opal",
    accent: "#a7f3d0",
    metricLabel: "posts imported",
  },
  "click.croft.tools.tourmaline": {
    slug: "tourmaline",
    name: "Tourmaline",
    accent: "#4ade80",
    metricLabel: "scrobbles analysed",
  },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalFiniteNonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

export function parseToolkitRecord(value: unknown): ToolkitRecord | null {
  if (
    !isObject(value) ||
    value.$type !== TOOLKIT_COLLECTION ||
    !isObject(value.tool) ||
    typeof value.createdAt !== "string"
  )
    return null;
  if (Number.isNaN(Date.parse(value.createdAt))) return null;

  const rawTool = value.tool;
  const type = rawTool.$type;
  if (typeof type !== "string" || !TOOL_META[type]) return null;

  const integerFields = [
    "recordsImported",
    "postsImported",
    "documentsConverted",
    "scrobblesAnalyzed",
  ] as const;
  if (
    integerFields.some(
      (field) =>
        field in rawTool &&
        optionalFiniteNonNegativeInteger(rawTool[field]) === undefined,
    ) ||
    ("sharedToBluesky" in rawTool &&
      typeof rawTool.sharedToBluesky !== "boolean") ||
    ("mode" in rawTool &&
      (typeof rawTool.mode !== "string" || rawTool.mode.length > 100)) ||
    ("context" in value &&
      (typeof value.context !== "string" || value.context.length > 3000))
  ) {
    return null;
  }

  const tool: ToolRecord = {
    $type: type,
    recordsImported: optionalFiniteNonNegativeInteger(rawTool.recordsImported),
    postsImported: optionalFiniteNonNegativeInteger(rawTool.postsImported),
    documentsConverted: optionalFiniteNonNegativeInteger(
      rawTool.documentsConverted,
    ),
    scrobblesAnalyzed: optionalFiniteNonNegativeInteger(
      rawTool.scrobblesAnalyzed,
    ),
    sharedToBluesky:
      typeof rawTool.sharedToBluesky === "boolean"
        ? rawTool.sharedToBluesky
        : undefined,
    mode: typeof rawTool.mode === "string" ? rawTool.mode : undefined,
  };

  return {
    tool,
    createdAt: value.createdAt,
    context: typeof value.context === "string" ? value.context : undefined,
  };
}

function metricValue(tool: ToolRecord): number {
  return (
    tool.recordsImported ??
    tool.postsImported ??
    tool.documentsConverted ??
    tool.scrobblesAnalyzed ??
    0
  );
}

function duplicateKey(record: AuthoredToolkitRecord): string {
  const { tool } = record.value;
  return [
    record.did,
    tool.$type,
    metricValue(tool),
    tool.mode ?? "",
    tool.sharedToBluesky === true ? "shared" : "not-shared",
  ].join("\u0000");
}

/**
 * Older Jasper and Tourmaline clients wrote the same usage event in both their
 * core flow and route UI. Collapse identical events by the same DID within two
 * seconds while preserving genuinely separate sessions.
 */
export function deduplicateToolkitRecords(
  records: AuthoredToolkitRecord[],
): AuthoredToolkitRecord[] {
  const sorted = [...records].sort(
    (a, b) => Date.parse(a.value.createdAt) - Date.parse(b.value.createdAt),
  );
  const lastSeen = new Map<string, number>();
  const result: AuthoredToolkitRecord[] = [];

  for (const record of sorted) {
    const timestamp = Date.parse(record.value.createdAt);
    const key = duplicateKey(record);
    const previous = lastSeen.get(key);
    if (previous !== undefined && timestamp - previous <= 2_000) continue;
    lastSeen.set(key, timestamp);
    result.push(record);
  }

  return result;
}

export function aggregateToolkitUsage(
  records: AuthoredToolkitRecord[],
  totalRepositories: number,
  partial = false,
  now = new Date(),
): ToolkitUsageSummary {
  const deduplicated = deduplicateToolkitRecords(records);
  const aggregate = new Map<
    string,
    {
      count: number;
      total: number;
      modes: Record<string, number>;
      shared: number;
    }
  >();

  for (const record of deduplicated) {
    const { tool } = record.value;
    const slot = aggregate.get(tool.$type) ?? {
      count: 0,
      total: 0,
      modes: {},
      shared: 0,
    };
    slot.count++;
    slot.total += metricValue(tool);
    if (tool.mode) slot.modes[tool.mode] = (slot.modes[tool.mode] ?? 0) + 1;
    if (tool.sharedToBluesky) slot.shared++;
    aggregate.set(tool.$type, slot);
  }

  const toolStats = [...aggregate.entries()]
    .map(([type, stats]) => {
      const meta = TOOL_META[type];
      return {
        type,
        ...meta,
        count: stats.count,
        total: stats.total,
        modes: Object.keys(stats.modes).length ? stats.modes : undefined,
        sharedCount: stats.shared > 0 ? stats.shared : undefined,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    totalRecords: deduplicated.length,
    totalRepositories,
    toolStats,
    partial,
    updatedAt: now.toISOString(),
  };
}
