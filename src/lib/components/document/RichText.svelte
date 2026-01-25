<script lang="ts">
	import InlineMath from './InlineMath.svelte';
	import { UnicodeString } from '@atproto/api';

	interface Facet {
		index: {
			byteStart: number;
			byteEnd: number;
		};
		features: Array<{
			$type: string;
			[key: string]: any;
		}>;
	}

	interface Props {
		plaintext: string;
		facets?: Facet[];
		hasTheme?: boolean;
	}

	const { plaintext, facets = [], hasTheme = false }: Props = $props();

	interface RichTextSegment {
		text: string;
		facet?: Array<{ $type: string; [key: string]: any }>;
	}

	class RichText {
		unicodeText: UnicodeString;
		facets: Facet[];

		constructor(props: { text: string; facets: Facet[] }) {
			this.unicodeText = new UnicodeString(props.text || '');
			this.facets = props.facets || [];
			if (this.facets) {
				this.facets = this.facets
					.filter((facet) => facet.index.byteStart <= facet.index.byteEnd)
					.sort((a, b) => a.index.byteStart - b.index.byteStart);
			}
		}

		*segments(): Generator<RichTextSegment, void, void> {
			const facets = this.facets || [];
			if (!facets.length) {
				yield { text: this.unicodeText.utf16 || '' };
				return;
			}

			let textCursor = 0;
			let facetCursor = 0;
			do {
				const currFacet = facets[facetCursor];
				if (textCursor < currFacet.index.byteStart) {
					const sliced = this.unicodeText.slice(textCursor, currFacet.index.byteStart);
					yield {
						text: sliced || ''
					};
				} else if (textCursor > currFacet.index.byteStart) {
					facetCursor++;
					continue;
				}
				if (currFacet.index.byteStart < currFacet.index.byteEnd) {
					const subtext = this.unicodeText.slice(
						currFacet.index.byteStart,
						currFacet.index.byteEnd
					);
					const subtextStr = subtext || '';
					if (!subtextStr.trim()) {
						// don't emit empty string entities
						yield { text: subtextStr };
					} else {
						yield { text: subtextStr, facet: currFacet.features };
					}
				}
				textCursor = currFacet.index.byteEnd;
				facetCursor++;
			} while (facetCursor < facets.length);
			if (textCursor < this.unicodeText.length) {
				const sliced = this.unicodeText.slice(textCursor, this.unicodeText.length);
				yield {
					text: sliced || ''
				};
			}
		}
	}

	interface ProcessedSegment {
		parts: Array<{ text: string; isBr: boolean }>;
		isBold: boolean;
		isItalic: boolean;
		isUnderline: boolean;
		isStrikethrough: boolean;
		isCode: boolean;
		isHighlighted: boolean;
		isMath: boolean;
		isDidMention: boolean;
		isAtMention: boolean;
		link?: string;
		id?: string;
		did?: string;
		atURI?: string;
	}

	function processSegments(): ProcessedSegment[] {
		// Handle undefined or empty plaintext
		const text = plaintext || '';
		const richText = new RichText({ text, facets });
		const result: ProcessedSegment[] = [];

		for (const segment of richText.segments()) {
			const id = segment.facet?.find((f) => f.$type === 'pub.leaflet.richtext.facet#id');
			const link = segment.facet?.find((f) => f.$type === 'pub.leaflet.richtext.facet#link');
			const isBold = segment.facet?.some((f) => f.$type === 'pub.leaflet.richtext.facet#bold');
			const isCode = segment.facet?.some((f) => f.$type === 'pub.leaflet.richtext.facet#code');
			const isStrikethrough = segment.facet?.some(
				(f) => f.$type === 'pub.leaflet.richtext.facet#strikethrough'
			);
			const isDidMention = segment.facet?.find(
				(f) => f.$type === 'pub.leaflet.richtext.facet#didMention'
			);
			const isAtMention = segment.facet?.find(
				(f) => f.$type === 'pub.leaflet.richtext.facet#atMention'
			);
			const isUnderline = segment.facet?.some(
				(f) => f.$type === 'pub.leaflet.richtext.facet#underline'
			);
			const isItalic = segment.facet?.some((f) => f.$type === 'pub.leaflet.richtext.facet#italic');
			const isHighlighted = segment.facet?.some(
				(f) => f.$type === 'pub.leaflet.richtext.facet#highlight'
			);
			const isMath = segment.facet?.some((f) => f.$type === 'pub.leaflet.richtext.facet#math');

			// Split text by newlines and mark br elements - handle undefined segment.text
			const segmentText = segment.text || '';
			const textParts = segmentText.split('\n');
			const parts = textParts.flatMap((part, i) =>
				i < textParts.length - 1
					? [
							{ text: part, isBr: false },
							{ text: '', isBr: true }
						]
					: [{ text: part, isBr: false }]
			);

			result.push({
				parts,
				isBold: isBold || false,
				isItalic: isItalic || false,
				isUnderline: isUnderline || false,
				isStrikethrough: isStrikethrough || false,
				isCode: isCode || false,
				isHighlighted: isHighlighted || false,
				isMath: isMath || false,
				isDidMention: !!isDidMention,
				isAtMention: !!isAtMention,
				link: link?.uri,
				id: id?.id,
				did: isDidMention?.did,
				atURI: isAtMention?.atURI
			});
		}

		return result;
	}

	const segments = $derived(processSegments());
</script>

{#each segments as segment, i}
	{#each segment.parts as part, j}
		{#if part.isBr}
			<br />
		{:else if segment.isMath}
			<InlineMath tex={part.text} {hasTheme} />
		{:else}
			{@const classes = [
				segment.isCode ? 'inline-code' : '',
				segment.id ? 'scroll-mt-12 scroll-mb-10' : '',
				segment.isBold ? 'font-bold' : '',
				segment.isItalic ? 'italic' : '',
				segment.isUnderline ? 'underline' : '',
				segment.isStrikethrough ? 'line-through decoration-tertiary' : '',
				segment.isHighlighted ? 'highlight' : ''
			]
				.filter(Boolean)
				.join(' ')}

			{#if segment.isCode}
				<code class={classes} id={segment.id}>{part.text}</code>
			{:else if segment.isDidMention}
				<a
					href={`https://leaflet.pub/p/${segment.did}`}
					target="_blank"
					rel="noopener noreferrer"
					class="no-underline"
				>
					<span class="mention {classes}" class:themed={hasTheme}>{part.text}</span>
				</a>
			{:else if segment.isAtMention}
				<a
					href={segment.atURI}
					target="_blank"
					rel="noopener noreferrer"
					class="hover:underline {classes}"
					class:themed={hasTheme}
				>
					{part.text}
				</a>
			{:else if segment.link}
				<a
					href={segment.link.trim()}
					class="hover:underline {classes}"
					class:themed={hasTheme}
					target="_blank"
					rel="noopener noreferrer"
				>
					{part.text}
				</a>
			{:else}
				<span class={classes} id={segment.id}>{part.text}</span>
			{/if}
		{/if}
	{/each}
{/each}

<style>
	.mention {
		cursor: pointer;
		color: rgb(0 0 225);
		padding: 0 0.125rem;
		border-radius: 0.25rem;
		background-color: color-mix(in oklab, rgb(0 0 225), transparent 80%);
		border: 1px solid transparent;
		display: inline;
		white-space: normal;
	}

	.mention.themed {
		color: var(--theme-accent);
		background-color: color-mix(in oklab, var(--theme-accent), transparent 80%);
	}

	a {
		color: rgb(0 0 225);
	}

	a.themed {
		color: var(--theme-accent);
	}

	.inline-code {
		display: inline;
		font-size: 1em;
		background-color: color-mix(in oklab, currentColor, transparent 90%);
		font-family: ui-monospace, monospace;
		padding: 1px;
		margin: -1px;
		border-radius: 4px;
		box-decoration-break: clone;
		-webkit-box-decoration-break: clone;
	}

	.highlight {
		padding: 1px;
		margin: -1px;
		border-radius: 4px;
		box-decoration-break: clone;
		-webkit-box-decoration-break: clone;
		background-color: rgb(255, 177, 177);
	}
</style>
