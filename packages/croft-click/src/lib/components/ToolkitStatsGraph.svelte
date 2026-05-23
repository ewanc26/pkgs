<script lang="ts">
	import { BarChart3 } from '@lucide/svelte';

	interface ToolStats {
		name: string;
		accent: string;
		count: number;
	}

	let { stats } = $props<{ stats: ToolStats[] }>();

	const max = Math.max(...stats.map((s) => s.count), 1);
</script>

<div class="stats-card">
	<div class="card-header">
		<div class="title-group">
			<BarChart3 size={14} class="header-icon" />
			<span class="label">TOOL ACTIVITY</span>
		</div>
	</div>

	<div class="chart">
		{#each stats as tool}
			<div class="bar-row">
				<span class="tool-name">{tool.name}</span>
				<div class="bar-track">
					<div 
						class="bar-fill" 
						style="width: {(tool.count / max) * 100}%; background: {tool.accent}"
					></div>
				</div>
				<span class="count">{tool.count}</span>
			</div>
		{/each}
	</div>
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
		margin-bottom: 1.25rem;
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

	.chart {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.bar-row {
		display: grid;
		grid-template-columns: 80px 1fr 30px;
		align-items: center;
		gap: 0.75rem;
	}

	.tool-name {
		font-size: 0.75rem;
		color: #a8a29e;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bar-track {
		height: 8px;
		background: var(--surface);
		border-radius: 4px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.5s ease-out;
	}

	.count {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		color: #fafaf9;
		text-align: right;
	}
</style>
