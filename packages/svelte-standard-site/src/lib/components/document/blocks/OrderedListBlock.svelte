<script lang="ts">
	import RichText from '../RichText.svelte';
	import OrderedListBlock from './OrderedListBlock.svelte';
	import UnorderedListBlock from './UnorderedListBlock.svelte';
	import HeaderBlock from './HeaderBlock.svelte';
	import ImageBlock from './ImageBlock.svelte';

	interface OrderedListContent {
		plaintext: string;
		facets?: any[];
		textSize?: 'default' | 'small' | 'large';
		level?: number;
		image?: {
			$type?: 'blob';
			ref?: { $link: string };
			mimeType?: string;
			size?: number;
		};
		alt?: string;
		aspectRatio?: { width: number; height: number };
	}

	export interface OrderedListItem {
		content?: OrderedListContent;
		checked?: boolean;
		children?: OrderedListItem[];
		unorderedListChildren?: {
			children: Array<{
				content?: { plaintext: string; facets?: any[] };
				children?: OrderedListItem[];
			}>;
		};
	}

	interface Props {
		block: {
			children: OrderedListItem[];
			startIndex?: number;
		};
		hasTheme?: boolean;
		did?: string;
		pds?: string;
	}

	const { block, hasTheme = false, did = '', pds = '' }: Props = $props();

	function isTextContent(content: OrderedListContent): boolean {
		return !!(content?.plaintext && content.level === undefined && !content.image);
	}

	function isHeaderContent(content: OrderedListContent): boolean {
		return !!(content?.level !== undefined);
	}

	function isImageContent(content: OrderedListContent): boolean {
		return !!content?.image;
	}
</script>

<ol class="ordered-list pb-2" start={block.startIndex}>
	{#each block.children as item, i}
		<li class="flex flex-row gap-2 pb-0">
			{#if item.checked !== undefined}
				<!-- Checklist item -->
				<div
					class="checkbox-marker z-1 mx-2 mt-3.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2"
					class:themed={hasTheme}
					class:checked={item.checked}
				>
					{#if item.checked}
						<svg class="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
							<path d="M10.28 2.28L4.5 8.06 1.72 5.28 1 6l3.5 3.5 6.5-6.5-.72-.72z" />
						</svg>
					{/if}
				</div>
			{:else}
				<!-- Regular numbered item -->
				<div
					class="list-number z-1 mx-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center text-sm font-medium"
					class:themed={hasTheme}
				>
					{(block.startIndex || 1) + i}
				</div>
			{/if}

			<div class="flex w-full flex-col">
				{#if item.content}
					<div class="textBlock mt-1 mb-2">
						{#if isTextContent(item.content)}
							<RichText
								plaintext={item.content.plaintext}
								facets={item.content.facets}
								{hasTheme}
							/>
						{:else if isHeaderContent(item.content)}
							<HeaderBlock block={item.content as any} {hasTheme} />
						{:else if isImageContent(item.content)}
							<ImageBlock block={item.content as any} {did} {pds} {hasTheme} />
						{/if}
					</div>
				{/if}

				{#if item.children && item.children.length > 0}
					<OrderedListBlock block={{ children: item.children }} {hasTheme} {did} {pds} />
				{/if}

				{#if item.unorderedListChildren && item.unorderedListChildren.children.length > 0}
					<UnorderedListBlock
						block={{ children: item.unorderedListChildren.children }}
						{hasTheme}
					/>
				{/if}
			</div>
		</li>
	{/each}
</ol>

<style>
	.ordered-list {
		list-style: none;
		padding-left: 0;
		margin-left: -1px;
		counter-reset: item;
	}

	@media (min-width: 640px) {
		.ordered-list {
			margin-left: 9px;
		}
	}

	.list-number {
		color: rgb(107 114 128);
	}

	.list-number.themed {
		color: var(--theme-accent);
	}

	.checkbox-marker {
		border-color: rgb(107 114 128);
		background-color: transparent;
	}

	.checkbox-marker.themed {
		border-color: var(--theme-accent);
	}

	.checkbox-marker.checked {
		background-color: rgb(107 114 128);
		border-color: rgb(107 114 128);
		color: white;
	}

	.checkbox-marker.checked.themed {
		background-color: var(--theme-accent);
		border-color: var(--theme-accent);
	}
</style>
