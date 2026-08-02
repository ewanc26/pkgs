<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	// ── Types ────────────────────────────────────────────────────────────────

	interface AccountDetail {
		did: string;
	}

	interface Stats {
		accounts?: number;
		accountDetails?: AccountDetail[];
	}

	interface JetstreamCommit {
		rev?: string;
		type?: 'c' | 'u' | 'd';
		collection?: string;
		rkey?: string;
		record?: Record<string, unknown>;
		cid?: string;
	}

	interface JetstreamEvent {
		did: string;
		time_us: number;
		type: 'com' | 'identity' | 'account';
		commit?: JetstreamCommit;
		identity?: { did: string; handle: string; seq: number };
		account?: { active: boolean; did: string; seq: number; status: string };
	}

	interface FeedEntry {
		id: string;
		time: Date;
		op: 'c' | 'u' | 'd' | 'i' | 'a';
		collection: string;
		collectionColor: string;
		description: string;
	}

	interface Props {
		/** Base URL for the /stats endpoint (to discover hosted DIDs). Defaults to '' (same origin). */
		baseUrl?: string;
		/** Jetstream WebSocket subscribe URL. Defaults to the public Bluesky east endpoint. */
		jetstreamUrl?: string;
		/** Maximum number of entries kept in the feed. Defaults to 50. */
		maxEntries?: number;
	}

	let {
		baseUrl = '',
		jetstreamUrl = 'wss://jetstream2.us-east.bsky.network/subscribe',
		maxEntries = 50
	}: Props = $props();

	// ── State ─────────────────────────────────────────────────────────────────

	let entries: FeedEntry[] = $state([]);
	let connectionState: 'connecting' | 'connected' | 'disconnected' = $state('disconnected');
	let accountCount = $state(0);
	let refreshing = $state(false);

	let ws: WebSocket | null = null;
	let reconnectDelay = 1000;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let mounted = false;

	// ── Helpers ──────────────────────────────────────────────────────────────

	const COLLECTION_LABELS: Record<string, string> = {
		'app.bsky.feed.post': 'post',
		'app.bsky.feed.like': 'like',
		'app.bsky.feed.repost': 'repost',
		'app.bsky.graph.follow': 'follow',
		'app.bsky.graph.block': 'block',
		'app.bsky.actor.profile': 'profile',
		'app.bsky.feed.threadgate': 'threadgate',
		'app.bsky.feed.postgate': 'postgate',
		'app.bsky.graph.list': 'list',
		'app.bsky.graph.listitem': 'list item',
		'app.bsky.actor.generator': 'feed gen',
		'app.bsky.graph.listblock': 'list block',
		'chat.bsky.actor.declaration': 'chat decl',
		'chat.bsky.convo.message': 'dm',
		'community.lexicon.interaction.like': 'interaction',
		'site.standard.document': 'blog post'
	};

	function shortenCollection(nsid: string): string {
		return COLLECTION_LABELS[nsid] ?? nsid.split('.').pop() ?? nsid;
	}

	function hashString(s: string): number {
		let hash = 0;
		for (let i = 0; i < s.length; i++) {
			hash = ((hash << 5) - hash) + s.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash);
	}

	function nsidColor(nsid: string): string {
		const hue = hashString(nsid) % 360;
		return `hsl(${hue}, 65%, 65%)`;
	}

	function truncate(s: string, max: number): string {
		return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
	}

	function buildDescription(event: JetstreamEvent): string {
		if (event.type === 'identity' && event.identity) {
			return `handle \u2192 ${event.identity.handle}`;
		}
		if (event.type === 'account' && event.account) {
			return event.account.active ? 'activated' : `status: ${event.account.status}`;
		}
		const commit = event.commit;
		if (!commit) return '';

		const record = commit.record as
			| { text?: string; reply?: { parent?: { uri?: string } }; subject?: { uri?: string } | string }
			| undefined;

		switch (commit.collection) {
			case 'app.bsky.feed.post': {
				if (commit.type === 'd') return `deleted ${commit.rkey ?? ''}`;
				const text = record?.text ?? '';
				const reply = record?.reply;
				if (reply?.parent?.uri) return `replied: ${truncate(text, 60)}`;
				return truncate(text, 60) || '(empty post)';
			}
			case 'app.bsky.feed.like': {
				if (commit.type === 'd') return `unliked ${truncate(commit.rkey ?? '', 20)}`;
				const subject = record?.subject;
				return typeof subject === 'object' && subject?.uri
					? truncate(subject.uri, 70)
					: '';
			}
			case 'app.bsky.feed.repost': {
				if (commit.type === 'd') return `unreposted ${truncate(commit.rkey ?? '', 20)}`;
				const subject = record?.subject;
				return typeof subject === 'object' && subject?.uri
					? truncate(subject.uri, 70)
					: '';
			}
			case 'app.bsky.graph.follow': {
				if (commit.type === 'd') return `unfollowed ${truncate(commit.rkey ?? '', 30)}`;
				const subject = record?.subject;
				return typeof subject === 'string' ? `\u2192 ${truncate(subject, 50)}` : '';
			}
			case 'app.bsky.graph.block': {
				if (commit.type === 'd') return `unblocked ${truncate(commit.rkey ?? '', 30)}`;
				const subject = record?.subject;
				return typeof subject === 'string' ? `\u2192 ${truncate(subject, 50)}` : '';
			}
			case 'app.bsky.actor.profile': {
				return commit.type === 'd' ? 'deleted profile' : 'updated profile';
			}
			default: {
				if (commit.type === 'd') return commit.rkey ?? '';
				return truncate(JSON.stringify(record ?? {}).slice(0, 60), 60);
			}
		}
	}

	function handleEvent(event: JetstreamEvent) {
		let op: FeedEntry['op'] = 'c';
		if (event.type === 'identity') op = 'i';
		else if (event.type === 'account') op = 'a';
		else if (event.commit?.type === 'u') op = 'u';
		else if (event.commit?.type === 'd') op = 'd';

		const nsid = event.commit?.collection ?? event.type;
		const entry: FeedEntry = {
			id: `${event.time_us}-${Math.random().toString(36).slice(2, 8)}`,
			time: new Date(event.time_us / 1000),
			op,
			collection: event.commit?.collection
				? shortenCollection(event.commit.collection)
				: event.type,
			collectionColor: nsidColor(nsid),
			description: buildDescription(event)
		};
		entries = [entry, ...entries].slice(0, maxEntries);
	}

	// ── Connection ────────────────────────────────────────────────────────────

	async function fetchAccountDids(): Promise<string[]> {
		try {
			const r = await fetch(`${baseUrl}/stats`);
			if (!r.ok) return [];
			const stats: Stats = await r.json();
			accountCount = stats.accountDetails?.length ?? 0;
			return (stats.accountDetails ?? []).map((a) => a.did);
		} catch {
			return [];
		}
	}

	function connect(dids: string[]) {
		if (!mounted || dids.length === 0) {
			connectionState = 'disconnected';
			return;
		}

		const params = new URLSearchParams();
		for (const did of dids) {
			params.append('wantedDids', did);
		}
		const url = `${jetstreamUrl}?${params.toString()}`;

		connectionState = 'connecting';
		ws = new WebSocket(url);

		ws.onopen = () => {
			connectionState = 'connected';
			reconnectDelay = 1000;
		};

		ws.onmessage = (e) => {
			try {
				const event: JetstreamEvent = JSON.parse(e.data as string);
				handleEvent(event);
			} catch {
				// skip malformed messages
			}
		};

		ws.onclose = () => {
			connectionState = 'disconnected';
			ws = null;
			scheduleReconnect(dids);
		};

		ws.onerror = () => {
			connectionState = 'disconnected';
			ws?.close();
		};
	}

	function scheduleReconnect(dids: string[]) {
		if (reconnectTimer) clearTimeout(reconnectTimer);
		reconnectTimer = setTimeout(() => connect(dids), reconnectDelay);
		reconnectDelay = Math.min(reconnectDelay * 2, 30000);
	}

	async function refresh() {
		refreshing = true;
		entries = [];
		if (ws) {
			ws.close();
			ws = null;
		}
		if (reconnectTimer) clearTimeout(reconnectTimer);
		const dids = await fetchAccountDids();
		if (dids.length > 0) {
			connect(dids);
		}
		refreshing = false;
	}

	// ── Lifecycle ─────────────────────────────────────────────────────────────

	onMount(async () => {
		mounted = true;
		const dids = await fetchAccountDids();
		if (dids.length > 0) {
			connect(dids);
		}
	});

	onDestroy(() => {
		mounted = false;
		if (reconnectTimer) clearTimeout(reconnectTimer);
		ws?.close();
	});
</script>

<div class="pds-jetstream">
	<div class="pds-jetstream-header">
		<span class="pds-jetstream-status {connectionState}">
			{connectionState}
		</span>
		{#if connectionState === 'connected' && entries.length === 0}
			<span class="pds-jetstream-hint">listening{' '}{#if accountCount > 0} to {accountCount} account{accountCount > 1 ? 's' : ''}{/if}</span>
		{/if}
		<button class="pds-jetstream-refresh" onclick={refresh} disabled={refreshing || connectionState === 'connecting'}>
			{refreshing ? 'refreshing…' : 'refresh'}
		</button>
	</div>

	{#if entries.length > 0}
		<div class="pds-jetstream-feed">
			{#each entries as entry (entry.id)}
				<div class="pds-jetstream-entry">
					<span class="pds-jetstream-time">
						{entry.time.toLocaleTimeString('en-GB', { hour12: false })}
					</span>
					<span class="pds-jetstream-op op-{entry.op}">
						{entry.op === 'c' ? '+' : entry.op === 'd' ? '-' : entry.op === 'u' ? '~' : entry.op}
					</span>
					<span class="pds-jetstream-collection" style="color: {entry.collectionColor}">{entry.collection}</span>
					<span class="pds-jetstream-desc">{entry.description}</span>
				</div>
			{/each}
		</div>
	{:else}
		<div class="pds-jetstream-empty">
			{#if connectionState === 'connecting'}
				<span class="pds-jetstream-pulse">connecting to jetstream…</span>
			{:else if connectionState === 'disconnected'}
				<span class="pds-jetstream-dim">disconnected</span>
			{:else}
				<span class="pds-jetstream-pulse">waiting for activity…</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.pds-jetstream {
		font-size: 0.82em;
	}

	.pds-jetstream-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 0.5rem;
	}

	.pds-jetstream-status {
		font-size: 0.72em;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		padding: 0.1rem 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid;
	}

	.pds-jetstream-status.connecting {
		color: var(--pds-color-yellow);
		border-color: color-mix(in srgb, var(--pds-color-yellow) 40%, transparent);
		background-color: color-mix(in srgb, var(--pds-color-yellow) 8%, transparent);
	}

	.pds-jetstream-status.connected {
		color: var(--pds-color-green);
		border-color: color-mix(in srgb, var(--pds-color-green) 40%, transparent);
		background-color: color-mix(in srgb, var(--pds-color-green) 8%, transparent);
	}

	.pds-jetstream-status.disconnected {
		color: var(--pds-color-red);
		border-color: color-mix(in srgb, var(--pds-color-red) 40%, transparent);
		background-color: color-mix(in srgb, var(--pds-color-red) 8%, transparent);
	}

	.pds-jetstream-hint {
		color: var(--pds-color-subtext-0);
		opacity: 0.6;
		font-size: 0.85em;
	}

	.pds-jetstream-refresh {
		font-size: 0.72em;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		padding: 0.1rem 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid;
		color: var(--pds-color-green);
		border-color: color-mix(in srgb, var(--pds-color-green) 40%, transparent);
		background-color: color-mix(in srgb, var(--pds-color-green) 8%, transparent);
		cursor: pointer;
	}

	.pds-jetstream-refresh:hover:not(:disabled) {
		background-color: color-mix(in srgb, var(--pds-color-green) 15%, transparent);
	}

	.pds-jetstream-refresh:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pds-jetstream-feed {
		max-height: 280px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding-right: 0.3rem;
	}

	.pds-jetstream-entry {
		display: grid;
		grid-template-columns: auto auto 70px 1fr;
		gap: 0.5rem;
		align-items: baseline;
		padding: 0.15rem 0;
		animation: pds-jetstream-fade-in 0.3s ease-out;
	}

	.pds-jetstream-time {
		color: var(--pds-color-green);
		opacity: 0.35;
		font-size: 0.85em;
		white-space: nowrap;
	}

	.pds-jetstream-op {
		font-weight: 700;
		text-align: center;
		width: 1.2em;
	}

	.pds-jetstream-op.op-c {
		color: var(--pds-color-green);
	}

	.pds-jetstream-op.op-u {
		color: var(--pds-color-yellow);
	}

	.pds-jetstream-op.op-d {
		color: var(--pds-color-red);
	}

	.pds-jetstream-op.op-i {
		color: var(--pds-color-subtext-0);
	}

	.pds-jetstream-op.op-a {
		color: var(--pds-color-yellow);
		opacity: 0.7;
	}

	.pds-jetstream-collection {
		opacity: 0.7;
		font-size: 0.9em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.pds-jetstream-desc {
		color: var(--pds-color-text);
		opacity: 0.75;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.pds-jetstream-empty {
		padding: 0.8rem 0;
		display: flex;
		align-items: center;
	}

	.pds-jetstream-dim {
		color: var(--pds-color-subtext-0);
		opacity: 0.4;
	}

	.pds-jetstream-pulse {
		color: var(--pds-color-green);
		opacity: 0.5;
		animation: pds-jetstream-pulse 1.5s ease-in-out infinite;
	}

	@keyframes pds-jetstream-pulse {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.7;
		}
	}

	@keyframes pds-jetstream-fade-in {
		from {
			opacity: 0;
			transform: translateY(-0.2em);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 440px) {
		.pds-jetstream-entry {
			grid-template-columns: auto auto 1fr;
			gap: 0.35rem;
		}

		.pds-jetstream-collection {
			grid-column: 3;
		}

		.pds-jetstream-desc {
			grid-column: 1 / -1;
			padding-left: 2.5rem;
			font-size: 0.9em;
		}
	}
</style>
