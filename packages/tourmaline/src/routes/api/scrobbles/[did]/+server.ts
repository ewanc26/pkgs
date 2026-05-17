import { json } from "@sveltejs/kit";
import { fetchScrobbleBatch } from "$lib/server/scrobbles";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, url }) => {
  const did = decodeURIComponent(params.did);
  const pdsUrl = url.searchParams.get("pdsUrl");
  const cursor = url.searchParams.get("cursor");

  if (!pdsUrl) {
    return json({ error: "Missing pdsUrl query param." }, { status: 400 });
  }

  try {
    const result = await fetchScrobbleBatch(pdsUrl, did, cursor || null);

    return json({
      scrobbles: result.scrobbles,
      cursor: result.cursor,
      done: result.done,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch scrobbles";
    return json({ error: message }, { status: 500 });
  }
};
