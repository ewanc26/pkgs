#!/usr/bin/env node
/**
 * Migrate PDS records from old collection NSIDs to new ones.
 *
 * Old → New:
 *   uk.ewancroft.kofi.supporter  →  uk.ewancroft.support.kofi
 *   uk.ewancroft.github.sponsor  →  uk.ewancroft.support.github
 *
 * Usage:
 *   ATPROTO_DID=... ATPROTO_APP_PASSWORD=... node scripts/migrate-collections.mjs
 *
 * Flags:
 *   --dry-run   Print what would be migrated without writing anything.
 *   --delete    Delete old records after copying (default: leave them in place).
 */

import { AtpAgent } from '@atproto/api';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const deleteOld = args.includes('--delete');

const MIGRATIONS = [
	{ from: 'uk.ewancroft.kofi.supporter', to: 'uk.ewancroft.support.kofi' },
	{ from: 'uk.ewancroft.github.sponsor',  to: 'uk.ewancroft.support.github' },
];

function requireEnv(key) {
	const val = process.env[key];
	if (!val) { console.error(`Missing env var: ${key}`); process.exit(1); }
	return val;
}

async function resolvePdsUrl(did) {
	const res = await fetch(
		`https://slingshot.microcosm.blue/xrpc/com.bad-example.identity.resolveMiniDoc?identifier=${encodeURIComponent(did)}`
	);
	if (!res.ok) throw new Error(`Failed to resolve PDS for ${did}: ${res.status}`);
	const data = await res.json();
	if (!data.pds) throw new Error(`No PDS found for ${did}`);
	return data.pds;
}

const did = requireEnv('ATPROTO_DID');
const password = requireEnv('ATPROTO_APP_PASSWORD');

console.log(`DID: ${did}`);
if (dryRun) console.log('DRY RUN — nothing will be written.\n');
if (deleteOld && !dryRun) console.log('--delete: old records will be removed after copy.\n');

const pdsUrl = process.env.ATPROTO_PDS_URL ?? await resolvePdsUrl(did);
console.log(`PDS: ${pdsUrl}`);
const agent = new AtpAgent({ service: pdsUrl });
await agent.login({ identifier: did, password });
console.log(`✓ Logged in\n`);

for (const { from, to } of MIGRATIONS) {
	console.log(`─── ${from} → ${to}`);

	const records = [];
	let cursor;

	do {
		const res = await agent.com.atproto.repo.listRecords({
			repo: did,
			collection: from,
			limit: 100,
			cursor,
		});
		for (const r of res.data.records) {
			records.push({ rkey: r.uri.split('/').pop(), value: r.value });
		}
		cursor = res.data.cursor;
	} while (cursor);

	if (records.length === 0) {
		console.log('  (no records found)\n');
		continue;
	}

	console.log(`  Found ${records.length} record(s)`);

	for (const { rkey, value } of records) {
		// Strip the old $type if present so the new collection's type is used
		const { $type: _, ...record } = value;

		if (dryRun) {
			console.log(`  [dry-run] would copy ${rkey}`);
			continue;
		}

		await agent.com.atproto.repo.putRecord({
			repo: did,
			collection: to,
			rkey,
			record,
		});
		console.log(`  ✓ copied ${rkey}`);

		if (deleteOld) {
			await agent.com.atproto.repo.deleteRecord({
				repo: did,
				collection: from,
				rkey,
			});
			console.log(`  ✗ deleted old ${from}/${rkey}`);
		}
	}

	console.log();
}

console.log('Done.');
