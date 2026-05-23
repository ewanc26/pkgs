<script lang="ts">
	import { onMount } from "svelte";
	import { projects } from "$lib/data/projects";
	import { RefreshCw, Users, MessageSquare, Activity } from "@lucide/svelte";

	interface LinkStats {
		records: number;
		distinct_dids: number;
	}

	interface ProjectStats {
		totalMentions: number;
		uniqueUsers: number;
	}

	let loading = $state(true);
	let error = $state("");
	let globalStats = $state({ totalMentions: 0, uniqueUsers: 0 });
	let projectBreakdown = $state<Record<string, ProjectStats>>({});

	async function fetchStats() {
		loading = true;
		error = "";
		let totalMentions = 0;
		let aggregateUniqueUsers = 0;

		try {
			const results = await Promise.all(
				projects.map(async (p) => {
					// We use /links/all to get a comprehensive breakdown of how people link to the project
					const res = await fetch(
						`https://constellation.microcosm.blue/links/all?target=${encodeURIComponent(p.url)}`,
					);
					if (!res.ok)
						throw new Error(`Failed to fetch stats for ${p.name}`);
					const data = await res.json();
					return { slug: p.slug, data };
				}),
			);

			const breakdown: Record<string, ProjectStats> = {};

			for (const { slug, data } of results) {
				let pMentions = 0;
				let pUsers = 0;

				// We focus on Bluesky posts as the primary "usage" signal indexed by Constellation
				if (data.links && data.links["app.bsky.feed.post"]) {
					const postLinks = data.links["app.bsky.feed.post"];
					for (const path in postLinks) {
						const stats = postLinks[path] as LinkStats;
						pMentions += stats.records;
						// Taking the max across paths (facets vs embed) as a proxy for unique users for this project
						pUsers = Math.max(pUsers, stats.distinct_dids);
					}
				}

				breakdown[slug] = {
					totalMentions: pMentions,
					uniqueUsers: pUsers,
				};
				totalMentions += pMentions;
				aggregateUniqueUsers += pUsers;
			}

			projectBreakdown = breakdown;
			globalStats = { totalMentions, uniqueUsers: aggregateUniqueUsers };
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchStats();
	});
</script>

<div class="stats-card">
	<div class="card-header">
		<div class="title-group">
			<Activity size={14} class="activity-icon" />
			<span class="label">LIVE NETWORK ACTIVITY</span>
		</div>
		<button
			class="refresh-btn"
			onclick={fetchStats}
			disabled={loading}
			title="Refresh stats"
		>
			<RefreshCw size={12} class={loading ? "spin" : ""} />
		</button>
	</div>

	{#if error}
		<div class="error">
			<p>Failed to load network stats.</p>
			<button onclick={fetchStats} class="retry-btn">Try again</button>
		</div>
	{:else if loading && globalStats.totalMentions === 0}
		<div class="loading-state">
			<div class="loading-bar">
				<div class="loading-fill"></div>
			</div>
			<span>Querying Constellation backlink index...</span>
		</div>
	{:else}
		<div class="stats-grid">
			<div class="stat-item">
				<div class="stat-value">{globalStats.totalMentions}</div>
				<div class="stat-label">
					<MessageSquare size={12} />
					Total Mentions
				</div>
			</div>
			<div class="stat-item">
				<div class="stat-value highlight">
					{globalStats.uniqueUsers}
				</div>
				<div class="stat-label">
					<Users size={12} />
					Unique Users
				</div>
			</div>
		</div>

		<div class="breakdown">
			{#each projects as project}
				{@const stats = projectBreakdown[project.slug]}
				{#if stats && stats.totalMentions > 0}
					<div class="breakdown-item">
						<div class="project-info">
							<div
								class="project-logo-box"
								style="--project-accent: {project.accent}"
							>
								<img
									src={project.logo}
									alt={project.name}
									width="14"
									height="14"
								/>
							</div>
							<span>{project.name}</span>
						</div>
						<div class="project-stats">
							<span
								class="count"
								title="Total posts linking to this tool"
								>{stats.totalMentions}</span
							>
							<span class="sep">/</span>
							<span
								class="count highlight"
								title="Unique identities using this tool"
								>{stats.uniqueUsers}</span
							>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	<div class="footer">
		Indexed by <a
			href="https://constellation.microcosm.blue"
			target="_blank"
			rel="noopener">Constellation</a
		>
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
		margin-bottom: 1.75rem;
	}

	.title-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--muted);
	}

	.label {
		font-family: "JetBrains Mono", monospace;
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

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.stat-item {
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-value {
		font-size: 2.25rem;
		font-weight: 700;
		color: #fafaf9;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.02em;
	}

	.stat-value.highlight {
		color: #4ade80;
	}

	.stat-label {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		font-weight: 500;
	}

	.breakdown {
		border-top: 1px solid var(--border);
		padding-top: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.breakdown-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.project-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: #fafaf9;
		font-size: 0.85rem;
		font-weight: 500;
	}

	.project-logo-box {
		width: 24px;
		height: 24px;
		border-radius: 6px;
		background: color-mix(in srgb, var(--project-accent) 15%, #1c1917);
		border: 1px solid
			color-mix(in srgb, var(--project-accent) 30%, transparent);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.project-stats {
		font-family: "JetBrains Mono", monospace;
		font-size: 0.8rem;
		color: var(--muted);
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.count {
		font-variant-numeric: tabular-nums;
	}

	.count.highlight {
		color: #4ade80;
	}

	.sep {
		opacity: 0.2;
	}

	.footer {
		margin-top: 1.5rem;
		font-size: 0.6rem;
		color: var(--muted);
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.footer a {
		color: #fafaf9;
		text-decoration: underline;
		text-underline-offset: 2px;
		text-decoration-color: var(--border);
	}

	.footer a:hover {
		color: #4ade80;
		text-decoration-color: #4ade80;
	}

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

	:global(.activity-icon) {
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
