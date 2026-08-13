<script lang="ts" module>
	// Shared across every TrackPreview instance on the page: only one preview
	// plays at a time, so starting a new one stops whatever was playing.
	let currentAudio: HTMLAudioElement | null = null;
	let currentStop: (() => void) | null = null;
</script>

<script lang="ts">
	import { Play, Pause, Loader2, VolumeX } from '@lucide/svelte';

	let { track, artist }: { track: string; artist: string } = $props();

	type State = 'idle' | 'loading' | 'playing' | 'unavailable';
	let state = $state<State>('idle');
	let audio: HTMLAudioElement | null = null;

	function stop() {
		audio?.pause();
		state = 'idle';
	}

	async function toggle() {
		if (state === 'playing') {
			stop();
			return;
		}
		if (state === 'loading') return;

		if (audio) {
			currentStop?.();
			currentAudio = audio;
			currentStop = stop;
			audio.currentTime = 0;
			void audio.play();
			state = 'playing';
			return;
		}

		state = 'loading';
		try {
			const params = new URLSearchParams({ track, artist });
			const res = await fetch(`/api/track-preview?${params}`);
			const data = await res.json();

			if (!data.previewUrl) {
				state = 'unavailable';
				return;
			}

			audio = new Audio(data.previewUrl);
			audio.addEventListener('ended', () => { state = 'idle'; });

			currentStop?.();
			currentAudio = audio;
			currentStop = stop;

			await audio.play();
			state = 'playing';
		} catch {
			state = 'unavailable';
		}
	}
</script>

<button
	type="button"
	onclick={toggle}
	disabled={state === 'unavailable'}
	class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
	title={state === 'unavailable' ? 'No preview available' : state === 'playing' ? 'Pause preview' : 'Play 30s preview'}
	aria-label={state === 'playing' ? `Pause preview of ${track}` : `Play preview of ${track}`}
>
	{#if state === 'loading'}
		<Loader2 size={11} class="animate-spin" />
	{:else if state === 'playing'}
		<Pause size={11} />
	{:else if state === 'unavailable'}
		<VolumeX size={11} />
	{:else}
		<Play size={11} />
	{/if}
</button>
