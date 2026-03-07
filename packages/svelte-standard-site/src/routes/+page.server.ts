import { createClient } from '$lib/index.js';
import { getConfigFromEnv } from '$lib/config/env.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => {
	const config = getConfigFromEnv();

	if (!config) {
		return {
			error: 'Missing configuration. Please set PUBLIC_ATPROTO_DID in your .env file.',
			publications: [],
			documents: []
		};
	}

	const client = createClient(config);

	try {
		const [publications, documents] = await Promise.all([
			client.fetchAllPublications(fetch),
			client.fetchAllDocuments(fetch)
		]);

		const pds = await client.getPDS(fetch);

		return {
			config,
			publications: JSON.parse(JSON.stringify(publications)),
			documents: JSON.parse(JSON.stringify(documents)),
			pds
		};
	} catch (error) {
		console.error('Failed to load data:', error);
		return {
			error: error instanceof Error ? error.message : 'Failed to load data',
			publications: [],
			documents: []
		};
	}
};
