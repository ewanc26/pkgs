<script lang="ts">
	import type { Publication, AtProtoRecord } from '../types.js';
	import { getThemeVars } from '../utils/theme.js';

	interface Props {
		publication: AtProtoRecord<Publication>;
		class?: string;
	}

	const { publication, class: className = '' }: Props = $props();

	// Access value reactively through a getter
	const value = $derived(publication.value);
	const themeVars = $derived(value.basicTheme ? getThemeVars(value.basicTheme) : {});
</script>

<article
	class="rounded-lg border border-gray-200 bg-white p-6 transition-all hover:shadow-lg {className}"
	style={Object.entries(themeVars)
		.map(([k, v]) => `${k}:${v}`)
		.join(';')}
>
	<div class="mb-4 flex gap-4">
		{#if value.icon}
			<img
				src={value.icon}
				alt="{value.name} icon"
				class="size-16 flex-shrink-0 rounded-lg object-cover"
			/>
		{/if}
		<div class="flex-1">
			<h3 class="mb-2 text-xl font-semibold text-gray-900">{value.name}</h3>
			{#if value.description}
				<p class="text-sm text-gray-600">{value.description}</p>
			{/if}
		</div>
	</div>
	<a
		href={value.url}
		target="_blank"
		rel="noopener noreferrer"
		class="inline-flex items-center gap-1 font-medium transition-opacity hover:opacity-80"
		style:color={value.basicTheme ? `var(--theme-accent)` : undefined}
	>
		Visit Site
		<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
		</svg>
	</a>
</article>
