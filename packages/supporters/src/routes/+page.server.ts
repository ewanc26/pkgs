import { readStore } from '$lib/store.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	return { supporters: await readStore() };
};
