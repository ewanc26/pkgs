<script lang="ts">
	import { onMount } from 'svelte';
	import type { ListeningPhase } from '$lib/analysis/phases';

	let { phases = [] }: { phases: ListeningPhase[] } = $props();

	let revealed = $state(false);
	let containerEl: HTMLDivElement;

	// Genre → colour mapping for phase badges
	const GENRE_COLOURS: Record<string, string> = {
		Metal: 'text-red-400',
		Rock: 'text-orange-400',
		Pop: 'text-pink-400',
		Electronic: 'text-blue-400',
		'Hip Hop': 'text-yellow-400',
		Jazz: 'text-amber-400',
		Classical: 'text-purple-400',
		Folk: 'text-green-400',
		Country: 'text-amber-500',
		'R&B': 'text-violet-400',
		Blues: 'text-blue-500',
		Reggae: 'text-lime-400',
		Latin: 'text-rose-400',
		World: 'text-teal-400',
		Soundtrack: 'text-sky-400',
		'New Age': 'text-cyan-400',
		Punk: 'text-red-500',
		'Singer-Songwriter': 'text-indigo-400'
	};

	function formatMonth(ym: string): string {
		const [y, m] = ym.split('-');
		return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GB', {
			month: 'short',
			year: '2-digit'
		});
	}

	onMount(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					revealed = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.1 }
		);
		observer.observe(containerEl);
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={containerEl}
	class="scroll-reveal rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6"
	class:revealed
>
	<h2 class="mb-1 text-base font-semibold sm:text-lg">Listening Phases</h2>
	<p class="mb-4 text-xs text-[var(--text-dim)]">How your dominant genre shifted across time</p>

	{#if phases.length === 0}
		<p class="text-sm text-[var(--text-dim)]">Not enough genre data to detect phases yet.</p>
	{:else}
		<div class="relative space-y-0 pl-6">
			<!-- Vertical connector line -->
			<div class="absolute left-2.5 top-2 bottom-2 w-px bg-[var(--border)]"></div>

			{#each phases as phase, i (phase.startMonth)}
				<div
					class="stagger-item relative pb-4 last:pb-0"
					class:stagger-visible={revealed}
					style="transition-delay:{revealed ? i * 80 : 0}ms"
				>
					<!-- Phase dot -->
					<div class="absolute -left-3.5 top-1.5 h-3 w-3 rounded-full border-2 border-[var(--accent)] bg-[var(--bg)]"></div>

					<!-- Phase card -->
					<div class="rounded border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3">
						<div class="mb-2 flex items-center gap-2">
							<span class="text-sm font-semibold text-[var(--text)]">{phase.label}</span>
							<span class="text-xs text-[var(--text-dim)]">
								{formatMonth(phase.startMonth)} – {formatMonth(phase.endMonth)}
							</span>
						</div>

						<div class="mb-2 flex items-center gap-2">
							<span class="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 text-xs font-medium {GENRE_COLOURS[phase.dominantGenre] ?? 'text-[var(--text-muted)]'}">
								{phase.dominantGenre}
							</span>
							<span class="text-xs text-[var(--text-dim)]">{phase.dominantMood}</span>
							<span class="ml-auto font-mono text-xs text-[var(--text-muted)]">{phase.scrobbleCount.toLocaleString()}</span>
						</div>

						{#if phase.topArtists.length > 0}
							<p class="text-xs text-[var(--text-dim)]">
								{phase.topArtists.map((a) => a.name).join(' · ')}
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.scroll-reveal {
		opacity: 0;
		transform: translateY(24px);
		transition: opacity 0.5s ease, transform 0.5s ease;
	}
	.scroll-reveal.revealed {
		opacity: 1;
		transform: translateY(0);
	}

	.stagger-item {
		opacity: 0;
		transform: translateY(8px);
		transition: opacity 0.4s ease, transform 0.4s ease;
	}
	.stagger-item.stagger-visible {
		opacity: 1;
		transform: translateY(0);
	}
</style>
