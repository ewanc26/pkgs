<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		/** Raw markdown string — rendered client-side via unified pipeline */
		markdown?: string;
		/** Pre-rendered HTML from the server — bypasses client-side processing */
		html?: string;
		class?: string;
	}

	let { markdown, html: prerenderedHtml, class: className = '' }: Props = $props();

	let renderedHtml = $state<string>(prerenderedHtml ?? '');
	let loading = $state(!prerenderedHtml && !!markdown);

	onMount(async () => {
		if (prerenderedHtml || !markdown) return;

		try {
			const [
				{ unified },
				{ default: remarkParse },
				{ default: remarkGfm },
				{ default: remarkRehype },
				{ default: rehypeSlug },
				{ default: rehypeStringify }
			] = await Promise.all([
				import('unified'),
				import('remark-parse'),
				import('remark-gfm'),
				import('remark-rehype'),
				import('rehype-slug'),
				import('rehype-stringify')
			]);

			const processor = unified()
				.use(remarkParse)
				.use(remarkGfm)
				.use(remarkRehype)
				.use(rehypeSlug)
				.use(rehypeStringify);

			renderedHtml = String(await processor.process(markdown));
		} catch {
			// Fallback: naive paragraph split
			renderedHtml = markdown
				.split(/\n{2,}/)
				.filter(Boolean)
				.map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
				.join('\n');
		} finally {
			loading = false;
		}
	});
</script>

{#if renderedHtml}
	<div class="prose prose-lg max-w-none {className}">{@html renderedHtml}</div>
{:else if loading}
	<div class="prose prose-lg max-w-none {className} whitespace-pre-wrap opacity-70">{markdown}</div>
{/if}
