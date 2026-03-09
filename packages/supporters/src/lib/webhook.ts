/**
 * Validates and parses an incoming Ko-fi webhook request.
 *
 * Ko-fi sends application/x-www-form-urlencoded with a single `data` field
 * containing the payment JSON. We verify the embedded verification_token
 * matches the secret set in KOFI_VERIFICATION_TOKEN.
 *
 * @see https://ko-fi.com/manage/webhooks  (Advanced → Verification Token)
 */

import type { KofiWebhookPayload } from './types.js';

export class WebhookError extends Error {
	constructor(
		message: string,
		public readonly status: number
	) {
		super(message);
	}
}

export async function parseWebhook(request: Request): Promise<KofiWebhookPayload> {
	const secret = process.env.KOFI_VERIFICATION_TOKEN;
	if (!secret) throw new WebhookError('KOFI_VERIFICATION_TOKEN is not set', 500);
	const testToken = process.env.KOFI_TEST_TOKEN;

	const contentType = request.headers.get('content-type') ?? '';
	if (!contentType.includes('application/x-www-form-urlencoded')) {
		throw new WebhookError('Unexpected content-type', 400);
	}

	const body = await request.formData();
	const raw = body.get('data');
	if (!raw || typeof raw !== 'string') throw new WebhookError('Missing data field', 400);

	let payload: KofiWebhookPayload;
	try {
		payload = JSON.parse(raw);
	} catch {
		throw new WebhookError('Invalid JSON in data field', 400);
	}

	if (payload.verification_token !== secret && payload.verification_token !== testToken) {
		throw new WebhookError('Verification token mismatch', 401);
	}

	return payload;
}
