import { json } from '@sveltejs/kit';
import { resolveIdentifier, fetchBlueskyProfile } from '$lib/server/resolve';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const identifier = decodeURIComponent(params.identifier);

	try {
		const identity = await resolveIdentifier(identifier);
		const bskyProfile = await fetchBlueskyProfile(identity.pdsUrl, identity.did);

		return json({
			did: identity.did,
			handle: identity.handle,
			pdsUrl: identity.pdsUrl,
			displayName: bskyProfile.displayName,
			avatar: bskyProfile.avatar
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to resolve identifier';
		return json({ error: message }, { status: 400 });
	}
};
