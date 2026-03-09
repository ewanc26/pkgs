#!/usr/bin/env node
/**
 * Probe multiple candidate ko-fi.tools API endpoint patterns.
 * Usage: node scripts/probe-endpoints.mjs YOUR_KOFI_PAGE_ID
 */

const pageId = process.argv[2] ?? 'ewancroft';

const candidates = [
	`https://api.ko-fi.tools/v2/${pageId}/supporters`,
	`https://api.ko-fi.tools/v2/${pageId}/top-supporters`,
	`https://api.ko-fi.tools/v2/supporters/${pageId}`,
	`https://api.ko-fi.tools/${pageId}/supporters`,
	`https://api.ko-fi.tools/${pageId}`,
	`https://api.ko-fi.tools/v2/${pageId}`,
	`https://api.ko-fi.tools/v1/${pageId}/supporters`,
	`https://api.ko-fi.tools/v1/${pageId}/top`,
	`https://ko-fi.tools/api/${pageId}/supporters`,
	`https://ko-fi.tools/api/v2/${pageId}/supporters`,
];

for (const url of candidates) {
	try {
		const res = await fetch(url, { headers: { Accept: 'application/json' } });
		const body = await res.text();
		let parsed;
		try { parsed = JSON.parse(body); } catch { parsed = body.slice(0, 120); }
		console.log(`${res.status} ${url}`);
		if (res.status !== 404) console.log('       →', JSON.stringify(parsed).slice(0, 200));
	} catch (e) {
		console.log(`ERR  ${url} — ${e.message}`);
	}
}
