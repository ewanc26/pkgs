export interface ActorResult {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export async function searchActors(query: string): Promise<ActorResult[]> {
  if (query.length < 2) return [];
  try {
    const res = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(query)}&limit=8`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.actors ?? [];
  } catch {
    return [];
  }
}
