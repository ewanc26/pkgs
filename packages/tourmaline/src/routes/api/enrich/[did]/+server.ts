import { json } from "@sveltejs/kit";
import { enrichArtistBatch } from "$lib/server/enrich";
import type { ArtistInfo } from "$lib/types";
import type { RequestHandler } from "./$types";

interface EnrichRequestBody {
  queue: string[];
  enrichment?: Record<string, ArtistInfo>;
}

/** Upper bounds so a caller cannot use this route as an unbounded API proxy. */
const MAX_QUEUE = 5000;
const MAX_ENRICHMENT = 20000;
const MAX_ARTIST_NAME = 256;

export const POST: RequestHandler = async ({ request }) => {
  let body: EnrichRequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.queue || !Array.isArray(body.queue)) {
    return json({ error: "Missing queue array." }, { status: 400 });
  }

  if (body.queue.length > MAX_QUEUE) {
    return json(
      { error: `queue must contain at most ${MAX_QUEUE} artists.` },
      { status: 400 },
    );
  }

  if (
    body.enrichment !== undefined &&
    (typeof body.enrichment !== "object" ||
      body.enrichment === null ||
      Array.isArray(body.enrichment) ||
      Object.keys(body.enrichment).length > MAX_ENRICHMENT)
  ) {
    return json({ error: "Invalid enrichment map." }, { status: 400 });
  }

  // Queue entries reach third-party APIs — only non-empty, bounded strings.
  body.queue = body.queue.filter(
    (name): name is string =>
      typeof name === "string" &&
      name.trim().length > 0 &&
      name.length <= MAX_ARTIST_NAME,
  );

  // Nothing left to enrich
  if (body.queue.length === 0) {
    const total = Object.keys(body.enrichment ?? {}).length;
    return json({
      current: total,
      total,
      done: true,
      enrichment: body.enrichment ?? {},
      remaining: [],
    });
  }

  // Build existing enrichment map
  const existingEnrichment = new Map<string, ArtistInfo>();
  if (body.enrichment) {
    for (const [name, info] of Object.entries(body.enrichment)) {
      existingEnrichment.set(name, info);
    }
  }

  // Enrich a batch
  try {
    const result = await enrichArtistBatch(body.queue, existingEnrichment, 5);

    // Build updated enrichment and remaining queue
    const enrichment: Record<string, ArtistInfo> = {
      ...(body.enrichment ?? {}),
    };
    for (const { name, info } of result.enriched) {
      enrichment[name] = info;
    }

    const current = Object.keys(enrichment).length;
    const total = current + result.remaining.length;

    return json({
      current,
      total,
      done: result.remaining.length === 0,
      enrichment,
      remaining: result.remaining,
    });
  } catch (e) {
    // Upstream failures may carry API detail (including the Last.fm key in a
    // request URL); log server-side and return a generic message.
    console.error("[tourmaline] enrichment failed:", e);
    return json({ error: "Enrichment failed." }, { status: 502 });
  }
};
