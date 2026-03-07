<script lang="ts">
	interface Props {
		block: {
			pageId: string;
		};
		hasTheme?: boolean;
		pages?: any[]; // Array of page data if available
	}

	const { block, hasTheme = false, pages }: Props = $props();

	// Find the referenced page
	const referencedPage = $derived(pages?.find((p) => p.id === block.pageId));
</script>

{#if referencedPage}
	<div
		class="relative my-2 flex h-[104px] w-full overflow-clip rounded-md border bg-white dark:bg-gray-900"
		style:border-color={hasTheme ? 'var(--theme-accent)' : undefined}
		class:border-gray-200={!hasTheme}
		class:dark:border-gray-700={!hasTheme}
	>
		<div class="flex h-full w-full overflow-clip">
			<div class="my-2 ml-3 flex min-w-0 grow flex-col overflow-clip bg-transparent text-sm">
				<div class="grow">
					{#if referencedPage.title}
						<div class="line-clamp-1 text-base font-bold">
							{referencedPage.title}
						</div>
					{/if}
					{#if referencedPage.description}
						<div class="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
							{referencedPage.description}
						</div>
					{/if}
				</div>
			</div>
			<div
				class="m-2 -mb-2 w-[120px] shrink-0 origin-center rotate-[4deg] rounded-t-md border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900"
			></div>
		</div>
	</div>
{:else}
	<div
		class="my-2 rounded-md border bg-white p-6 dark:bg-gray-900"
		style:border-color={hasTheme ? 'var(--theme-accent)' : undefined}
		class:border-gray-200={!hasTheme}
		class:dark:border-gray-700={!hasTheme}
	>
		<div class="mb-3 flex items-center gap-2 text-sm font-medium">
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
				/>
			</svg>
			<span>Page Reference</span>
		</div>
		<p class="text-sm opacity-70">
			Links to page: <code class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800"
				>{block.pageId}</code
			>
		</p>
	</div>
{/if}
