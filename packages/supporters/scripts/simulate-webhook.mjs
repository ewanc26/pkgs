#!/usr/bin/env node
/**
 * Simulate Ko-fi webhook POSTs against your local dev server.
 *
 * Usage:
 *   KOFI_VERIFICATION_TOKEN=your-token node scripts/simulate-webhook.mjs [type] [name] [tier]
 *
 * Types: Donation | Subscription | Commission | "Shop Order"
 *
 * Examples:
 *   node scripts/simulate-webhook.mjs Donation "Jo Example"
 *   node scripts/simulate-webhook.mjs Subscription "Alice" "Lunar Contributors"
 *   node scripts/simulate-webhook.mjs Commission "Bob"
 *   node scripts/simulate-webhook.mjs "Shop Order" "Carol"
 */

const token = process.env.KOFI_VERIFICATION_TOKEN ?? 'test-token';
const type = process.argv[2] ?? 'Donation';
const name = process.argv[3] ?? 'Jo Example';
const tier = process.argv[4] ?? (type === 'Subscription' ? 'Lunar Contributors' : null);
const url = process.argv[5] ?? 'http://localhost:5173/webhook';

const isSubscription = type === 'Subscription';

const payload = {
	verification_token: token,
	message_id: crypto.randomUUID(),
	timestamp: new Date().toISOString(),
	type,
	is_public: true,
	from_name: name,
	message: 'Simulated webhook event',
	amount: '3.00',
	url: 'https://ko-fi.com/Home/CoffeeShop?txid=test',
	email: 'test@example.com',
	currency: 'GBP',
	is_subscription_payment: isSubscription,
	is_first_subscription_payment: isSubscription,
	kofi_transaction_id: crypto.randomUUID(),
	shop_items: type === 'Shop Order' ? [{ id: 'item-1', name: 'Test Item' }] : null,
	tier_name: tier ?? null,
	shipping: null
};

const body = new URLSearchParams({ data: JSON.stringify(payload) });

console.log(`→ POST ${url}`);
console.log(`  type:      ${type}`);
console.log(`  from_name: ${name}`);
if (tier) console.log(`  tier_name: ${tier}`);
console.log();

const res = await fetch(url, {
	method: 'POST',
	headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
	body
});

console.log(`Status: ${res.status} ${res.statusText}`);
if (res.status !== 200) {
	console.log('Body:', await res.text());
}
