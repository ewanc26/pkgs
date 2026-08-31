import { json } from "@sveltejs/kit";
import { CARFetchUnauthorizedError } from "@ewanc26/croft-click-core";
import { streamScrobbleBatch, type ScrobbleStreamEvent } from "$lib/server/scrobbles";
import { isValidDid, safeCursor, safeEndpoint } from "$lib/server/validate";
import type { RequestHandler } from "./$types";

// Large PDS exports can take tens of seconds to index before records begin to
// flow. The response itself is streamed with backpressure and stays bounded.
export const config = { maxDuration: 300 };

type WireEvent = { type: "ready" } | ScrobbleStreamEvent | { type: "error"; error: string };

const encoder = new TextEncoder();

function encodeEvent(event: WireEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

function publicError(error: unknown): string {
  if (error instanceof Error && error.message.startsWith("CAR fetch failed: 429")) {
    return "Rate limit exceeded. Try again in a minute.";
  }
  if (error instanceof CARFetchUnauthorizedError) {
    return "This PDS requires authentication to read this repository.";
  }
  return "Failed to fetch scrobbles from the PDS.";
}

function createResponseStream(events: AsyncGenerator<ScrobbleStreamEvent>): ReadableStream<Uint8Array> {
  let finished = false;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      // Flush response headers immediately while the CAR is downloaded and
      // indexed. This also prevents the platform from treating the result as
      // one buffered JSON payload.
      controller.enqueue(encodeEvent({ type: "ready" }));
    },
    async pull(controller) {
      if (finished) return;

      try {
        const next = await events.next();
        if (next.done) {
          finished = true;
          controller.close();
          return;
        }
        controller.enqueue(encodeEvent(next.value));
      } catch (error) {
        finished = true;
        console.error("[tourmaline] scrobble fetch failed:", error);
        controller.enqueue(encodeEvent({ type: "error", error: publicError(error) }));
        controller.close();
        await events.return(undefined);
      }
    },
    async cancel() {
      finished = true;
      await events.return(undefined);
    },
  });
}

export const GET: RequestHandler = async ({ params, url }) => {
  const did = decodeURIComponent(params.did);

  if (!isValidDid(did)) {
    return json({ error: "Invalid DID." }, { status: 400 });
  }

  // `pdsUrl` is caller-supplied: without this check the endpoint would fetch
  // any URL on the server's behalf (SSRF into the deployment's network).
  const pdsUrl = safeEndpoint(url.searchParams.get("pdsUrl"));
  if (!pdsUrl) {
    return json({ error: "Missing or invalid pdsUrl query param." }, { status: 400 });
  }

  const rawCursor = url.searchParams.get("cursor");
  const cursor = safeCursor(rawCursor);
  if (rawCursor && !cursor) {
    return json({ error: "Invalid cursor." }, { status: 400 });
  }

  return new Response(createResponseStream(streamScrobbleBatch(pdsUrl, did, cursor)), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
