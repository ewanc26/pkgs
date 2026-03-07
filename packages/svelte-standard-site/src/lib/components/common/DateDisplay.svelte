<script lang="ts">
	interface Props {
		date: string;
		label?: string;
		class?: string;
		showIcon?: boolean;
		style?: string;
		locale?: string;
	}

	let { date, label, class: className = '', showIcon = false, style, locale }: Props = $props();

	function formatDate(dateString: string): string {
		// Use browser's locale if not specified
		const userLocale = locale || navigator.language || 'en-US';

		return new Date(dateString).toLocaleDateString(userLocale, {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<time datetime={date} class={className} {style}>
	{#if showIcon}
		<svg class="inline size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
			/>
		</svg>
	{/if}
	{#if label}{label}{/if}
	{formatDate(date)}
</time>
