<script lang="ts">
	interface Props {
		block: {
			url: string;
			title?: string;
			description?: string;
			preview?: {
				src: string;
			};
		};
		hasTheme?: boolean;
	}

	const { block, hasTheme = false }: Props = $props();
</script>

<div
	class="group/linkBlock relative my-2 flex h-[104px] overflow-hidden rounded-md border bg-white transition-colors dark:bg-gray-900"
	style:border-color={hasTheme ? 'var(--theme-accent)' : undefined}
	class:border-gray-200={!hasTheme}
	class:hover:border-gray-300={!hasTheme}
	class:dark:border-gray-700={!hasTheme}
	class:dark:hover:border-gray-600={!hasTheme}
>
	<a
		href={block.url}
		target="_blank"
		rel="noopener noreferrer"
		class="flex h-full w-full text-inherit no-underline hover:no-underline"
	>
		<div class="min-w-0 grow px-3 pt-2 pb-2">
			<div class="flex h-full w-full min-w-0 flex-col">
				{#if block.title}
					<div
						class="mb-0.5 line-clamp-1 text-base font-bold"
						style="overflow: hidden; text-overflow: ellipsis; word-break: break-all;"
					>
						{block.title}
					</div>
				{/if}

				{#if block.description}
					<div class="line-clamp-2 grow text-sm text-gray-600 dark:text-gray-400">
						{block.description}
					</div>
				{/if}

				<div
					class="line-clamp-1 w-full min-w-0 text-xs text-gray-500 italic group-hover/linkBlock:text-blue-600 dark:text-gray-500 dark:group-hover/linkBlock:text-blue-400"
					style="word-break: break-word;"
					style:color={hasTheme ? 'var(--theme-accent)' : undefined}
				>
					{block.url}
				</div>
			</div>
		</div>

		{#if block.preview?.src}
			<div
				class="m-2 -mb-2 w-[120px] shrink-0 origin-center rotate-[4deg] rounded-t-md border border-gray-200 bg-cover dark:border-gray-700"
				style:background-image="url({block.preview.src})"
				style:background-position="center"
			></div>
		{/if}
	</a>
</div>
