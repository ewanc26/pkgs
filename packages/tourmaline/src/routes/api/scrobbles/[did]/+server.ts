import { json } from "@sveltejs/kit";
import { CARFetchUnauthorizedError } from "@ewanc26/croft-click-core";
import { fetchScrobbleBatch } from "$lib/server/scrobbles";
import { isValidDid, safeEndpoint } from "$lib/server/validate";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, url }) => {
  const did = decodeURIComponent(params.did);

  if (!isValidDid(did)) {
    return json({ error: "Invalid DID." }, { status: 400 });
  }

  // `pdsUrl` is caller-supplied: without this check the endpoint would fetch
  // any URL on the server's behalf (SSRF into the deployment's network).
  const pdsUrl = safeEndpoint(url.searchParams.get("pdsUrl"));
  if (!pdsUrl) {
    return json(
      { error: "Missing or invalid pdsUrl query param." },
      { status: 400 },
    );
  }

  try {
    const result = await fetchScrobbleBatch(pdsUrl, did);

    return json({
      scrobbles: result.scrobbles,
      cursor: result.cursor,
      done: result.done,
    });
  } catch (e) {
    // Rate-limit messages are actionable for the user; everything else may
    // carry upstream detail, so it is logged server-side and generalised here.
    if (e instanceof Error && e.message.startsWith("CAR fetch failed: 429")) {
      return json(
        { error: "Rate limit exceeded. Try again in a minute." },
        { status: 429 },
      );
    }
    if (e instanceof CARFetchUnauthorizedError) {
      return json(
        { error: "This PDS requires authentication to read this repository." },
        { status: 403 },
      );
    }
    console.error("[tourmaline] scrobble fetch failed:", e);
    return json(
      { error: "Failed to fetch scrobbles from the PDS." },
      { status: 502 },
    );
  }
};
