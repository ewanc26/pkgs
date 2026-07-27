import { describe, expect, it, vi } from "vitest";
import { listRepositories } from "./toolkit-usage";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function did(n: number): string {
  return `did:plc:${n.toString().padStart(24, "a")}`;
}

describe("listRepositories", () => {
  it("is not partial when the directory has fewer repos than the cap", async () => {
    const repos = Array.from({ length: 10 }, (_, i) => ({ did: did(i) }));
    const fetcher = vi.fn(async () => jsonResponse({ repos }));

    const result = await listRepositories(fetcher as unknown as typeof fetch);

    expect(result.dids).toHaveLength(10);
    expect(result.partial).toBe(false);
  });

  it("is partial when the cap is hit mid-page, even on the final page", async () => {
    // 250 repos returned as one final page (no cursor), but MAX_REPOSITORIES
    // is 250 — the fixture below crosses the cap with unprocessed repos left
    // in the same page.
    const repos = Array.from({ length: 260 }, (_, i) => ({ did: did(i) }));
    const fetcher = vi.fn(async () => jsonResponse({ repos }));

    const result = await listRepositories(fetcher as unknown as typeof fetch);

    expect(result.dids).toHaveLength(250);
    expect(result.partial).toBe(true);
  });

  it("is partial when the cap is hit exactly at the end of a page but a cursor remains", async () => {
    const repos = Array.from({ length: 250 }, (_, i) => ({ did: did(i) }));
    const fetcher = vi.fn(async () =>
      jsonResponse({ repos, cursor: "more" }),
    );

    const result = await listRepositories(fetcher as unknown as typeof fetch);

    expect(result.dids).toHaveLength(250);
    expect(result.partial).toBe(true);
  });

  it("is not partial when the cap is hit exactly at the end of the final page", async () => {
    const repos = Array.from({ length: 250 }, (_, i) => ({ did: did(i) }));
    const fetcher = vi.fn(async () => jsonResponse({ repos }));

    const result = await listRepositories(fetcher as unknown as typeof fetch);

    expect(result.dids).toHaveLength(250);
    expect(result.partial).toBe(false);
  });
});
