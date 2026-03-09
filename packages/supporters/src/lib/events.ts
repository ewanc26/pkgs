/**
 * Fetches Ko-fi supporter events as a chronological timeline.
 *
 * Unlike readStore (which aggregates per-person), this returns every
 * individual event record ordered most-recent-first.
 *
 * No auth required — records are publicly readable.
 *
 * @param did  - The ATProto DID to read records from.
 */

import { AtpAgent } from '@atproto/api';
import { decodeTid } from '@ewanc26/tid';
import type { KofiEventType } from './types.js';

export type { KofiEventType };

const COLLECTION = 'uk.ewancroft.kofi.supporter';

export interface KofiSupportEvent {
	rkey: string;
	name: string;
	type: KofiEventType;
	tier?: string;
	date: Date;
}

async function resolvePdsUrl(did: string): Promise<string> {
	const res = await fetch(
		`https://slingshot.microcosm.blue/xrpc/com.bad-example.identity.resolveMiniDoc?identifier=${encodeURIComponent(did)}`
	);
	if (!res.ok) throw new Error(`Failed to resolve PDS for ${did}: ${res.status}`);
	const data = (await res.json()) as { pds?: string };
	if (!data.pds) throw new Error(`No PDS found in identity document for ${did}`);
	return data.pds;
}

export async function fetchEvents(did: string): Promise<KofiSupportEvent[]> {
	const pdsUrl = await resolvePdsUrl(did);
	const agent = new AtpAgent({ service: pdsUrl });

	const events: KofiSupportEvent[] = [];
	let cursor: string | undefined;

	do {
		const res = await agent.com.atproto.repo.listRecords({
			repo: did,
			collection: COLLECTION,
			limit: 100,
			cursor
		});

		for (const record of res.data.records) {
			const value = record.value as { name: string; type: KofiEventType; tier?: string };
			const rkey = record.uri.split('/').pop() ?? '';
			let date: Date;
			try {
				date = decodeTid(rkey).date;
			} catch {
				date = new Date(0);
			}
			events.push({ rkey, name: value.name, type: value.type, tier: value.tier, date });
		}

		cursor = res.data.cursor;
	} while (cursor);

	return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}
