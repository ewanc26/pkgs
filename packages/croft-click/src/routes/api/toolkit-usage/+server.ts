import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { loadGlobalToolkitUsage } from "$lib/server/toolkit-usage";

export const GET: RequestHandler = async ({ setHeaders }) => {
  try {
    const summary = await loadGlobalToolkitUsage();
    setHeaders({
      "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
    });
    return json(summary);
  } catch {
    return json(
      { error: "Toolkit usage is temporarily unavailable" },
      { status: 502 },
    );
  }
};
