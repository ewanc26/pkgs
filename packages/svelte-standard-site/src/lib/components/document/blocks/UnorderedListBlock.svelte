<script lang="ts">
	import RichText from '../RichText.svelte';
	import UnorderedListBlock from './UnorderedListBlock.svelte';

	interface ListItem {
		content?: {
			plaintext: string;
			facets?: any[];
		};
		children?: ListItem[];
	}

	interface Props {
		block: {
			children: ListItem[];
		};
		hasTheme?: boolean;
	}

	const { block, hasTheme = false }: Props = $props();
</script>

<ul class="unordered-list pb-2">
	{#each block.children as item}
		<li class="flex flex-row gap-2 pb-0">
			<div
				class="listMarker z-1 mx-2 mt-3.5 h-1.25 w-1.25 shrink-0"
				class:has-content={item.content}
				class:themed={hasTheme}
			></div>

			<div class="flex w-full flex-col">
				{#if item.content}
					<div class="textBlock mt-1 mb-2">
						<RichText plaintext={item.content.plaintext} facets={item.content.facets} {hasTheme} />
					</div>
				{/if}
				{#if item.children && item.children.length > 0}
					<UnorderedListBlock block={{ children: item.children }} {hasTheme} />
				{/if}
			</div>
		</li>
	{/each}
</ul>

<style>
	.unordered-list {
		list-style: none;
		padding-left: 0;
		margin-left: -1px;
	}

	@media (min-width: 640px) {
		.unordered-list {
			margin-left: 9px;
		}
	}

	.listMarker {
		background-color: transparent;
	}

	.listMarker.has-content {
		border-radius: 9999px;
		background-color: rgb(107 114 128); /* Default gray color */
	}

	.listMarker.has-content.themed {
		background-color: var(--theme-accent);
	}
</style>
