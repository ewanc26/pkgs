import { fetchJSON } from './utils.js';

// ─── types ────────────────────────────────────────────────────────────────────

export type StatusClass = 'ok' | 'err' | 'warn' | 'loading' | '';

export interface KvRow {
	key: string;
	text: string;
	cls: StatusClass;
}

interface HealthResponse {
	version?: string;
}

interface ServerDescription {
	did?: string;
	inviteCodeRequired?: boolean;
	phoneVerificationRequired?: boolean;
	availableUserDomains?: string[];
	links?: { privacyPolicy?: string; termsOfService?: string };
	contact?: { email?: string };
}

interface RepoPage {
	repos?: unknown[];
	cursor?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const LOADING: KvRow = { key: '', text: '…', cls: 'loading' };
const blank = (key: string): KvRow => ({ key, text: '—', cls: '' });

// ─── reactive state class (Svelte 5 runes) ────────────────────────────────────

class PdsStatus {
	reachable = $state<KvRow>({ ...LOADING, key: 'reachable' });
	version = $state<KvRow>({ ...LOADING, key: 'version' });
	did = $state<KvRow>({ ...LOADING, key: 'did' });
	accounts = $state<KvRow>({ ...LOADING, key: 'accounts' });
	invite = $state<KvRow>({ ...LOADING, key: 'invite required' });
	phone = $state<KvRow | null>(null);
	domains = $state<KvRow | null>(null);

	extraLinks = $state<Array<{ href: string; label: string }>>([]);
	contactEmail = $state<string | null>(null);

	/** Ordered rows for the kv-grid — optional rows are filtered out automatically. */
	get kvRows(): KvRow[] {
		return [
			this.reachable,
			this.version,
			this.did,
			this.accounts,
			this.invite,
			...(this.phone ? [this.phone] : []),
			...(this.domains ? [this.domains] : [])
		];
	}

	async load(): Promise<void> {
		// ── health ──────────────────────────────────────────────────────────────
		try {
			const h = await fetchJSON<HealthResponse>('/xrpc/_health');
			this.reachable = { key: 'reachable', text: '✓ online', cls: 'ok' };
			this.version = { key: 'version', text: h.version ?? 'unknown', cls: '' };
		} catch {
			this.reachable = { key: 'reachable', text: '✗ unreachable', cls: 'err' };
			this.version = { key: 'version', text: '—', cls: 'err' };
		}

		// ── server description ──────────────────────────────────────────────────
		try {
			const d = await fetchJSON<ServerDescription>(
				'/xrpc/com.atproto.server.describeServer'
			);

			this.did = { key: 'did', text: d.did ?? '—', cls: '' };
			this.invite = {
				key: 'invite required',
				text: d.inviteCodeRequired ? 'yes' : 'no',
				cls: d.inviteCodeRequired ? 'warn' : 'ok'
			};

			if (typeof d.phoneVerificationRequired === 'boolean') {
				this.phone = {
					key: 'phone verify',
					text: d.phoneVerificationRequired ? 'yes' : 'no',
					cls: d.phoneVerificationRequired ? 'warn' : 'ok'
				};
			}

			if (d.availableUserDomains?.length) {
				this.domains = {
					key: 'user domains',
					text: d.availableUserDomains.join(', '),
					cls: ''
				};
			}

			const linkKeys: [keyof NonNullable<ServerDescription['links']>, string][] = [
				['privacyPolicy', 'Privacy Policy'],
				['termsOfService', 'Terms of Service']
			];
			for (const [k, label] of linkKeys) {
				const href = d.links?.[k];
				if (href) this.extraLinks = [...this.extraLinks, { href, label }];
			}

			if (d.contact?.email) this.contactEmail = d.contact.email;
		} catch {
			this.did = blank('did');
			this.invite = blank('invite required');
		}

		// ── account count (paginated) ───────────────────────────────────────────
		try {
			let cursor: string | undefined;
			let total = 0;
			do {
				const url =
					'/xrpc/com.atproto.sync.listRepos?limit=1000' +
					(cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
				const r = await fetchJSON<RepoPage>(url);
				total += (r.repos ?? []).length;
				cursor = r.cursor;
			} while (cursor);
			this.accounts = { key: 'accounts', text: total.toString(), cls: '' };
		} catch {
			this.accounts = blank('accounts');
		}
	}
}

export const pdsStatus = new PdsStatus();
