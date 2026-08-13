<script lang="ts">
	import { Chart } from '$lib/chart';
	import { Play, Pause, TrendingUp } from '@lucide/svelte';

	let {
		monthlyArtistPlays = []
	}: {
		monthlyArtistPlays: Array<[month: string, plays: Array<[artist: string, count: number]>]>;
	} = $props();

	const TOP_N = 15;
	const BASE_INTERVAL_MS = 800;
	const SPEEDS = [0.5, 1, 2] as const;

	interface RaceFrame {
		month: string;
		entries: Array<{ name: string; cumulativeCount: number }>;
	}

	/**
	 * Precompute one frame per month: a running cumulative-count map across
	 * all artists, snapshotted to the top 15 as of that month. Computed once
	 * up front (not per animation frame) — adapted from lastfm-stats-web's
	 * bar-chart-race approach.
	 */
	const frames: RaceFrame[] = $derived.by(() => {
		const cumulative = new Map<string, number>();
		const sortedMonths = [...monthlyArtistPlays].sort(([a], [b]) => a.localeCompare(b));
		const result: RaceFrame[] = [];

		for (const [month, plays] of sortedMonths) {
			for (const [artist, count] of plays) {
				cumulative.set(artist, (cumulative.get(artist) ?? 0) + count);
			}
			const entries = [...cumulative.entries()]
				.sort((a, b) => b[1] - a[1])
				.slice(0, TOP_N)
				.map(([name, cumulativeCount]) => ({ name, cumulativeCount }));
			result.push({ month, entries });
		}

		return result;
	});

	let frameIndex = $state(0);
	let playing = $state(false);
	let speed = $state<(typeof SPEEDS)[number]>(1);

	const currentFrame = $derived(frames[frameIndex] ?? null);
	const atEnd = $derived(frames.length === 0 || frameIndex >= frames.length - 1);

	function formatMonth(month: string): string {
		const [y, m] = month.split('-').map(Number);
		if (!y || !m) return month;
		return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
			month: 'long',
			year: 'numeric'
		});
	}

	function togglePlay() {
		if (playing) {
			playing = false;
			return;
		}
		if (atEnd) return; // reached the end — user must scrub back to restart
		playing = true;
	}

	function onScrub(e: Event) {
		playing = false;
		frameIndex = Number((e.target as HTMLInputElement).value);
	}

	function setSpeed(s: (typeof SPEEDS)[number]) {
		speed = s;
	}

	// Drives frame advancement. Re-runs (and tears down/recreates the
	// interval) whenever `playing` or `speed` changes; the effect's cleanup
	// function clears the interval, so pausing, changing speed, or
	// unmounting the component can never leak an interval.
	$effect(() => {
		if (!playing) return;

		const intervalMs = BASE_INTERVAL_MS / speed;
		const timer = setInterval(() => {
			if (frameIndex >= frames.length - 1) {
				playing = false;
				return;
			}
			frameIndex += 1;
		}, intervalMs);

		return () => clearInterval(timer);
	});

	let canvas: HTMLCanvasElement | undefined = $state();
	let chart: Chart | null = null;

	$effect(() => {
		if (!canvas || !currentFrame) return;

		const labels = currentFrame.entries.map((e) => e.name);
		const data = currentFrame.entries.map((e) => e.cumulativeCount);
		const intervalMs = BASE_INTERVAL_MS / speed;

		if (chart) {
			chart.data.labels = labels;
			chart.data.datasets[0].data = data;
			(chart.options.animation as { duration: number }).duration = Math.round(intervalMs * 0.9);
			chart.update();
			return;
		}

		chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						data,
						backgroundColor: '#4ade80',
						borderColor: '#22c55e',
						borderWidth: 1
					}
				]
			},
			options: {
				indexAxis: 'y',
				responsive: true,
				maintainAspectRatio: false,
				animation: {
					duration: Math.round(intervalMs * 0.9),
					easing: 'linear'
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label(ctx) {
								return `${(ctx.parsed.x ?? 0).toLocaleString()} plays`;
							}
						}
					}
				},
				scales: {
					x: {
						beginAtZero: true,
						ticks: { color: '#9ca3af', font: { size: 10 } },
						grid: { color: 'rgba(255,255,255,0.05)' }
					},
					y: {
						ticks: { color: '#e5e7eb', font: { size: 11 } },
						grid: { display: false }
					}
				}
			}
		});
	});
</script>

{#if frames.length > 0}
	<div class="rounded border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
		<div class="mb-3 flex items-center justify-between sm:mb-4">
			<h2 class="flex items-center gap-1.5 text-base font-semibold sm:text-lg">
				<TrendingUp size={16} class="text-[var(--accent)]" />
				Top Artists Race
			</h2>
			<span class="text-lg font-bold tabular-nums text-[var(--accent)] sm:text-xl">
				{formatMonth(currentFrame?.month ?? '')}
			</span>
		</div>

		<div class="h-[420px] sm:h-[520px]">
			<canvas bind:this={canvas}></canvas>
		</div>

		<div class="mt-4 flex flex-col gap-3">
			<div class="flex items-center gap-3">
				<button
					onclick={togglePlay}
					disabled={atEnd && !playing}
					class="flex shrink-0 items-center gap-1.5 rounded border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text-muted)]"
					aria-label={playing ? 'Pause' : 'Play'}
				>
					{#if playing}
						<Pause size={13} />
						Pause
					{:else}
						<Play size={13} />
						Play
					{/if}
				</button>

				<input
					type="range"
					min="0"
					max={frames.length - 1}
					step="1"
					value={frameIndex}
					oninput={onScrub}
					class="flex-1 accent-[var(--accent)]"
					aria-label="Frame scrubber"
				/>

				<span class="w-14 shrink-0 text-right font-mono text-xs text-[var(--text-muted)]">
					{frameIndex + 1}/{frames.length}
				</span>
			</div>

			<div class="flex items-center gap-1.5">
				<span class="text-xs text-[var(--text-dim)]">Speed</span>
				{#each SPEEDS as s (s)}
					<button
						onclick={() => setSpeed(s)}
						class="rounded border px-2 py-0.5 text-xs transition-colors {speed === s
							? 'border-[var(--accent)] text-[var(--accent)]'
							: 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]'}"
					>
						{s}x
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}
