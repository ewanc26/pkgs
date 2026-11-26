<script lang="ts">
	/**
	 * Shown while an importer is paused for quota: how long, until when, that
	 * nothing is wrong, and a way to try again early.
	 */
	import type { QuotaWait } from './run-guard.js';

	let {
		waiting,
		onretry
	}: {
		waiting: QuotaWait;
		onretry?: () => void;
	} = $props();

	let now = $state(Date.now());

	$effect(() => {
		now = Date.now();
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	const secondsLeft = $derived(Math.max(0, Math.ceil((waiting.resumeAt - now) / 1000)));

	const countdown = $derived.by(() => {
		const h = Math.floor(secondsLeft / 3600);
		const m = Math.floor((secondsLeft % 3600) / 60);
		const s = String(secondsLeft % 60).padStart(2, '0');
		return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
	});

	const resumeTime = $derived.by(() => {
		const at = new Date(waiting.resumeAt);
		const time = at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
		return at.toDateString() === new Date(now).toDateString()
			? time
			: `${at.toLocaleDateString(undefined, { weekday: 'long' })} ${time}`;
	});
</script>

<div class="wait-banner">
	<div class="wait-text">
		<p class="wait-title" role="status">
			{waiting.serverConfirmed
				? 'Paused: your server asked us to slow down'
				: 'Paused to stay within your write quota'}
		</p>
		<p class="wait-detail">
			Resumes by itself at {resumeTime}. Your progress is safe; keep this tab open.
		</p>
	</div>
	<span class="wait-countdown" aria-hidden="true">{countdown}</span>
	{#if onretry}
		<button type="button" class="wait-retry" onclick={onretry} disabled={secondsLeft === 0}>
			Try now
		</button>
	{/if}
</div>

<style>
	.wait-banner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1rem;
		padding: 0.875rem 1rem;
		margin-bottom: 0.75rem;
		border: 1px solid var(--warn);
		border-radius: 8px;
		background: var(--surface-2);
		text-align: left;
	}
	.wait-text {
		flex: 1 1 14rem;
	}
	.wait-title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--warn);
	}
	.wait-detail {
		margin: 0.2rem 0 0;
		font-size: 0.8rem;
		color: var(--muted);
	}
	.wait-countdown {
		font-family: 'JetBrains Mono', monospace;
		font-size: 1.35rem;
		font-variant-numeric: tabular-nums;
		color: var(--text);
	}
	.wait-retry {
		padding: 0.4rem 0.8rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-size: 0.8rem;
		cursor: pointer;
	}
	.wait-retry:hover:not(:disabled),
	.wait-retry:focus-visible {
		border-color: var(--warn);
	}
	.wait-retry:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
