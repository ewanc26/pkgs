import { defineEnvVars } from '@sveltejs/kit/env';

// Read by `getConfigFromEnv()`. All are optional here; the library reports a
// missing DID itself.
export const variables = defineEnvVars({
	PUBLIC_ATPROTO_DID: { public: true, schema: (value) => value },
	PUBLIC_ATPROTO_PDS: { public: true, schema: (value) => value },
	PUBLIC_CACHE_TTL: { public: true, schema: (value) => value }
});
