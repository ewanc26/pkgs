/**
 * Validates and parses an incoming GitHub Sponsors webhook request.
 *
 * GitHub signs the JSON body with HMAC-SHA256 and sends it in the
 * X-Hub-Signature-256 header as `sha256=<hex>`. We verify the signature
 * before parsing the payload.
 *
 * Required environment variable:
 *   GITHUB_WEBHOOK_SECRET — the secret set in your GitHub Sponsors webhook config
 *
 * @see https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
 */

import type { GitHubSponsorshipWebhookPayload } from './github-types.js';

export class GitHubWebhookError extends Error {
	constructor(
		message: string,
		public readonly status: number
	) {
		super(message);
	}
}

export interface ParseGitHubWebhookOptions {
	/** Override GITHUB_WEBHOOK_SECRET from process.env */
	secret?: string;
}

/** Constant-time hex comparison to prevent timing attacks. */
async function verifySignature(secret: string, body: string, signature: string): Promise<boolean> {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const mac = await crypto.subtle.sign('HMAC', key, enc.encode(body));
	const expected = 'sha256=' + Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');

	if (expected.length !== signature.length) return false;
	// Constant-time comparison
	let mismatch = 0;
	for (let i = 0; i < expected.length; i++) {
		mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
	}
	return mismatch === 0;
}

export async function parseGitHubSponsorsWebhook(
	request: Request,
	options?: ParseGitHubWebhookOptions
): Promise<GitHubSponsorshipWebhookPayload> {
	const secret = options?.secret ?? process.env.GITHUB_WEBHOOK_SECRET;
	if (!secret) throw new GitHubWebhookError('GITHUB_WEBHOOK_SECRET is not set', 500);

	const event = request.headers.get('x-github-event');
	if (event !== 'sponsorship') {
		throw new GitHubWebhookError(`Unexpected event type: ${event}`, 400);
	}

	const signature = request.headers.get('x-hub-signature-256');
	if (!signature) throw new GitHubWebhookError('Missing X-Hub-Signature-256 header', 400);

	const body = await request.text();

	const valid = await verifySignature(secret, body, signature);
	if (!valid) throw new GitHubWebhookError('Signature verification failed', 401);

	let payload: GitHubSponsorshipWebhookPayload;
	try {
		payload = JSON.parse(body);
	} catch {
		throw new GitHubWebhookError('Invalid JSON body', 400);
	}

	return payload;
}
