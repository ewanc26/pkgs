<script lang="ts">
	import { onMount } from 'svelte';
	import { Sun, Moon } from '@lucide/svelte';
	import { themeStore } from '../stores/index.js';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	let isDark = $state(false);
	let mounted = $state(false);

	onMount(() => {
		themeStore.init();

		const unsubscribe = themeStore.subscribe((state) => {
			isDark = state.isDark;
			mounted = state.mounted;
		});

		return unsubscribe;
	});

	function toggle() {
		themeStore.toggle();
	}
</script>

<button
	onclick={toggle}
	class="bg-canvas-200 text-ink-900 hover:bg-canvas-300 focus-visible:outline-primary-600 dark:bg-canvas-800 dark:text-ink-50 dark:hover:bg-canvas-700 relative flex h-10 w-10 items-center justify-center rounded-lg transition-all focus-visible:outline-2 focus-visible:outline-offset-2 {className}"
	aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
	type="button"
>
	{#if mounted}
		<div class="relative h-5 w-5">
			<Sun
				class="absolute inset-0 h-5 w-5 transition-all duration-300 {isDark
					? 'scale-0 -rotate-90 opacity-0'
					: 'scale-100 rotate-0 opacity-100'}"
				aria-hidden="true"
			/>
			<Moon
				class="absolute inset-0 h-5 w-5 transition-all duration-300 {isDark
					? 'scale-100 rotate-0 opacity-100'
					: 'scale-0 rotate-90 opacity-0'}"
				aria-hidden="true"
			/>
		</div>
	{:else}
		<div class="bg-canvas-300 dark:bg-canvas-700 h-5 w-5 animate-pulse rounded"></div>
	{/if}
</button>
