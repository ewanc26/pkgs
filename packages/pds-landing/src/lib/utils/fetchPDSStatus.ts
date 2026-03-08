/**
 * Types and utilities for fetching live status from an ATProto PDS.
 */

export interface PDSHealth {
	reachable: boolean;
	/** Reported software version, or null if unreachable / not exposed. */
	version: string | null;
}

export interface PDSDescription {
	did: string | null;
	inviteCodeRequired: boolean | null;
	phoneVerificationRequired: boolean | null;
	availableUserDomains: string[];
	links: {
		privacyPolicy?: string;
		termsOfService?: string;
	} | null;
	contact: { email?: string } | null;
}

export interface PDSStatusResult {
	health: PDSHealth;
	description: PDSDescription;
	/** Total repo count, or -1 if the fetch failed. */
	accountCount: number;
}

async function fetchJSON(url: string): Promise<unknown> {
	const r = await fetch(url);
	if (!r.ok) throw new Error(`HTTP ${r.status}`);
	return r.json();
}

/**
 * Fetch live status from a PDS.
 *
 * @param baseUrl - Origin to prepend to `/xrpc/…` paths.
 *                  Defaults to `''` (same origin, works in-browser).
 */
export async function fetchPDSStatus(baseUrl = ''): Promise<PDSStatusResult> {
	// ── health ────────────────────────────────────────────────────────────────
	let health: PDSHealth = { reachable: false, version: null };
	try {
		const h = (await fetchJSON(`${baseUrl}/xrpc/_health`)) as { version?: string };
		health = { reachable: true, version: h.version ?? null };
	} catch {
		// leave defaults
	}

	// ── description ───────────────────────────────────────────────────────────
	let description: PDSDescription = {
		did: null,
		inviteCodeRequired: null,
		phoneVerificationRequired: null,
		availableUserDomains: [],
		links: null,
		contact: null
	};
	try {
		const d = (await fetchJSON(`${baseUrl}/xrpc/com.atproto.server.describeServer`)) as {
			did?: string;
			inviteCodeRequired?: boolean;
			phoneVerificationRequired?: boolean;
			availableUserDomains?: string[];
			links?: { privacyPolicy?: string; termsOfService?: string };
			contact?: { email?: string };
		};
		description = {
			did: d.did ?? null,
			inviteCodeRequired: d.inviteCodeRequired ?? null,
			phoneVerificationRequired: d.phoneVerificationRequired ?? null,
			availableUserDomains: d.availableUserDomains ?? [],
			links: d.links ?? null,
			contact: d.contact ?? null
		};
	} catch {
		// leave defaults
	}

	// ── account count (paginated) ─────────────────────────────────────────────
	let accountCount = 0;
	try {
		let cursor: string | undefined;
		do {
			const url =
				`${baseUrl}/xrpc/com.atproto.sync.listRepos?limit=1000` +
				(cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');
			const r = (await fetchJSON(url)) as { repos?: unknown[]; cursor?: string };
			accountCount += (r.repos ?? []).length;
			cursor = r.cursor;
		} while (cursor);
	} catch {
		accountCount = -1;
	}

	return { health, description, accountCount };
}
