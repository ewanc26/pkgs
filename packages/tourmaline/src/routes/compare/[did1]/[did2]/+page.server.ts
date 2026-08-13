import { resolveIdentifier, fetchBlueskyProfile } from "$lib/server/resolve";
import type { PageServerLoad } from "./$types";

interface ResolvedSide {
  did: string;
  handle?: string;
  pdsUrl?: string;
  displayName?: string;
  avatar?: string;
  error?: string;
}

async function resolveSide(identifier: string): Promise<ResolvedSide> {
  try {
    const identity = await resolveIdentifier(identifier);
    const bskyProfile = await fetchBlueskyProfile(identity.pdsUrl, identity.did);

    return {
      did: identity.did,
      handle: identity.handle,
      pdsUrl: identity.pdsUrl,
      displayName: bskyProfile.displayName,
      avatar: bskyProfile.avatar,
    };
  } catch (e) {
    return {
      did: "",
      error: e instanceof Error ? e.message : "Failed to resolve identifier",
    };
  }
}

export const load: PageServerLoad = async ({ params }) => {
  const [a, b] = await Promise.all([
    resolveSide(decodeURIComponent(params.did1)),
    resolveSide(decodeURIComponent(params.did2)),
  ]);

  return { a, b };
};
