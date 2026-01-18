<script lang="ts">
	import type { PageData } from './$types.js';
	import { PublicationCard, DocumentCard } from '$lib/components/index.js';

	const { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Standard.Site Library - Showcase</title>
	<meta
		name="description"
		content="A SvelteKit library for fetching site.standard.* records from AT Protocol"
	/>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-12">
	<!-- Hero Section -->
	<header class="mb-16 text-center">
		<h1 class="mb-4 text-5xl font-bold tracking-tight">
			<span class="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
				Standard.Site
			</span>
			<span class="text-gray-900">Library</span>
		</h1>
		<p class="mx-auto mb-6 max-w-2xl text-xl text-gray-600">
			A powerful SvelteKit library for fetching <code
				class="rounded bg-gray-100 px-2 py-1 text-base">site.standard.*</code
			> records from the AT Protocol ecosystem
		</p>
		<div class="flex items-center justify-center gap-4">
			<a
				href="https://github.com/ewanc26/svelte-standard-site"
				target="_blank"
				rel="noopener noreferrer"
				class="rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
			>
				View on GitHub
			</a>
		</div>
	</header>

	{#if data.error}
		<!-- Error State -->
		<div class="mb-12 rounded-xl border-2 border-red-200 bg-red-50 p-8">
			<div class="flex items-start gap-4">
				<svg
					class="size-6 shrink-0 text-red-600"
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
					<h2 class="mb-2 text-xl font-bold text-red-900">Configuration Error</h2>
					<p class="mb-4 text-red-800">{data.error}</p>
					<div class="rounded-lg bg-white p-4">
						<p class="mb-2 font-semibold text-gray-900">Quick Fix:</p>
						<ol class="list-inside list-decimal space-y-2 text-sm text-gray-700">
							<li>
								Create a <code class="rounded bg-gray-100 px-2 py-1">.env</code> file in your project
								root
							</li>
							<li>
								Add: <code class="rounded bg-gray-100 px-2 py-1"
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
		<section class="mb-16 rounded-xl bg-linear-to-r from-blue-50 to-purple-50 p-8">
			<h2 class="mb-6 text-2xl font-bold text-gray-900">Active Configuration</h2>
			<div class="grid gap-6 md:grid-cols-2">
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<dt class="mb-2 text-sm font-medium text-gray-600">DID</dt>
					<dd class="font-mono text-sm break-all text-gray-900">{data.config?.did}</dd>
				</div>
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<dt class="mb-2 text-sm font-medium text-gray-600">PDS Endpoint</dt>
					<dd class="font-mono text-sm break-all text-gray-900">
						{data.pds || 'Auto-resolved'}
					</dd>
				</div>
			</div>
		</section>

		<!-- Publications Section -->
		<section class="mb-16">
			<div class="mb-8 flex items-end justify-between">
				<div>
					<h2 class="text-3xl font-bold text-gray-900">Publications</h2>
					<p class="mt-2 text-gray-600">
						Site.standard.publication records from the configured repository
					</p>
				</div>
				<div class="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">
					{data.publications.length} found
				</div>
			</div>
			{#if data.publications.length === 0}
				<div class="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
					<svg
						class="mx-auto mb-4 size-12 text-gray-400"
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
					<h3 class="mb-2 text-lg font-semibold text-gray-900">No Publications Found</h3>
					<p class="text-gray-600">
						This repository doesn't have any <code>site.standard.publication</code> records yet.
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
			<div class="mb-8 flex items-end justify-between">
				<div>
					<h2 class="text-3xl font-bold text-gray-900">Documents</h2>
					<p class="mt-2 text-gray-600">
						<code>site.standard.document</code> records, sorted by publication date
					</p>
				</div>
				<div class="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-800">
					{data.documents.length} found
				</div>
			</div>
			{#if data.documents.length === 0}
				<div class="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
					<svg
						class="mx-auto mb-4 size-12 text-gray-400"
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
					<h3 class="mb-2 text-lg font-semibold text-gray-900">No Documents Found</h3>
					<p class="text-gray-600">
						This repository doesn't have any <code>site.standard.document</code> records yet.
					</p>
				</div>
			{:else}
				<div class="space-y-6">
					{#each data.documents as document}
						<DocumentCard {document} />
					{/each}
				</div>
			{/if}
		</section>

		<!-- Stats Footer -->
		<footer class="mt-16 rounded-xl bg-gray-50 p-8 text-center">
			<div class="mb-4 flex items-center justify-center gap-8">
				<div>
					<div class="text-4xl font-bold text-blue-600">{data.publications.length}</div>
					<div class="text-sm font-medium text-gray-600">
						Publication{data.publications.length === 1 ? '' : 's'}
					</div>
				</div>
				<div class="h-12 w-px bg-gray-300"></div>
				<div>
					<div class="text-4xl font-bold text-purple-600">{data.documents.length}</div>
					<div class="text-sm font-medium text-gray-600">
						Document{data.documents.length === 1 ? '' : 's'}
					</div>
				</div>
			</div>
			<p class="text-sm text-gray-600">
				Powered by <a
					href="https://atproto.com"
					target="_blank"
					rel="noopener noreferrer"
					class="font-semibold text-blue-600 hover:underline">AT Protocol</a
				>, created by
				<a
					href="https://ewancroft.uk"
					target="_blank"
					rel="noopener noreferrer"
					class="font-semibold text-blue-600 hover:underline">Ewan Croft</a
				>
			</p>
		</footer>
	{/if}
</div>
