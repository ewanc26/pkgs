#!/usr/bin/env node
/**
 * Import historical Ko-fi transaction data into your PDS.
 *
 * Export your transactions from: ko-fi.com/manage/transactions → Export CSV
 *
 * Usage:
 *   ATPROTO_DID=... ATPROTO_PDS_URL=... ATPROTO_APP_PASSWORD=... \
 *     node scripts/import-history.mjs /path/to/kofi-transactions.csv
 *
 * Flags:
 *   --dry-run   Print what would be upserted without writing to the PDS.
 *   --skip N    Skip the first N data rows (resume after a partial import).
 *
 * The script is idempotent — re-running it will merge new event types and
 * tiers into existing records rather than creating duplicates.
 */

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

// ── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const skipArg = args.find((a) => a.startsWith('--skip='));
const skip = skipArg ? parseInt(skipArg.split('=')[1], 10) : 0;

if (!csvPath) {
	console.error('Usage: node scripts/import-history.mjs <path-to-csv> [--dry-run] [--skip=N]');
	process.exit(1);
}

// ── Ko-fi CSV column mapping ──────────────────────────────────────────────────
// Actual export headers (from ko-fi.com/manage/transactions):
//   DateTime (UTC), From, Message, Item, Received, Given, Currency,
//   TransactionType, TransactionId, Reference, SalesTax, ...
//
// TransactionType values seen in exports → our KofiEventType:
//   "Tip"          → "Donation"
//   "Monthly Tip"  → "Subscription"
//   "Commission"   → "Commission"
//   "Shop Order"   → "Shop Order"

const TYPE_MAP = {
	'tip': 'Donation',
	'monthly tip': 'Subscription',
	'commission': 'Commission',
	'shop order': 'Shop Order',
};

function normaliseType(raw) {
	const key = raw.trim().toLowerCase();
	return TYPE_MAP[key] ?? raw.trim();
}

// Ko-fi's CSV header names, lowercased + spaces collapsed to underscores.
// Used to map row fields by name rather than position.
const COL_TIMESTAMP  = 'datetime_(utc)';
const COL_NAME       = 'from';
const COL_TYPE       = 'transactiontype';
const COL_TIER       = 'item'; // only meaningful for subscriptions

// ── ATProto write ────────────────────────────────────────────────────────────

const COLLECTION = 'uk.ewancroft.kofi.supporter';

function requireEnv(key) {
	const val = process.env[key];
	if (!val) { console.error(`Missing env var: ${key}`); process.exit(1); }
	return val;
}

const { generateTID } = await import('@ewanc26/tid');

async function appendEvent(agent, did, name, type, tier, timestamp) {
	const rkey = generateTID(timestamp);
	const record = { name, type, ...(tier ? { tier } : {}) };
	await agent.com.atproto.repo.putRecord({ repo: did, collection: COLLECTION, rkey, record });
	return rkey;
}

// ── CSV parser (no dependencies) ─────────────────────────────────────────────

function parseCSVLine(line) {
	const fields = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
			else { inQuotes = !inQuotes; }
		} else if (ch === ',' && !inQuotes) {
			fields.push(current.trim());
			current = '';
		} else {
			current += ch;
		}
	}
	fields.push(current.trim());
	return fields;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const { AtpAgent } = await import('@atproto/api');

let agent, did;

if (!dryRun) {
	did = requireEnv('ATPROTO_DID');
	const pdsUrl = requireEnv('ATPROTO_PDS_URL');
	const password = requireEnv('ATPROTO_APP_PASSWORD');

	agent = new AtpAgent({ service: pdsUrl });
	await agent.login({ identifier: did, password });
	console.log(`✓ Logged in as ${did}\n`);
} else {
	console.log('DRY RUN — nothing will be written to the PDS.\n');
}

const rl = createInterface({ input: createReadStream(resolve(csvPath)), crlfDelay: Infinity });

let headers = null;
let rowIndex = 0;
let processed = 0;
let skipped = 0;
let errors = 0;

for await (const line of rl) {
	if (!line.trim()) continue;

	if (!headers) {
		headers = parseCSVLine(line).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
		console.log(`Headers: ${headers.join(', ')}\n`);
		continue;
	}

	rowIndex++;

	if (rowIndex <= skip) {
		skipped++;
		continue;
	}

	const fields = parseCSVLine(line);
	const row = Object.fromEntries(headers.map((h, i) => [h, fields[i] ?? '']));

	const name = row[COL_NAME]?.trim();
	const type = normaliseType(row[COL_TYPE] ?? '');
	const rawTier = row[COL_TIER]?.trim();
	// Only treat "Item" as a tier if it's a Subscription AND not the generic "Ko-fi Support" label.
	const tier = type === 'Subscription' && rawTier && rawTier.toLowerCase() !== 'ko-fi support' ? rawTier : null;
	// Ko-fi exports timestamps as "MM/DD/YYYY HH:MM" UTC — convert to ISO 8601.
	const rawTs = row[COL_TIMESTAMP]?.trim();
	const timestamp = rawTs ? new Date(rawTs + ' UTC').toISOString() : new Date().toISOString();

	if (!name) {
		console.warn(`Row ${rowIndex}: empty name, skipping.`);
		errors++;
		continue;
	}

	if (dryRun) {
		const rkey = generateTID(timestamp);
		console.log(`[${rowIndex}] ${rkey}  ${name} · ${type}${tier ? ` · ${tier}` : ''}`);
		processed++;
		continue;
	}

	try {
		const rkey = await appendEvent(agent, did, name, type, tier, timestamp);
		console.log(`[${rowIndex}] ${rkey} ${name} · ${type}${tier ? ` · ${tier}` : ''}`);
		processed++;
	} catch (err) {
		console.error(`[${rowIndex}] ERROR for "${name}": ${err.message}`);
		errors++;
	}
}

console.log(`\n─────────────────────────────`);
console.log(`Processed : ${processed}`);
if (skipped) console.log(`Skipped   : ${skipped} (--skip=${skip})`);
if (errors)  console.log(`Errors    : ${errors}`);
console.log(`─────────────────────────────`);
