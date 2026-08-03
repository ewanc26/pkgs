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

	interface TargetInfo {
		did?: string;
		handle?: string;
		kind?: string;
		raw?: string;
		uri?: string;
	}

	interface FeedEntry {
		id: string;
		time: Date;
		op: 'c' | 'u' | 'd' | 'i' | 'a';
		collection: string;
		collectionColor: string;
		description: string;
		target?: TargetInfo;
		tooltip?: string;
		/** Internal: record + operation used for async lexicon-based re-formatting. */
		_nsid?: string;
		_record?: Record<string, unknown>;
		_op?: 'create' | 'update' | 'delete';
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
	let now = $state(Date.now());
	let resolvedHandles: Record<string, string | undefined> = $state({});

	let ws: WebSocket | null = null;
	let reconnectDelay = 1000;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let ticker: ReturnType<typeof setInterval> | null = null;
	let mounted = false;

	// ── Helpers ──────────────────────────────────────────────────────────────

	const COLLECTION_LABELS: Record<string, string> = {
		'app.bsky.feed.post': 'post',
		'app.bsky.feed.like': 'like',
		'app.bsky.feed.repost': 'repost',
		'app.bsky.graph.follow': 'follow',
		'app.bsky.graph.block': 'block',
		'app.bsky.actor.profile': 'profile',
		'app.bsky.feed.threadgate': 'thread gate',
		'app.bsky.feed.postgate': 'post gate',
		'app.bsky.graph.list': 'list',
		'app.bsky.graph.listitem': 'list item',
		'app.bsky.actor.generator': 'feed gen',
		'app.bsky.graph.listblock': 'list block',
		'app.bsky.graph.starterpack': 'starter pack',
		'chat.bsky.actor.declaration': 'chat decl',
		'chat.bsky.convo.message': 'dm',
		'community.lexicon.interaction.like': 'interaction',
		'site.standard.document': 'blog post'
	};

	const OP_LABELS: Record<FeedEntry['op'], string> = {
		c: 'create',
		u: 'update',
		d: 'delete',
		i: 'identity',
		a: 'account'
	};

	/**
	 * Display vocabulary for known collections. This is the only per-collection
	 * knowledge; every record's *content* is rendered dynamically from its
	 * Lexicon schema (with field heuristics as fallback for unknown lexicons).
	 */
	const VERBS: Record<string, { create?: string; update?: string; delete?: string }> = {
		'app.bsky.feed.post': { create: 'posted', update: 'edited post', delete: 'deleted post' },
		'app.bsky.feed.like': { create: 'liked', delete: 'unliked' },
		'app.bsky.feed.repost': { create: 'reposted', delete: 'unreposted' },
		'app.bsky.graph.follow': { create: 'followed', delete: 'unfollowed' },
		'app.bsky.graph.block': { create: 'blocked', delete: 'unblocked' },
		'app.bsky.actor.profile': { create: 'created profile', update: 'updated profile', delete: 'deleted profile' },
		'app.bsky.feed.threadgate': {
			create: 'created thread gates',
			update: 'updated thread gates',
			delete: 'removed thread gates'
		},
		'app.bsky.feed.postgate': {
			create: 'created post gates',
			update: 'updated post gates',
			delete: 'removed post gates'
		},
		'app.bsky.graph.list': { create: 'created list', update: 'updated list', delete: 'deleted list' },
		'app.bsky.graph.listitem': { create: 'added to list', delete: 'removed from list' },
		'app.bsky.graph.listblock': { create: 'blocked list', delete: 'unblocked list' },
		'app.bsky.graph.starterpack': {
			create: 'published starter pack',
			update: 'updated starter pack',
			delete: 'deleted starter pack'
		},
		'app.bsky.actor.generator': {
			create: 'created feed generator',
			update: 'updated feed generator',
			delete: 'deleted feed generator'
		},
		'chat.bsky.actor.declaration': {
			create: 'joined chat',
			update: 'updated chat declaration',
			delete: 'left chat'
		},
		'chat.bsky.convo.message': { create: 'messaged', delete: 'deleted a dm' },
		'community.lexicon.interaction.like': { create: 'liked', delete: 'unliked' },
		'site.standard.document': { create: 'published', update: 'updated', delete: 'deleted' }
	};

	const REF_FORMATS = new Set(['at-uri', 'at-identifier', 'did', 'handle', 'uri']);
	const TARGET_STOP = new Set(['post', 'createdAt', 'cid', '$type', 'blob']);
	const TARGET_PRIORITY: Record<string, number> = {
		list: 0,
		parent: 1,
		root: 2,
		subject: 3,
		actor: 3,
		recipient: 4
	};
	const CONTENT_KEYS = [
		'text',
		'title',
		'name',
		'displayName',
		'description',
		'value',
		'body',
		'caption',
		'content',
		'detail',
		'plaintext',
		'message',
		'trackName',
		'headline',
		'note',
		'reason'
	];
	const NUMERIC_CONTENT_KEYS = ['score', 'wpm', 'accuracy', 'rating', 'level', 'totalScore', 'highestScore', 'finalScore'];
	const META_LABELS: Record<string, string> = { allow: 'gated', hiddenReplies: 'hidden' };

	interface LexSchema {
		type?: string;
		format?: string;
		ref?: string;
		refs?: string[];
		enum?: Array<string | number>;
		knownValues?: string[];
		accept?: string[];
		items?: LexSchema;
	}

	interface Lexicon {
		defs?: {
			main?: {
				description?: string;
				record?: { required?: string[]; properties?: Record<string, LexSchema> };
			};
		};
	}

	function shortenCollection(nsid: string): string {
		return COLLECTION_LABELS[nsid] ?? prettifyName(nsid.split('.').pop() ?? nsid);
	}

	/** Reverse-DNS authority of a lexicon NSID (eg `sh.tangled`, `app.bsky`). */
	function lexiconDomain(nsid: string): string {
		const parts = nsid.split('.');
		return parts.length > 2 ? parts.slice(0, 2).join('.') : nsid;
	}

	function prettifyName(s: string): string {
		return s
			.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
			.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
			.replace(/_/g, ' ')
			.trim();
	}

	function hashString(s: string): number {
		let hash = 0;
		for (let i = 0; i < s.length; i++) {
			hash = (hash << 5) - hash + s.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash);
	}

	function nsidColor(nsid: string): string {
		const hue = hashString(nsid) % 360;
		return `hsl(${hue}, 65%, 65%)`;
	}

	/** Render an `at://` URI (or DID) as structured target info. */
	function describeTarget(subject: unknown): TargetInfo | null {
		const uri = typeof subject === 'string' ? subject : (subject as { uri?: string } | null)?.uri;
		if (!uri) return null;
		if (uri.startsWith('at://')) {
			const rest = uri.slice('at://'.length);
			const [authority, ...path] = rest.split('/');
			const kind = path[0]?.split('.').pop();
			if (authority.startsWith('did:')) return { did: authority, kind, uri };
			return { handle: authority, kind, uri };
		}
		if (uri.startsWith('did:')) return { did: uri, uri };
		return { raw: uri, uri };
	}

	/** Render a target using the best-known name (resolved handle, else full DID — never truncated). */
	function targetDisplay(target: TargetInfo): string {
		if (target.handle) return target.kind ? `@${target.handle} · ${target.kind}` : `@${target.handle}`;
		if (target.did) {
			const handle = resolvedHandles[target.did];
			if (handle) return target.kind ? `@${handle} · ${target.kind}` : `@${handle}`;
			return target.kind ? `${target.did} · ${target.kind}` : target.did;
		}
		return target.raw ?? '';
	}

	// ── DID → handle resolution ─────────────────────────────────────────────

	const RESOLVE_RETRY_MS = 300_000;
	const pendingResolves = new Map<string, Promise<void>>();
	const failedAt: Record<string, number> = {};

	async function fetchDidHandle(did: string): Promise<string | null> {
		let url: string;
		if (did.startsWith('did:plc:')) {
			url = `https://plc.directory/${did}`;
		} else if (did.startsWith('did:web:')) {
			url = `https://${did.slice('did:web:'.length)}/.well-known/did.json`;
		} else {
			return null;
		}
		const r = await fetch(url);
		if (!r.ok) return null;
		const doc: { alsoKnownAs?: unknown } = await r.json();
		const aka = Array.isArray(doc?.alsoKnownAs) ? (doc.alsoKnownAs as unknown[]) : [];
		const entry = aka.find((u): u is string => typeof u === 'string' && u.startsWith('at://'));
		return entry ? entry.slice('at://'.length) : null;
	}

	function resolveDid(did: string) {
		if (did in resolvedHandles || pendingResolves.has(did)) return;
		if (failedAt[did] && Date.now() - failedAt[did] < RESOLVE_RETRY_MS) return;
		const p = (async () => {
			try {
				const handle = await fetchDidHandle(did);
				if (handle) resolvedHandles[did] = handle;
				else failedAt[did] = Date.now();
			} catch {
				failedAt[did] = Date.now();
			} finally {
				pendingResolves.delete(did);
			}
		})();
		pendingResolves.set(did, p);
	}

	// ── Lexicon resolution ─────────────────────────────────────────────────

	const lexiconCache = new Map<string, Lexicon | null>();
	const pendingLexicons = new Map<string, Promise<Lexicon | null>>();
	const LEXICON_BASES = [
		'https://raw.githubusercontent.com/bluesky-social/atproto/main/lexicons/',
		'https://raw.githubusercontent.com/bluesky-social/chat/main/lexicons/'
	];

	async function fetchLexicon(nsid: string): Promise<Lexicon | null> {
		if (lexiconCache.has(nsid)) return lexiconCache.get(nsid) ?? null;
		const existing = pendingLexicons.get(nsid);
		if (existing) return existing;
		const p = (async () => {
			const path = nsid.replace(/\./g, '/') + '.json';
			for (const base of LEXICON_BASES) {
				try {
					const r = await fetch(`${base}${path}`);
					if (!r.ok) continue;
					const lex: Lexicon = (await r.json()) as Lexicon;
					lexiconCache.set(nsid, lex);
					return lex;
				} catch {
					// try the next mirror
				}
			}
			lexiconCache.set(nsid, null);
			pendingLexicons.delete(nsid);
			return null;
		})();
		pendingLexicons.set(nsid, p);
		return p;
	}

	// ── Schema-driven field extraction ─────────────────────────────────────

	function isRefSchema(s: LexSchema | undefined): boolean {
		if (!s) return false;
		return (
			s.type === 'ref' ||
			s.type === 'union' ||
			(s.type === 'string' && !!s.format && REF_FORMATS.has(s.format))
		);
	}

	function unionLabel(typeName: unknown): string {
		const seg = typeof typeName === 'string' ? (typeName.split('.').pop() ?? '') : '';
		const map: Record<string, string> = {
			images: 'image',
			video: 'video',
			gallery: 'gallery',
			external: 'link',
			record: 'quote',
			recordWithMedia: 'quote',
			selfLabels: 'label'
		};
		return map[seg] ?? prettifyName(seg.replace(/s$/, ''));
	}

	function arrayUnionLabels(items: unknown[]): string[] {
		const out: string[] = [];
		for (const item of items) {
			if (!item || typeof item !== 'object') continue;
			const typeName = (item as { $type?: unknown }).$type;
			const frag = typeof typeName === 'string' ? typeName.split('#')[1] : null;
			const label = frag ? prettifyName(frag.replace(/Rule$/, '')) : 'item';
			if (!out.includes(label)) out.push(label);
		}
		return out;
	}

	function extractFields(
		rec: Record<string, unknown>,
		props: Record<string, LexSchema> | undefined,
		required: Set<string>
	): { content?: string; targets: Array<TargetInfo & { _priority?: number }>; metas: string[]; isReply: boolean } {
		const targets: Array<TargetInfo & { _priority?: number }> = [];
		const metas: string[] = [];
		let content: string | undefined;
		const isReply = !!(
			rec.reply &&
			typeof rec.reply === 'object' &&
			(rec.reply as { parent?: { uri?: unknown } }).parent?.uri
		);

		const addContent = (v: unknown) => {
			if (content) return;
			if (typeof v === 'string' && v.trim()) content = v.trim();
		};
		const addTarget = (v: unknown, name: string) => {
			const t = describeTarget(v);
			if (t) targets.push({ ...t, _priority: TARGET_PRIORITY[name] ?? 10 });
		};

		if (props) {
			for (const [name, schema] of Object.entries(props)) {
				if (TARGET_STOP.has(name)) continue;
				const val = rec[name];
				if (val == null) continue;
				if (isRefSchema(schema)) {
					const before = targets.length;
					addTarget(val, name);
					if (targets.length > before) continue;
					// ref/union that isn't an atproto reference (eg embeds) → fall through
				}
				if (schema.type === 'union' && typeof val === 'object' && val && (val as { $type?: unknown }).$type) {
					metas.push(unionLabel((val as { $type?: unknown }).$type));
					continue;
				}
				if (schema.type === 'blob' && val) {
					metas.push(schema.accept?.[0]?.split('/')[0] ?? 'media');
					continue;
				}
				if (schema.type === 'string') {
					if (schema.format === 'datetime') continue;
					if (schema.format && REF_FORMATS.has(schema.format)) {
						addTarget(val, name);
						continue;
					}
					if (required.has(name) || CONTENT_KEYS.includes(name)) addContent(val);
					continue;
				}
				if (schema.type === 'array' && Array.isArray(val)) {
					const itemsSchema = schema.items;
					if (itemsSchema?.type === 'union' || itemsSchema?.refs) {
						const labels = arrayUnionLabels(val);
						if (labels.length > 0) {
							metas.push(`${META_LABELS[name] ?? (prettifyName(name) || 'rules')}: ${labels.join(', ')}`);
						}
					} else if (!content && val.length > 0 && val.every((x) => typeof x === 'string')) {
						addContent(val.join(', '));
					}
					continue;
				}
			}
		}

		// Schema-less heuristics fill any remaining gaps.
		if (!content) {
			for (const key of CONTENT_KEYS) {
				addContent(rec[key]);
				if (content) break;
			}
			// Nested text (eg `body.text`, `message.text`, `content.text`).
			if (!content) {
				for (const key of ['message', 'content', 'body', 'caption', 'reply']) {
					const nested = rec[key];
					if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
						addContent((nested as { text?: unknown }).text);
						if (content) break;
					}
				}
			}
			// Numeric score-like values.
			if (!content) {
				for (const key of NUMERIC_CONTENT_KEYS) {
					const v = rec[key];
					if (typeof v === 'number') {
						content = String(v);
						break;
					}
				}
			}
		}
		if (targets.length === 0) {
			for (const key of [
				'list',
				'parent',
				'root',
				'subject',
				'subjectUri',
				'postUri',
				'parentUri',
				'communityUri',
				'slice',
				'badge',
				'issue',
				'pull',
				'repo',
				'poll',
				'give',
				'streamer',
				'space',
				'actor',
				'recipient',
				'id',
				'uri'
			]) {
				addTarget(rec[key], key);
				if (targets.length > 0) break;
			}
		}
		const embed = rec.embed;
		if (embed && typeof embed === 'object' && (embed as { $type?: unknown }).$type) {
			metas.push(unionLabel((embed as { $type?: unknown }).$type));
		}
		// Blob-like fields (avatar, poster, cover, …) → media metas.
		const blobMeta = (v: unknown): string | null => {
			if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
			const o = v as { $type?: unknown; mimeType?: unknown };
			if (o.$type !== 'blob') return null;
			const mime = typeof o.mimeType === 'string' ? o.mimeType : '';
			if (mime.startsWith('image/')) return 'image';
			if (mime.startsWith('video/')) return 'video';
			if (mime.startsWith('audio/')) return 'audio';
			return 'media';
		};
		for (const key of [
			'avatar',
			'banner',
			'icon',
			'poster',
			'heroImage',
			'cover',
			'coverImage',
			'spriteSheet',
			'image',
			'asset',
			'patchBlob',
			'background'
		]) {
			const label = blobMeta(rec[key]);
			if (label) metas.push(label);
		}

		targets.sort((a, b) => (a._priority ?? 10) - (b._priority ?? 10));
		for (const t of targets) delete t._priority;
		return { content, targets, metas, isReply };
	}

	function summarizeRecord(
		nsid: string,
		op: 'create' | 'update' | 'delete',
		record: Record<string, unknown> | undefined,
		lexicon: Lexicon | null
	): { description: string; target?: TargetInfo; tooltip?: string } {
		const deleted = op === 'delete';
		const noun = COLLECTION_LABELS[nsid] ?? prettifyName(nsid.split('.').pop() ?? nsid);
		const props = lexicon?.defs?.main?.record?.properties;
		const required = new Set(lexicon?.defs?.main?.record?.required ?? []);
		const { content, targets, metas, isReply } = extractFields(record ?? {}, props, required);

		let verb = deleted
			? (VERBS[nsid]?.delete ?? `deleted ${noun}`)
			: op === 'update'
				? (VERBS[nsid]?.update ?? `updated ${noun}`)
				: (VERBS[nsid]?.create ?? `created ${noun}`);
		if (isReply && !deleted) verb = 'replied';

		const target = targets[0];
		const uniqueMetas = [...new Set(metas)];
		const metaSuffix = uniqueMetas.length > 0 ? ` · ${uniqueMetas.join(' · ')}` : '';

		let description: string;
		if (deleted) {
			description = verb;
		} else if (isReply && content) {
			description = `replied: ${content}`;
		} else if (nsid === 'app.bsky.feed.post' && content) {
			description = content;
		} else {
			description = `${verb}${content ? `: ${content}` : ''}`;
		}
		description += metaSuffix;

		const tooltip = target?.uri ?? (content ? content : undefined);
		return { description, target, tooltip };
	}

	/**
	 * Build a human-readable description for an event. Fully dynamic: the verb
	 * comes from the operation + collection vocabulary, while content, target and
	 * meta come from the collection's Lexicon schema when available (fetched and
	 * cached on demand) and from field heuristics otherwise. Never falls back to
	 * raw JSON.
	 */
	function buildDescription(event: JetstreamEvent): {
		description: string;
		tooltip?: string;
		target?: TargetInfo;
	} {
		if (event.type === 'identity' && event.identity) {
			return { description: `handle → ${event.identity.handle}` };
		}
		if (event.type === 'account' && event.account) {
			return event.account.active
				? { description: 'account activated' }
				: { description: `account ${event.account.status}` };
		}
		const commit = event.commit;
		if (!commit) return { description: '' };
		const op: 'create' | 'update' | 'delete' =
			commit.type === 'd' ? 'delete' : commit.type === 'u' ? 'update' : 'create';
		const lexicon = lexiconCache.get(commit.collection ?? '') ?? null;
		return summarizeRecord(
			commit.collection ?? '',
			op,
			commit.record as Record<string, unknown> | undefined,
			lexicon
		);
	}

	function relativeTime(date: Date, nowMs: number): string {
		const diff = Math.max(0, nowMs - date.getTime());
		if (diff < 1000) return 'now';
		const s = Math.floor(diff / 1000);
		if (s < 60) return `${s}s`;
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h`;
		return `${Math.floor(h / 24)}d`;
	}

	function handleEvent(event: JetstreamEvent) {
		let op: FeedEntry['op'] = 'c';
		if (event.type === 'identity') op = 'i';
		else if (event.type === 'account') op = 'a';
		else if (event.commit?.type === 'u') op = 'u';
		else if (event.commit?.type === 'd') op = 'd';

		const nsid = event.commit?.collection ?? event.type;
		const { description, tooltip, target } = buildDescription(event);
		if (target?.did) resolveDid(target.did);
		const commitNsid = event.commit?.collection;
		const entry: FeedEntry = {
			id: `${event.time_us}-${Math.random().toString(36).slice(2, 8)}`,
			time: new Date(event.time_us / 1000),
			op,
			collection: commitNsid ? `${lexiconDomain(commitNsid)}/${shortenCollection(commitNsid)}` : event.type,
			collectionColor: nsidColor(nsid),
			description,
			target,
			tooltip,
			_nsid: commitNsid,
			_record: event.commit?.record as Record<string, unknown> | undefined,
			_op: event.commit?.type === 'd' ? 'delete' : event.commit?.type === 'u' ? 'update' : 'create'
		};
		entries = [entry, ...entries].slice(0, maxEntries);
		if (commitNsid && !lexiconCache.has(commitNsid)) void refineEntry(entry);
	}

	/** Re-format an entry once its collection's Lexicon has been fetched. */
	async function refineEntry(entry: FeedEntry) {
		const nsid = entry._nsid;
		if (!nsid) return;
		const lexicon = await fetchLexicon(nsid);
		if (!lexicon) return;
		const idx = entries.findIndex((e) => e.id === entry.id);
		if (idx === -1) return;
		const { description, tooltip, target } = summarizeRecord(nsid, entry._op ?? 'create', entry._record, lexicon);
		if (target?.did) resolveDid(target.did);
		entries[idx] = { ...entries[idx], description, tooltip, target };
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
		ticker = setInterval(() => {
			now = Date.now();
		}, 1000);
		const dids = await fetchAccountDids();
		if (dids.length > 0) {
			connect(dids);
		}
	});

	onDestroy(() => {
		mounted = false;
		if (reconnectTimer) clearTimeout(reconnectTimer);
		if (ticker) clearInterval(ticker);
		ws?.close();
	});
</script>

<div class="pds-jetstream">
	<div class="pds-jetstream-header">
		<span class="pds-jetstream-status {connectionState}">
			<span class="pds-jetstream-dot" aria-hidden="true"></span>
			{connectionState}
		</span>
		{#if connectionState === 'connected'}
			<span class="pds-jetstream-hint">
				streaming{accountCount > 0 ? ` ${accountCount} account${accountCount > 1 ? 's' : ''}` : ''}
				{#if entries.length > 0} · {entries.length} event{entries.length > 1 ? 's' : ''}{/if}
			</span>
		{/if}
		<button type="button" class="pds-jetstream-refresh" onclick={refresh} disabled={refreshing || connectionState === 'connecting'} aria-label="Reload recent activity">
			{refreshing ? 'refreshing…' : 'refresh'}
		</button>
	</div>

	{#if entries.length > 0}
		<div class="pds-jetstream-feed" role="log" aria-live="polite">
			{#each entries as entry (entry.id)}
				<div class="pds-jetstream-entry op-{entry.op}" title={entry.tooltip}>
					<span class="pds-jetstream-time" title={entry.time.toLocaleString()}>
						{relativeTime(entry.time, now)}
					</span>
					<span class="pds-jetstream-badge" aria-label={OP_LABELS[entry.op]}>
						{entry.op === 'c' ? '+' : entry.op === 'd' ? '−' : entry.op === 'u' ? '∼' : entry.op === 'i' ? '→' : '▲'}
					</span>
					<span class="pds-jetstream-collection" style="--nsid-color: {entry.collectionColor}">
						{entry.collection}
					</span>
					<span class="pds-jetstream-desc">{entry.description}{entry.target ? ' ' + targetDisplay(entry.target) : ''}</span>
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
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.72em;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.pds-jetstream-dot {
		width: 0.45em;
		height: 0.45em;
		border-radius: 50%;
		background: currentColor;
	}

	.pds-jetstream-status.connecting {
		color: var(--pds-color-yellow);
	}

	.pds-jetstream-status.connected {
		color: var(--pds-color-green);
	}

	.pds-jetstream-status.connected .pds-jetstream-dot {
		animation: pds-jetstream-blink 2s ease-in-out infinite;
	}

	.pds-jetstream-status.disconnected {
		color: var(--pds-color-red);
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
		padding: 0;
		border: none;
		background: none;
		color: var(--pds-color-green);
		opacity: 0.6;
		cursor: pointer;
		margin-left: auto;
	}

	.pds-jetstream-refresh:hover:not(:disabled) {
		opacity: 1;
	}

	.pds-jetstream-refresh:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.pds-jetstream-feed {
		max-height: 300px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		padding-right: 0.3rem;
	}

	.pds-jetstream-entry {
		display: grid;
		grid-template-columns: 3.2em auto max-content 1fr;
		gap: 0.55rem;
		align-items: center;
		padding: 0.25rem 0.3rem;
		border-radius: 0.2rem;
		animation: pds-jetstream-fade-in 0.3s ease-out;
	}

	.pds-jetstream-entry:hover {
		background-color: color-mix(in srgb, var(--pds-color-surface-0) 30%, transparent);
	}

	.pds-jetstream-time {
		color: var(--pds-color-green);
		opacity: 0.4;
		font-size: 0.85em;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.pds-jetstream-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.15em;
		height: 1.15em;
		font-weight: 700;
		font-size: 0.95em;
		opacity: 0.9;
	}

	.pds-jetstream-entry.op-c .pds-jetstream-badge {
		color: var(--pds-color-green);
	}

	.pds-jetstream-entry.op-u .pds-jetstream-badge {
		color: var(--pds-color-yellow);
	}

	.pds-jetstream-entry.op-d .pds-jetstream-badge {
		color: var(--pds-color-red);
	}

	.pds-jetstream-entry.op-i .pds-jetstream-badge,
	.pds-jetstream-entry.op-a .pds-jetstream-badge {
		color: var(--pds-color-subtext-0);
	}

	.pds-jetstream-collection {
		white-space: nowrap;
		font-size: 0.88em;
		opacity: 0.8;
		color: var(--nsid-color);
	}

	.pds-jetstream-desc {
		color: var(--pds-color-text);
		opacity: 0.8;
		min-width: 0;
		overflow-wrap: anywhere;
		word-break: break-word;
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

	@keyframes pds-jetstream-blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.25;
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
			grid-template-columns: 3.2em auto 1fr;
			gap: 0.4rem;
		}

		.pds-jetstream-collection {
			grid-column: 3;
			justify-self: start;
		}

		.pds-jetstream-desc {
			grid-column: 1 / -1;
			padding-left: 3.2em;
		}
	}
</style>
