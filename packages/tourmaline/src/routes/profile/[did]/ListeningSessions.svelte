<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Train, Flame, Coffee, Scale } from '@lucide/svelte';
	import type { SessionStats, SessionPattern } from '$lib/analysis/sessions';

	let { stats }: { stats: SessionStats } = $props();

	let revealed = $state(false);
	let containerEl: HTMLDivElement;

	const PATTERN_META: Record<SessionPattern, { label: string; icon: typeof Moon; colour: string; detail: string }> = {
		'night-owl': { label: 'Night Owl', icon: Moon, colour: 'text-indigo-400', detail: 'Most sessions start after 10pm' },
		commuter: { label: 'Commuter', icon: Train, colour: 'text-blue-400', detail: 'Peak sessions during travel hours' },
		marathon: { label: 'Marathon Runner', icon: Flame, colour: 'text-orange-400', detail: 'Extended listening sessions, 2+ hours' },
		snack: { label: 'Snack Listener', icon: Coffee, colour: 'text-yellow-400', detail: 'Quick bursts — 3 scrobbles or fewer' },
		balanced: { label: 'Balanced', icon: Scale, colour: 'text-[var(--accent)]', detail: 'No dominant pattern — varied listening' }
	};

	onMount(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					revealed = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.15 }
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
	<h2 class="mb-1 text-base font-semibold sm:text-lg">Listening Sessions</h2>
	<p class="mb-4 text-xs text-[var(--text-dim)]">How your listening breaks into sessions — gaps of 30+ minutes start a new one</p>

	{#if stats.totalSessions === 0}
		<p class="text-sm text-[var(--text-dim)]">Not enough data to detect sessions.</p>
	{:else}
		{@const meta = PATTERN_META[stats.pattern]}

		<!-- Pattern badge -->
		<div class="mb-4 flex items-center gap-2">
			<span class="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm font-medium">
				<span class={meta.colour}><meta.icon size={14} /></span>
				{meta.label}
			</span>
			<span class="text-xs text-[var(--text-dim)]">{meta.detail}</span>
		</div>

		<!-- Stats grid -->
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="rounded border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
				<p class="text-xs text-[var(--text-muted)]">Total sessions</p>
				<p class="mt-1 text-xl font-bold sm:text-2xl">{stats.totalSessions.toLocaleString()}</p>
			</div>
			<div class="rounded border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
				<p class="text-xs text-[var(--text-muted)]">Longest session</p>
				<p class="mt-1 text-xl font-bold sm:text-2xl">{stats.longestSession?.scrobbleCount ?? 0}</p>
				<p class="text-xs text-[var(--text-dim)]">scrobbles</p>
			</div>
			<div class="rounded border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
				<p class="text-xs text-[var(--text-muted)]">Avg per session</p>
				<p class="mt-1 text-xl font-bold sm:text-2xl">{stats.averageScrobblesPerSession}</p>
				<p class="text-xs text-[var(--text-dim)]">scrobbles</p>
			</div>
			<div class="rounded border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
				<p class="text-xs text-[var(--text-muted)]">Session time</p>
				<p class="mt-1 text-xl font-bold sm:text-2xl">{Math.round(stats.totalEstimatedMinutes / 60).toLocaleString()}</p>
				<p class="text-xs text-[var(--text-dim)]">hours total</p>
			</div>
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
</style>
