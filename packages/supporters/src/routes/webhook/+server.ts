import { json } from '@sveltejs/kit';
import { parseWebhook, WebhookError } from '$lib/webhook.js';
import { appendEvent } from '$lib/store.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
	let payload;
	try {
		payload = await parseWebhook(request);
	} catch (err) {
		if (err instanceof WebhookError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw err;
	}

	// Respect the supporter's privacy preference.
	if (!payload.is_public) {
		return new Response(null, { status: 200 });
	}

	await appendEvent(
		payload.from_name,
		payload.type,
		payload.tier_name,
		payload.timestamp
	);

	// Ko-fi retries if it doesn't receive 200.
	return new Response(null, { status: 200 });
};
