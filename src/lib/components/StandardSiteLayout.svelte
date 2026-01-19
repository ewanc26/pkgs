<script lang="ts">
	import type { Snippet } from 'svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	interface Props {
		/** Site title */
		title?: string;
		/** Header slot for custom header content */
		header?: Snippet;
		/** Footer slot for custom footer content */
		footer?: Snippet;
		/** Main content */
		children: Snippet;
		/** Additional CSS classes for the main container */
		class?: string;
		/** Show theme toggle in default header */
		showThemeToggle?: boolean;
	}

	let {
		title = 'My Site',
		header,
		footer,
		children,
		class: className = '',
		showThemeToggle = true
	}: Props = $props();
</script>

<svelte:head>
	<script>
		// Prevent flash of unstyled content (FOUC) by applying theme before page renders
		(function () {
			const stored = localStorage.getItem('theme');
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			const isDark = stored === 'dark' || (!stored && prefersDark);
			const htmlElement = document.documentElement;

			if (isDark) {
				htmlElement.classList.add('dark');
				htmlElement.style.colorScheme = 'dark';
			} else {
				htmlElement.classList.remove('dark');
				htmlElement.style.colorScheme = 'light';
			}
		})();
	</script>
</svelte:head>

<div
	class="bg-canvas-50 text-ink-900 dark:bg-canvas-950 dark:text-ink-50 flex min-h-screen flex-col overflow-x-hidden"
>
	{#if header}
		{@render header()}
	{:else}
		<header
			class="border-canvas-200 bg-canvas-50/90 dark:border-canvas-800 dark:bg-canvas-950/90 sticky top-0 z-50 w-full border-b backdrop-blur-md"
		>
			<nav
				class="container mx-auto flex items-center justify-between px-4 py-4"
				aria-label="Main navigation"
			>
				<a
					href="/"
					class="text-ink-900 hover:text-primary-600 focus-visible:text-primary-600 focus-visible:outline-primary-600 dark:text-ink-50 dark:hover:text-primary-400 dark:focus-visible:text-primary-400 text-xl font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
				>
					{title}
				</a>

				{#if showThemeToggle}
					<ThemeToggle />
				{/if}
			</nav>
		</header>
	{/if}

	<main id="main-content" class="container mx-auto grow px-4 py-8 {className}" tabindex="-1">
		{@render children()}
	</main>

	{#if footer}
		{@render footer()}
	{:else}
		<footer
			class="border-canvas-200 bg-canvas-50 dark:border-canvas-800 dark:bg-canvas-950 mt-auto w-full border-t py-6"
		>
			<div class="text-ink-700 dark:text-ink-200 container mx-auto px-4 text-center text-sm">
				<p>
					&copy; {new Date().getFullYear()}
					{title}. Powered by svelte-standard-site and the AT Protocol. Created by <a
						href="https://ewancroft.uk"
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary-600 hover:text-primary-700 focus-visible:outline-primary-600 dark:text-primary-400 dark:hover:text-primary-500 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2"
						>Ewan Croft</a
					>.
				</p>
			</div>
		</footer>
	{/if}
</div>
