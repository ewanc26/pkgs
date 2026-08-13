import { json } from "@sveltejs/kit";
import { dzSearchTrackPreview } from "$lib/server/enrich";
import type { RequestHandler } from "./$types";

const MAX_LEN = 256;

export const GET: RequestHandler = async ({ url }) => {
  const track = url.searchParams.get("track")?.trim() ?? "";
  const artist = url.searchParams.get("artist")?.trim() ?? "";

  if (!track || !artist || track.length > MAX_LEN || artist.length > MAX_LEN) {
    return json({ error: "Missing or invalid track/artist query params." }, { status: 400 });
  }

  try {
    const previewUrl = await dzSearchTrackPreview(track, artist);
    return json({ previewUrl });
  } catch (e) {
    console.error("[tourmaline] track-preview lookup failed:", e);
    return json({ error: "Preview lookup failed." }, { status: 502 });
  }
};
