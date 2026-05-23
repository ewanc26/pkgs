<script lang="ts">
	import { onMount } from 'svelte';
	import { RefreshCw, BarChart3 } from '@lucide/svelte';

	// Resolve the operator's identity at runtime — no env var needed.
	const OPERATOR = 'ewancroft.uk';

	interface ToolRecord {
		$type: string;
		recordsImported?: number;
		postsImported?: number;
		documentsConverted?: number;
		scrobblesAnalyzed?: number;
		sharedToBluesky?: boolean;
		mode?: string;
	}

	interface ToolkitRecord {
		tool: ToolRecord;
		createdAt: string;
		context?: string;
	}

	interface ToolStats {
		type: string;
		slug: string;
		name: string;
		accent: string;
		count: number;
		total: number;
		metricLabel: string;
		// malachite-specific: breakdown of import modes
		modes?: Record<string, number>;
		// tourmaline-specific
		sharedCount?: number;
	}

	const TOOL_META: Record<string, { slug: string; name: string; accent: string; metricLabel: string }> = {
		'click.croft.tools.malachite': { slug: 'malachite', name: 'Malachite', accent: '#3fb968', metricLabel: 'records imported' },
		'click.croft.tools.jasper':    { slug: 'jasper',    name: 'Jasper',    accent: '#fb923c', metricLabel: 'photos imported'   },
		'click.croft.tools.bismuth':   { slug: 'bismuth',   name: 'Bismuth',   accent: '#c4b5fd', metricLabel: 'docs converted'    },
		'click.croft.tools.opal':      { slug: 'opal',      name: 'Opal',      accent: '#a7f3d0', metricLabel: 'posts imported'    },
		'click.croft.tools.tourmaline':{ slug: 'tourmaline',name: 'Tourmaline',accent: '#4ade80', metricLabel: 'scrobbles analysed'},
	};

	let { toolStats = $bindable([]) } = $props<{ toolStats?: any[] }>();

	let loading = $state(true);
	let error = $state('');
	let totalRecords = $state(0);

	async function fetchStats() {
		loading = true;
		error = '';
		try {
			// Resolve handle → DID + PDS in one round-trip via slingshot.
			const miniDoc = await fetch(
				`https://slingshot.microcosm.blue/xrpc/com.bad-example.identity.resolveMiniDoc?identifier=${encodeURIComponent(OPERATOR)}`
			).then((r) => {
				if (!r.ok) throw new Error(`Identity resolution failed: ${r.status}`);
				return r.json() as Promise<{ did?: string; pds?: string }>;
			});

			if (!miniDoc.did || !miniDoc.pds) throw new Error('Incomplete identity document from slingshot');

			const { did, pds } = miniDoc;

			// Paginate through all toolkit use records.
			const records: ToolkitRecord[] = [];
			let cursor: string | undefined;

			do {
				const params = new URLSearchParams({
					repo: did,
					collection: 'click.croft.toolkit.use',
					limit: '100',
				});
				if (cursor) params.set('cursor', cursor);

				const page = await fetch(`${pds}/xrpc/com.atproto.repo.listRecords?${params}`).then((r) => {
					if (!r.ok) throw new Error(`PDS returned ${r.status}`);
					return r.json() as Promise<{ records: Array<{ value: ToolkitRecord }>; cursor?: string }>;
				});

				records.push(...page.records.map((r) => r.value));
				cursor = page.cursor;
			} while (cursor);

			totalRecords = records.length;

			// Aggregate by $type.
			const agg = new Map<string, { count: number; total: number; modes: Record<string, number>; shared: number }>();

			for (const r of records) {
				const type = r.tool.$type;
				const slot = agg.get(type) ?? { count: 0, total: 0, modes: {}, shared: 0 };

				slot.count++;
				slot.total +=
					r.tool.recordsImported ??
					r.tool.postsImported ??
					r.tool.documentsConverted ??
					r.tool.scrobblesAnalyzed ??
					0;

				if (r.tool.mode) {
					slot.modes[r.tool.mode] = (slot.modes[r.tool.mode] ?? 0) + 1;
				}
				if (r.tool.sharedToBluesky) slot.shared++;

				agg.set(type, slot);
			}

			toolStats = [...agg.entries()]
				.map(([type, s]) => {
					const meta = TOOL_META[type];
					return {
						type,
						slug: meta?.slug ?? 'unknown',
						name: meta?.name ?? type.split('.').pop() ?? type,
						accent: meta?.accent ?? '#6b7280',
						count: s.count,
						total: s.total,
						metricLabel: meta?.metricLabel ?? 'uses',
						modes: Object.keys(s.modes).length ? s.modes : undefined,
						sharedCount: s.shared > 0 ? s.shared : undefined,
					};
				})
				.sort((a, b) => b.count - a.count);
			} catch (e: unknown) {			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	onMount(fetchStats);
</script>

<div class="stats-card">
	<div class="card-header">
		<div class="title-group">
			<BarChart3 size={14} class="header-icon" />
			<span class="label">TOOLKIT USAGE</span>
		</div>
		<button class="refresh-btn" onclick={fetchStats} disabled={loading} title="Refresh">
			<RefreshCw size={12} class={loading ? 'spin' : ''} />
		</button>
	</div>

	{#if error}
		<div class="error">
			<p>Failed to load usage stats.</p>
			<button onclick={fetchStats} class="retry-btn">Try again</button>
		</div>
	{:else if loading && totalRecords === 0}
		<div class="loading-state">
			<div class="loading-bar">
				<div class="loading-fill"></div>
			</div>
			<span>Fetching records from PDS…</span>
		</div>
	{:else if totalRecords === 0}
		<div class="empty-state">
			<p>No toolkit usage records yet.</p>
		</div>
	{:else}
		<div class="total-row">
			<span class="total-count">{totalRecords.toLocaleString()}</span>
			<span class="total-label">usage records</span>
		</div>

		<div class="breakdown">
			{#each toolStats as tool}
				<div class="breakdown-item">
					<div class="tool-info">
						<div class="tool-logo-box" style="--tool-accent: {tool.accent}">
							<img src="/{tool.slug}.svg" alt={tool.name} width="14" height="14" />
						</div>
						<div class="tool-detail">
							<span class="tool-name">{tool.name}</span>
							{#if tool.total > 0}
								<span class="tool-metric">{tool.total.toLocaleString()} {tool.metricLabel}</span>
							{/if}
							{#if tool.modes}
								<div class="mode-row">
									{#each Object.entries(tool.modes).sort(([, a], [, b]) => b - a) as [mode, n]}
										<span class="mode-chip">{mode} ×{n}</span>
									{/each}
								</div>
							{/if}
							{#if tool.sharedCount}
								<span class="tool-metric">{tool.sharedCount} shared to Bluesky</span>
							{/if}
						</div>
					</div>
					<div class="session-col">
						<span class="session-count">{tool.count}</span>
						<span class="session-label">sessions</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}


</div>

<style>
	.stats-card {
		width: 100%;
		max-width: 26rem;
		background: #0c0a09;
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 1.25rem 1.5rem;
		margin: 0 auto 3rem;
		box-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.5);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.75rem;
	}

	.title-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--muted);
	}

	.header-icon {
		color: #4ade80;
	}

	.label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 500;
		letter-spacing: 0.18em;
	}

	.refresh-btn {
		background: none;
		border: none;
		color: var(--muted);
		cursor: pointer;
		padding: 6px;
		border-radius: 6px;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.refresh-btn:hover:not(:disabled) {
		color: #fafaf9;
		background: var(--surface);
	}

	.refresh-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	/* ── Total ── */

	.total-row {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 1.75rem;
	}

	.total-count {
		font-size: 2.25rem;
		font-weight: 700;
		color: #4ade80;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.02em;
	}

	.total-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
	}

	/* ── Breakdown ── */

	.breakdown {
		border-top: 1px solid var(--border);
		padding-top: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.breakdown-item {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.tool-info {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		min-width: 0;
	}

	.tool-logo-box {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		border-radius: 6px;
		background: color-mix(in srgb, var(--tool-accent) 15%, #1c1917);
		border: 1px solid color-mix(in srgb, var(--tool-accent) 30%, transparent);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 1px;
	}

	.tool-detail {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}

	.tool-name {
		font-size: 0.85rem;
		font-weight: 500;
		color: #fafaf9;
	}

	.tool-metric {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	.mode-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-top: 0.1rem;
	}

	.mode-chip {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem;
		color: var(--muted);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 1px 5px;
		white-space: nowrap;
	}

	/* ── Session count (right column) ── */

	.session-col {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.1rem;
	}

	.session-count {
		font-family: 'JetBrains Mono', monospace;
		font-size: 1rem;
		font-weight: 600;
		color: #fafaf9;
		font-variant-numeric: tabular-nums;
	}

	.session-label {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
	}

	/* ── States ── */

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		padding: 2.5rem 0;
		color: var(--muted);
		font-size: 0.8rem;
	}

	.loading-bar {
		width: 100%;
		height: 2px;
		background: var(--surface);
		border-radius: 1px;
		overflow: hidden;
	}

	.loading-fill {
		width: 30%;
		height: 100%;
		background: #4ade80;
		animation: loading-slide 1.5s infinite ease-in-out;
	}

	@keyframes loading-slide {
		0%   { transform: translateX(-100%); }
		100% { transform: translateX(333%); }
	}

	.empty-state {
		padding: 2rem 0;
		text-align: center;
		color: var(--muted);
		font-size: 0.85rem;
	}

	.error {
		color: #f87171;
		font-size: 0.85rem;
		text-align: center;
		padding: 1.5rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: center;
	}

	.retry-btn {
		background: var(--surface);
		border: 1px solid var(--border);
		color: #fafaf9;
		padding: 4px 12px;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.retry-btn:hover {
		background: var(--surface-2);
		border-color: var(--muted);
	}

	:global(.header-icon) {
		color: #4ade80;
	}

	:global(.spin) {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}
</style>
