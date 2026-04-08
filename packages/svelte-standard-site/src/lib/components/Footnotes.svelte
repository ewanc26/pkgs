<script lang="ts">
	import RichText from './document/RichText.svelte';

	export interface Footnote {
		footnoteId: string;
		contentPlaintext: string;
		contentFacets?: any[];
		number: number;
	}

	interface Props {
		footnotes: Footnote[];
		hasTheme?: boolean;
	}

	const { footnotes, hasTheme = false }: Props = $props();
</script>

{#if footnotes.length > 0}
	<section class="footnotes mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
		<h2 class="text-lg font-semibold mb-4">Footnotes</h2>
		<ol class="footnotes-list space-y-3">
			{#each footnotes as footnote}
				<li id={footnote.footnoteId} class="footnote-item flex gap-3">
					<span class="footnote-number shrink-0 w-6 text-right text-sm text-gray-500 dark:text-gray-400">
						{footnote.number}.
					</span>
					<div class="flex-1 text-sm">
						<RichText plaintext={footnote.contentPlaintext} facets={footnote.contentFacets} {hasTheme} />
						<a
							href="#{footnote.footnoteId}-ref"
							class="footnote-backref ml-1 text-xs"
							class:themed={hasTheme}
							aria-label="Back to reference"
						>
							↩
						</a>
					</div>
				</li>
			{/each}
		</ol>
	</section>
{/if}

<style>
	.footnotes-list {
		list-style: none;
		padding-left: 0;
		counter-reset: footnote;
	}

	.footnote-item {
		scroll-margin-top: 2rem;
	}

	.footnote-number {
		color: rgb(107 114 128);
	}

	.footnote-backref {
		color: rgb(0 0 225);
		text-decoration: none;
	}

	.footnote-backref.themed {
		color: var(--theme-accent);
	}

	.footnote-backref:hover {
		text-decoration: underline;
	}
</style>
