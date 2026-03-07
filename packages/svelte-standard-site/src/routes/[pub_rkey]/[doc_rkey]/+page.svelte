<script lang="ts">
	import type { PageData } from './$types.js';
	import { getThemeVars } from '$lib/utils/theme.js';
	import { extractRkey } from '$lib/utils/document.js';
	import { ThemedContainer, ThemedText, DateDisplay, TagList } from '$lib/components/index.js';
	import { mixThemeColor } from '$lib/utils/theme-helpers.js';
	import DocumentRenderer from '$lib/components/document/DocumentRenderer.svelte';

	const { data }: { data: PageData } = $props();

	const themeVars = $derived(
		data.publication?.value.basicTheme ? getThemeVars(data.publication.value.basicTheme) : {}
	);
	const hasTheme = $derived(!!data.publication?.value.basicTheme);
</script>

<svelte:head>
	<title>{data.document.value.title}</title>
	{#if data.document.value.description}
		<meta name="description" content={data.document.value.description} />
	{/if}
	{#if hasTheme}
		<!-- prettier-ignore -->
		<style>
			body {{
				background-color: {themeVars['--theme-background'] || 'var(--color-canvas-50)'} !important;
			}}
		</style>
	{/if}
</svelte:head>

<ThemedContainer theme={data.publication?.value.basicTheme} class="flex flex-col">
	<!-- Header Bar -->
	<header
		class="sticky top-0 z-10 border-b backdrop-blur-sm"
		style:border-color={hasTheme ? mixThemeColor('--theme-foreground', 15) : undefined}
		style:background-color={hasTheme ? mixThemeColor('--theme-background', 80) : undefined}
	>
		<nav class="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
			<a
				href="/"
				class="group flex items-center gap-2 text-sm font-medium transition-all hover:gap-3"
				style:color={hasTheme ? 'var(--theme-accent)' : undefined}
			>
				<svg
					class="size-4 transition-transform group-hover:-translate-x-0.5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2.5"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				Back to Home
			</a>

			{#if data.publication}
				<a
					href={data.publication.value.url || '/'}
					target={data.publication.value.url ? '_blank' : undefined}
					rel={data.publication.value.url ? 'noopener noreferrer' : undefined}
					class="flex items-center gap-2 transition-opacity hover:opacity-70"
				>
					{#if data.publication.value.icon}
						<img
							src={data.publication.value.icon}
							alt="{data.publication.value.name} icon"
							class="size-6 rounded object-cover"
						/>
					{/if}
					<ThemedText {hasTheme} element="span" class="text-sm font-semibold">
						{data.publication.value.name}
					</ThemedText>
				</a>
			{/if}
		</nav>
	</header>

	<!-- Main Content -->
	<article class="mx-auto max-w-3xl px-6 py-12">
		<!-- Title Section -->
		<header class="mb-12">
			<ThemedText {hasTheme} element="h1" class="mb-6 text-5xl font-bold leading-tight tracking-tight">
				{data.document.value.title}
			</ThemedText>

			<div
				class="flex flex-wrap items-center gap-4 text-sm"
				style:color={hasTheme ? mixThemeColor('--theme-foreground', 60) : undefined}
			>
				<DateDisplay date={data.document.value.publishedAt} />
				{#if data.document.value.updatedAt}
					<span
						class="flex items-center gap-1.5"
						style:color={hasTheme ? mixThemeColor('--theme-foreground', 50) : undefined}
					>
						<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						Updated <DateDisplay date={data.document.value.updatedAt} />
					</span>
				{/if}
			</div>
		</header>

		<!-- Cover Image -->
		{#if data.document.value.coverImage}
			<div class="-mx-6 mb-12 sm:mx-0">
				<img
					src={data.document.value.coverImage}
					alt="{data.document.value.title} cover"
					class="w-full rounded-none object-cover sm:rounded-2xl"
					style="max-height: 28rem; object-position: center;"
				/>
			</div>
		{/if}

		<!-- Document Content -->
		<DocumentRenderer document={data.document.value} {hasTheme} />

		<!-- Tags -->
		{#if data.document.value.tags && data.document.value.tags.length > 0}
			<div class="mt-16 pt-8">
				<TagList tags={data.document.value.tags} {hasTheme} />
			</div>
		{/if}

		<!-- Bluesky Reference -->
		{#if data.document.value.bskyPostRef}
			<div
				class="mt-12 rounded-2xl border p-6"
				style:border-color={hasTheme ? mixThemeColor('--theme-accent', 30) : undefined}
				style:background-color={hasTheme ? mixThemeColor('--theme-accent', 10) : undefined}
			>
				<a
					href="https://bsky.app/profile/{data.config?.did}/post/{extractRkey(
						data.document.value.bskyPostRef.uri
					)}"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-3 font-medium transition-all hover:gap-4"
					style:color={hasTheme ? 'var(--theme-accent)' : undefined}
				>
					<svg class="size-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"
						/>
					</svg>
					<span>Continue the conversation on Bluesky</span>
					<svg class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M14 5l7 7m0 0l-7 7m7-7H3"
						/>
					</svg>
				</a>
			</div>
		{/if}
	</article>

	<!-- Footer -->
	<footer
		class="mt-auto border-t py-8"
		style:border-color={hasTheme ? mixThemeColor('--theme-foreground', 15) : undefined}
	>
		<div class="mx-auto max-w-3xl px-6 text-center">
			<p
				class="text-sm"
				style:color={hasTheme ? mixThemeColor('--theme-foreground', 50) : undefined}
			>
				Powered by
				<a
					href="https://atproto.com"
					target="_blank"
					rel="noopener noreferrer"
					class="font-medium underline decoration-1 underline-offset-2 transition-all hover:decoration-2"
					style:color={hasTheme ? 'var(--theme-accent)' : undefined}
				>
					AT Protocol
				</a>
			</p>
		</div>
	</footer>
</ThemedContainer>
