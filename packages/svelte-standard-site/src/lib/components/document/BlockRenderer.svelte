<script lang="ts">
	import TextBlock from './blocks/TextBlock.svelte';
	import HeaderBlock from './blocks/HeaderBlock.svelte';
	import BlockquoteBlock from './blocks/BlockquoteBlock.svelte';
	import ImageBlock from './blocks/ImageBlock.svelte';
	import CodeBlock from './blocks/CodeBlock.svelte';
	import MathBlock from './blocks/MathBlock.svelte';
	import UnorderedListBlock from './blocks/UnorderedListBlock.svelte';
	import HorizontalRuleBlock from './blocks/HorizontalRuleBlock.svelte';
	import IframeBlock from './blocks/IframeBlock.svelte';
	import WebsiteBlock from './blocks/WebsiteBlock.svelte';
	import ButtonBlock from './blocks/ButtonBlock.svelte';
	import BskyPostBlock from './blocks/BskyPostBlock.svelte';
	import PollBlock from './blocks/PollBlock.svelte';
	import PageBlock from './blocks/PageBlock.svelte';

	interface Props {
		block: any;
		hasTheme?: boolean;
	}

	const { block, hasTheme = false }: Props = $props();
</script>

{#if block.$type === 'pub.leaflet.blocks.text'}
	<TextBlock {block} {hasTheme} />
{:else if block.$type === 'pub.leaflet.blocks.header'}
	<HeaderBlock {block} {hasTheme} />
{:else if block.$type === 'pub.leaflet.blocks.blockquote'}
	<BlockquoteBlock {block} {hasTheme} />
{:else if block.$type === 'pub.leaflet.blocks.image'}
	<ImageBlock {block} {hasTheme} />
{:else if block.$type === 'pub.leaflet.blocks.code'}
	<CodeBlock {block} {hasTheme} />
{:else if block.$type === 'pub.leaflet.blocks.math'}
	<MathBlock {block} {hasTheme} />
{:else if block.$type === 'pub.leaflet.blocks.unorderedList'}
	<UnorderedListBlock {block} {hasTheme} />
{:else if block.$type === 'pub.leaflet.blocks.horizontalRule'}
	<HorizontalRuleBlock {hasTheme} />
{:else if block.$type === 'pub.leaflet.blocks.iframe'}
	<IframeBlock {block} {hasTheme} />
{:else if block.$type === 'pub.leaflet.blocks.website'}
	<WebsiteBlock {block} {hasTheme} />
{:else if block.$type === 'pub.leaflet.blocks.button'}
	<ButtonBlock {block} {hasTheme} />
{:else if block.$type === 'pub.leaflet.blocks.bskyPost'}
	<BskyPostBlock {block} {hasTheme} />
{:else if block.$type === 'pub.leaflet.blocks.poll'}
	<PollBlock {block} {hasTheme} />
{:else if block.$type === 'pub.leaflet.blocks.page'}
	<PageBlock {block} {hasTheme} />
{:else}
	<!-- Unknown block type -->
	<div class="my-2 rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
		<p class="text-sm text-orange-600 dark:text-orange-400">
			Unknown block type: <code class="font-mono text-xs">{block.$type}</code>
		</p>
		<details class="mt-2">
			<summary class="cursor-pointer text-xs text-orange-600/70 dark:text-orange-400/70">
				Show block data
			</summary>
			<pre class="mt-2 overflow-x-auto text-xs">{JSON.stringify(block, null, 2)}</pre>
		</details>
	</div>
{/if}
