#!/usr/bin/env node
/**
 * Probe the ko-fi.tools API for a given Ko-fi page ID.
 *
 * Usage:
 *   node scripts/probe-api.mjs YOUR_KOFI_PAGE_ID
 *
 * If the endpoint path is wrong, update API_BASE / path in src/lib/api.ts
 * once the ko-fi.tools V2 docs are published.
 */

const pageId = process.argv[2];

if (!pageId) {
	console.error('Usage: node scripts/probe-api.mjs YOUR_KOFI_PAGE_ID');
	process.exit(1);
}

const API_BASE = 'https://api.ko-fi.tools/v2';
const url = `${API_BASE}/${encodeURIComponent(pageId)}/supporters`;

console.log(`→ GET ${url}\n`);

try {
	const res = await fetch(url, { headers: { Accept: 'application/json' } });
	console.log(`Status: ${res.status} ${res.statusText}`);
	console.log('Headers:', Object.fromEntries(res.headers.entries()));

	const body = await res.text();
	try {
		console.log('\nBody (parsed):', JSON.stringify(JSON.parse(body), null, 2));
	} catch {
		console.log('\nBody (raw):', body);
	}
} catch (err) {
	console.error('Network error:', err.message);
}
