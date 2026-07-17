<script lang="ts">
	import { onMount } from 'svelte';
	import { RefreshCw, BarChart3 } from '@lucide/svelte';
	import type { ToolkitUsageSummary, ToolStats } from '$lib/toolkit-usage';

	let loading = $state(true);
	let error = $state('');
	let totalRecords = $state(0);
	let totalRepositories = $state(0);
	let partial = $state(false);
	let toolStats = $state<ToolStats[]>([]);

	async function fetchStats() {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/toolkit-usage');
			if (!response.ok)
				throw new Error(`Usage API returned ${response.status}`);
			const summary = (await response.json()) as ToolkitUsageSummary;
			totalRecords = summary.totalRecords;
			totalRepositories = summary.totalRepositories;
			partial = summary.partial;
			toolStats = summary.toolStats;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	onMount(fetchStats);
</script>

<div class="stats-card">
	<div class="card-header">
		<div class="title-group">
			<BarChart3 size={14} color="#4ade80" />
			<span class="label">TOOLKIT USAGE</span>
		</div>
		<button
			class="refresh-btn"
			onclick={fetchStats}
			disabled={loading}
			title="Refresh"
		>
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
			<span class="total-label">
				usage records across {totalRepositories.toLocaleString()}
				{totalRepositories === 1 ? 'repository' : 'repositories'}
				{#if partial}
					· partial index{/if}
			</span>
		</div>

		<div class="breakdown">
			{#each toolStats as tool}
				<div class="breakdown-item">
					<div class="tool-info">
						<div class="tool-logo-box" style="--tool-accent: {tool.accent}">
							<img
								src="/{tool.slug}.svg"
								alt={tool.name}
								width="14"
								height="14"
							/>
						</div>
						<div class="tool-detail">
							<span class="tool-name">{tool.name}</span>
							{#if tool.total > 0}
								<span class="tool-metric"
									>{tool.total.toLocaleString()} {tool.metricLabel}</span
								>
							{/if}
							{#if tool.modes}
								<div class="mode-row">
									{#each Object.entries(tool.modes).sort(([, a], [, b]) => b - a) as [mode, n]}
										<span class="mode-chip">{mode} ×{n}</span>
									{/each}
								</div>
							{/if}
							{#if tool.sharedCount}
								<span class="tool-metric"
									>{tool.sharedCount} shared to Bluesky</span
								>
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
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(333%);
		}
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
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
