import { createClient } from '$lib/index.js';
import { getConfigFromEnv } from '$lib/config/env.js';
import { extractRkey } from '$lib/utils/document.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const config = getConfigFromEnv();

	if (!config) {
		throw error(500, 'Missing configuration. Please set PUBLIC_ATPROTO_DID in your .env file.');
	}

	const client = createClient(config);
	const { pub_rkey, doc_rkey } = params;

	try {
		// 1. Fetch the specific document by its rkey
		// Assuming client.fetchDocument exists; if not, use fetchAllDocuments and find
		const documents = await client.fetchAllDocuments(fetch);

		const document = documents.find((doc) => {
			const rkey = extractRkey(doc.uri);
			const parentPubRkey = extractRkey(doc.value.site);
			// Validate both the document rkey AND that it belongs to the publication in the URL
			return rkey === doc_rkey && parentPubRkey === pub_rkey;
		});

		if (!document) {
			throw error(404, 'Document not found under this publication');
		}

		// 2. Fetch the publication metadata
		const publication = await client.fetchPublication(pub_rkey, fetch);

		if (!publication) {
			throw error(404, 'Publication not found');
		}

		// 3. Return sanitized data to prevent "non-POJO" serialization errors
		return {
			document: JSON.parse(JSON.stringify(document)),
			publication: JSON.parse(JSON.stringify(publication)),
			config
		};
	} catch (err) {
		console.error('Failed to load document:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to load document');
	}
};
