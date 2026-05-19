import { json } from "@sveltejs/kit";
import { enrichArtistBatch } from "$lib/server/enrich";
import type { ArtistInfo } from "$lib/types";
import type { RequestHandler } from "./$types";

interface EnrichRequestBody {
  queue: string[];
  enrichment?: Record<string, ArtistInfo>;
}

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
    const message = e instanceof Error ? e.message : "Enrichment failed";
    return json({ error: message }, { status: 500 });
  }
};
