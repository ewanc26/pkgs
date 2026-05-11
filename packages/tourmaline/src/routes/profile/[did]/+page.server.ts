import { resolveIdentifier, fetchBlueskyProfile } from '$lib/server/resolve';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const identifier = decodeURIComponent(params.did);

	try {
		const identity = await resolveIdentifier(identifier);
		const bskyProfile = await fetchBlueskyProfile(identity.pdsUrl, identity.did);

		return {
			did: identity.did,
			handle: identity.handle,
			pdsUrl: identity.pdsUrl,
			displayName: bskyProfile.displayName,
			avatar: bskyProfile.avatar
		};
	} catch (e) {
		return {
			did: '',
			handle: undefined,
			pdsUrl: undefined,
			displayName: undefined,
			avatar: undefined,
			error: e instanceof Error ? e.message : 'Failed to resolve identifier'
		};
	}
};
