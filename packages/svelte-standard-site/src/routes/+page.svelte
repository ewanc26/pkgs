<script lang="ts">
	import type { PageData } from './$types.js';
	import { PublicationCard, DocumentCard, StandardSiteLayout } from '$lib/components/index.js';

	const { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>svelte-standard-site - Showcase</title>
	<meta
		name="description"
		content="A SvelteKit library for fetching site.standard.* records from AT Protocol"
	/>
</svelte:head>

<StandardSiteLayout title="svelte-standard-site" showThemeToggle={true}>
	<div class="mx-auto max-w-7xl">
		<!-- Hero Section -->
		<header class="mb-16 text-center">
			<h1 class="text-ink-900 dark:text-ink-50 mb-4 text-5xl font-bold tracking-tight">
				svelte-standard-site
			</h1>
			<p class="text-ink-700 dark:text-ink-200 mx-auto mb-6 max-w-2xl text-xl">
				A powerful SvelteKit library for fetching <code
					class="bg-canvas-200 dark:bg-canvas-800 rounded px-2 py-1 text-base">site.standard.*</code
				> records from the AT Protocol ecosystem
			</p>
			<div class="flex items-center justify-center gap-4">
				<a
					href="https://github.com/ewanc26/svelte-standard-site"
					target="_blank"
					rel="noopener noreferrer"
					class="bg-primary-600 hover:bg-primary-700 focus-visible:outline-primary-600 dark:bg-primary-500 dark:hover:bg-primary-600 rounded-lg px-6 py-3 font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2"
				>
					View on GitHub
				</a>
			</div>
		</header>

		{#if data.error}
			<!-- Error State -->
			<div
				class="border-accent-300 bg-accent-50 dark:border-accent-700 dark:bg-accent-950 mb-12 rounded-xl border-2 p-8"
			>
				<div class="flex items-start gap-4">
					<svg
						class="text-accent-600 dark:text-accent-400 size-6 shrink-0"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<div class="flex-1">
						<h2 class="text-accent-900 dark:text-accent-50 mb-2 text-xl font-bold">
							Configuration Error
						</h2>
						<p class="text-accent-800 dark:text-accent-200 mb-4">{data.error}</p>
						<div class="bg-canvas-50 dark:bg-canvas-950 rounded-lg p-4">
							<p class="text-ink-900 dark:text-ink-50 mb-2 font-semibold">Quick Fix:</p>
							<ol class="text-ink-700 dark:text-ink-200 list-inside list-decimal space-y-2 text-sm">
								<li>
									Create a <code class="bg-canvas-200 dark:bg-canvas-800 rounded px-2 py-1"
										>.env</code
									> file in your project root
								</li>
								<li>
									Add: <code class="bg-canvas-200 dark:bg-canvas-800 rounded px-2 py-1"
										>PUBLIC_ATPROTO_DID=your-did-here</code
									>
								</li>
								<li>Restart your dev server</li>
							</ol>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- Configuration Info -->
			<section class="bg-primary-50 dark:bg-primary-950 mb-16 rounded-xl p-8">
				<h2 class="text-ink-900 dark:text-ink-50 mb-6 text-2xl font-bold">Active Configuration</h2>
				<div class="grid gap-6 md:grid-cols-2">
					<div class="bg-canvas-50 dark:bg-canvas-950 rounded-lg p-6 shadow-sm">
						<dt class="text-ink-700 dark:text-ink-200 mb-2 text-sm font-medium">DID</dt>
						<dd class="text-ink-900 dark:text-ink-50 font-mono text-sm break-all">
							{data.config?.did}
						</dd>
					</div>
					<div class="bg-canvas-50 dark:bg-canvas-950 rounded-lg p-6 shadow-sm">
						<dt class="text-ink-700 dark:text-ink-200 mb-2 text-sm font-medium">PDS Endpoint</dt>
						<dd class="text-ink-900 dark:text-ink-50 font-mono text-sm break-all">
							{data.pds || 'Auto-resolved'}
						</dd>
					</div>
				</div>
			</section>

			<!-- Publications Section -->
			<section class="mb-16">
				<div class="mb-8 flex items-end justify-between gap-4">
					<div class="min-w-0 flex-1">
						<h2 class="text-ink-900 dark:text-ink-50 text-3xl font-bold">Publications</h2>
						<p class="text-ink-700 dark:text-ink-200 mt-2">
							site.standard.publication records from the configured repository
						</p>
					</div>
					<div
						class="bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-100 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap"
					>
						{data.publications.length} found
					</div>
				</div>
				{#if data.publications.length === 0}
					<div
						class="border-canvas-300 dark:border-canvas-700 rounded-xl border-2 border-dashed p-12 text-center"
					>
						<svg
							class="text-ink-500 dark:text-ink-400 mx-auto mb-4 size-12"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						<h3 class="text-ink-900 dark:text-ink-50 mb-2 text-lg font-semibold">
							No Publications Found
						</h3>
						<p class="text-ink-700 dark:text-ink-200">
							This repository doesn't have any <code
								class="bg-canvas-200 dark:bg-canvas-800 rounded px-2 py-1"
								>site.standard.publication</code
							> records yet.
						</p>
					</div>
				{:else}
					<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{#each data.publications as publication}
							<PublicationCard {publication} />
						{/each}
					</div>
				{/if}
			</section>

			<!-- Documents Section -->
			<section>
				<div class="mb-8 flex items-end justify-between gap-4">
					<div class="min-w-0 flex-1">
						<h2 class="text-ink-900 dark:text-ink-50 text-3xl font-bold">Documents</h2>
						<p class="text-ink-700 dark:text-ink-200 mt-2">
							<code class="bg-canvas-200 dark:bg-canvas-800 rounded px-2 py-1"
								>site.standard.document</code
							> records, sorted by publication date
						</p>
					</div>
					<div
						class="bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-100 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap"
					>
						{data.documents.length} found
					</div>
				</div>
				{#if data.documents.length === 0}
					<div
						class="border-canvas-300 dark:border-canvas-700 rounded-xl border-2 border-dashed p-12 text-center"
					>
						<svg
							class="text-ink-500 dark:text-ink-400 mx-auto mb-4 size-12"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
							/>
						</svg>
						<h3 class="text-ink-900 dark:text-ink-50 mb-2 text-lg font-semibold">
							No Documents Found
						</h3>
						<p class="text-ink-700 dark:text-ink-200">
							This repository doesn't have any <code
								class="bg-canvas-200 dark:bg-canvas-800 rounded px-2 py-1"
								>site.standard.document</code
							> records yet.
						</p>
					</div>
				{:else}
					<div class="space-y-6">
						{#each data.documents as document}
							{@const publication =
								data.publications.find((pub: { uri: any }) => pub.uri === document.value.site) ??
								undefined}
							<DocumentCard {document} {publication} />
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	</div>
</StandardSiteLayout>
