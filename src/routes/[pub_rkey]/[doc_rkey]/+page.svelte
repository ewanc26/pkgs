<script lang="ts">
	import type { PageData } from './$types.js';
	import { getThemeVars } from '$lib/utils/theme.js';
	import { extractRkey } from '$lib/utils/document.js';

	const { data }: { data: PageData } = $props();

	const themeVars = $derived(
		data.publication?.value.basicTheme ? getThemeVars(data.publication.value.basicTheme) : {}
	);

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{data.document.value.title}</title>
	{#if data.document.value.description}
		<meta name="description" content={data.document.value.description} />
	{/if}
</svelte:head>

<div
	class="min-h-screen"
	style:background-color={data.publication?.value.basicTheme
		? `var(--theme-background)`
		: undefined}
	style={Object.entries(themeVars)
		.map(([k, v]) => `${k}:${v}`)
		.join(';')}
>
	<article class="mx-auto max-w-4xl px-4 py-12">
		<!-- Back link -->
		<a
			href="/"
			class="mb-8 inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
			style:color={data.publication?.value.basicTheme ? `var(--theme-accent)` : undefined}
		>
			<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to Home
		</a>

		<!-- Publication info if available -->
		{#if data.publication}
			<div class="mb-8 flex items-center gap-3">
				{#if data.publication.value.icon}
					<img
						src={data.publication.value.icon}
						alt="{data.publication.value.name} icon"
						class="size-10 rounded-lg object-cover"
					/>
				{/if}
				<div>
					<div
						class="text-sm font-medium"
						style:color={data.publication.value.basicTheme ? `var(--theme-foreground)` : undefined}
					>
						{data.publication.value.name}
					</div>
					{#if data.publication.value.url}
						<a
							href={data.publication.value.url}
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs transition-opacity hover:opacity-70"
							style:color={data.publication.value.basicTheme ? `var(--theme-accent)` : undefined}
						>
							{data.publication.value.url}
						</a>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Document header -->
		<header class="mb-8">
			<h1
				class="mb-4 text-4xl leading-tight font-bold md:text-5xl"
				style:color={data.publication?.value.basicTheme ? `var(--theme-foreground)` : undefined}
			>
				{data.document.value.title}
			</h1>

			<div
				class="flex flex-wrap items-center gap-x-6 gap-y-2 border-b pb-6 text-sm"
				style:border-color={data.publication?.value.basicTheme
					? `var(--theme-foreground, rgb(229, 231, 235))`
					: 'rgb(229, 231, 235)'}
				style:opacity={data.publication?.value.basicTheme ? '0.3' : '1'}
			>
				<time
					class="font-medium"
					style:color={data.publication?.value.basicTheme
						? `var(--theme-foreground)`
						: 'rgb(17, 24, 39)'}
				>
					Published {formatDate(data.document.value.publishedAt)}
				</time>
				{#if data.document.value.updatedAt}
					<span
						style:color={data.publication?.value.basicTheme
							? `var(--theme-foreground)`
							: 'rgb(107, 114, 128)'}
					>
						Updated {formatDate(data.document.value.updatedAt)}
					</span>
				{/if}
			</div>
		</header>

		<!-- Cover image -->
		{#if data.document.value.coverImage}
			<div class="mb-8">
				<img
					src={data.document.value.coverImage}
					alt="{data.document.value.title} cover"
					class="w-full rounded-lg object-cover shadow-lg"
					style="max-height: 500px;"
				/>
			</div>
		{/if}

		<!-- Document content -->
		<div
			class="mx-auto prose prose-lg max-w-none"
			style:color={data.publication?.value.basicTheme ? `var(--theme-foreground)` : undefined}
		>
			{#if data.document.value.textContent}
				<div class="whitespace-pre-wrap">{data.document.value.textContent}</div>
			{:else if data.document.value.content}
				<div class="rounded-lg border border-gray-200 bg-gray-50 p-6">
					<p class="mb-2 text-sm font-medium text-gray-700">Raw Content:</p>
					<pre class="overflow-x-auto text-xs">{JSON.stringify(
							data.document.value.content,
							null,
							2
						)}</pre>
				</div>
			{:else}
				<p class="text-gray-500 italic">No content available</p>
			{/if}
		</div>

		<!-- Tags -->
		{#if data.document.value.tags && data.document.value.tags.length > 0}
			<div
				class="mt-12 border-t pt-8"
				style:border-color={data.publication?.value.basicTheme
					? `var(--theme-foreground, rgb(229, 231, 235))`
					: 'rgb(229, 231, 235)'}
				style:opacity={data.publication?.value.basicTheme ? '0.3' : '1'}
			>
				<h2
					class="mb-4 text-sm font-medium tracking-wide uppercase"
					style:color={data.publication?.value.basicTheme
						? `var(--theme-foreground)`
						: 'rgb(107, 114, 128)'}
				>
					Tags
				</h2>
				<div class="flex flex-wrap gap-2">
					{#each data.document.value.tags as tag}
						<span
							class="rounded-full px-4 py-2 text-sm font-medium"
							style:background-color={data.publication?.value.basicTheme
								? `var(--theme-accent, rgb(243, 244, 246))`
								: 'rgb(243, 244, 246)'}
							style:color={data.publication?.value.basicTheme
								? `var(--theme-accent-foreground, rgb(75, 85, 99))`
								: 'rgb(75, 85, 99)'}
						>
							{tag}
						</span>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Bluesky post reference -->
		{#if data.document.value.bskyPostRef}
			<div class="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
				<p class="text-sm text-blue-900">
					<a
						href="https://bsky.app/profile/{data.config?.did}/post/{extractRkey(
							data.document.value.bskyPostRef.uri
						)}"
						target="_blank"
						rel="noopener noreferrer"
						class="font-medium hover:underline"
					>
						View discussion on Bluesky →
					</a>
				</p>
			</div>
		{/if}
	</article>
</div>
