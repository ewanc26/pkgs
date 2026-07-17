import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import {
  aggregateToolkitUsage,
  parseToolkitRecord,
  TOOLKIT_COLLECTION,
  type AuthoredToolkitRecord,
  type ToolkitUsageSummary,
} from "$lib/toolkit-usage";

const RELAYS = [
  "https://relay1.us-east.bsky.network",
  "https://relay1.us-west.bsky.network",
] as const;
const SLINGSHOT = "https://slingshot.microcosm.blue";
const MAX_REPOSITORIES = 250;
const MAX_RECORD_PAGES = 10;
const CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 8_000;

interface CollectionDirectoryPage {
  repos?: Array<{ did?: string }>;
  cursor?: string;
}

interface MiniDoc {
  did?: string;
  pds?: string;
}

interface RecordPage {
  records?: Array<{ value?: unknown }>;
  cursor?: string;
}

function isDid(value: unknown): value is string {
  return (
    typeof value === "string" && /^did:[a-z0-9]+:[A-Za-z0-9._:%-]+/.test(value)
  );
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0
  );
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

async function assertPublicHttpsEndpoint(value: string): Promise<URL> {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("PDS endpoint must be a credential-free HTTPS origin");
  }
  if (url.pathname !== "/" || url.search || url.hash)
    throw new Error("PDS endpoint must be an origin");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) {
    throw new Error("PDS endpoint is not public");
  }

  const literalKind = isIP(url.hostname);
  if (literalKind && isPrivateAddress(url.hostname))
    throw new Error("PDS endpoint is not public");
  if (!literalKind) {
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (
      !addresses.length ||
      addresses.some(({ address }) => isPrivateAddress(address))
    ) {
      throw new Error("PDS endpoint did not resolve to public addresses");
    }
  }

  return url;
}

async function fetchJson<T>(fetcher: typeof fetch, url: URL): Promise<T> {
  const response = await fetcher(url, {
    headers: { accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  return response.json() as Promise<T>;
}

async function listRepositories(
  fetcher: typeof fetch,
): Promise<{ dids: string[]; partial: boolean }> {
  let lastError: unknown;
  for (const relay of RELAYS) {
    try {
      const dids: string[] = [];
      const seenCursors = new Set<string>();
      let cursor: string | undefined;
      let partial = false;

      do {
        const url = new URL(
          "/xrpc/com.atproto.sync.listReposByCollection",
          relay,
        );
        url.searchParams.set("collection", TOOLKIT_COLLECTION);
        url.searchParams.set("limit", "500");
        if (cursor) url.searchParams.set("cursor", cursor);
        const page = await fetchJson<CollectionDirectoryPage>(fetcher, url);
        for (const repo of page.repos ?? []) {
          if (isDid(repo.did) && !dids.includes(repo.did)) dids.push(repo.did);
          if (dids.length >= MAX_REPOSITORIES) {
            partial =
              Boolean(page.cursor) || (page.repos?.length ?? 0) > dids.length;
            return { dids, partial };
          }
        }
        cursor = page.cursor;
        if (cursor && seenCursors.has(cursor))
          throw new Error("Relay repeated a pagination cursor");
        if (cursor) seenCursors.add(cursor);
      } while (cursor);

      return { dids, partial };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Collection directory unavailable");
}

async function listRepositoryRecords(
  fetcher: typeof fetch,
  did: string,
): Promise<AuthoredToolkitRecord[]> {
  const identityUrl = new URL(
    "/xrpc/blue.microcosm.identity.resolveMiniDoc",
    SLINGSHOT,
  );
  identityUrl.searchParams.set("identifier", did);
  const miniDoc = await fetchJson<MiniDoc>(fetcher, identityUrl);
  if (miniDoc.did !== did || typeof miniDoc.pds !== "string")
    throw new Error("Identity resolution mismatch");
  const pds = await assertPublicHttpsEndpoint(miniDoc.pds);

  const records: AuthoredToolkitRecord[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  for (let pageIndex = 0; pageIndex < MAX_RECORD_PAGES; pageIndex++) {
    const url = new URL("/xrpc/com.atproto.repo.listRecords", pds);
    url.searchParams.set("repo", did);
    url.searchParams.set("collection", TOOLKIT_COLLECTION);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const page = await fetchJson<RecordPage>(fetcher, url);

    for (const item of page.records ?? []) {
      const value = parseToolkitRecord(item.value);
      if (value) records.push({ did, value });
    }

    cursor = page.cursor;
    if (!cursor) break;
    if (seenCursors.has(cursor))
      throw new Error("PDS repeated a pagination cursor");
    seenCursors.add(cursor);
  }

  return records;
}

async function mapConcurrent<T, R>(
  values: T[],
  limit: number,
  mapper: (value: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(values.length);
  let index = 0;

  async function worker() {
    while (index < values.length) {
      const current = index++;
      try {
        results[current] = {
          status: "fulfilled",
          value: await mapper(values[current]),
        };
      } catch (reason) {
        results[current] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker()),
  );
  return results;
}

export async function loadGlobalToolkitUsage(
  fetcher: typeof fetch = fetch,
): Promise<ToolkitUsageSummary> {
  const directory = await listRepositories(fetcher);
  const results = await mapConcurrent(directory.dids, CONCURRENCY, (did) =>
    listRepositoryRecords(fetcher, did),
  );
  const records = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const failures = results.filter(
    (result) => result.status === "rejected",
  ).length;

  return aggregateToolkitUsage(
    records,
    directory.dids.length - failures,
    directory.partial || failures > 0,
  );
}
