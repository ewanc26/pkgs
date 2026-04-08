<script lang="ts">
	interface Props {
		/** Text to display as watermark */
		text?: string;
		/** Publication name */
		publicationName?: string;
		/** Publication URL */
		publicationUrl?: string;
		/** Position of watermark */
		position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
		/** Opacity (0-1) */
		opacity?: number;
		/** Has theme applied */
		hasTheme?: boolean;
	}

	const {
		text,
		publicationName,
		publicationUrl,
		position = 'bottom-right',
		opacity = 0.6,
		hasTheme = false
	}: Props = $props();

	// Display text - prefer explicit text, then publication name
	const displayText = $derived(text || publicationName || 'Leaflet');
</script>

<div
	class="watermark {position}"
	class:themed={hasTheme}
	style:opacity={opacity}
>
	{#if publicationUrl && !text}
		<a
			href={publicationUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="watermark-link"
		>
			{displayText}
		</a>
	{:else}
		<span class="watermark-text">{displayText}</span>
	{/if}
</div>

<style>
	.watermark {
		position: fixed;
		padding: 0.5rem 1rem;
		font-size: 0.75rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		pointer-events: none;
		z-index: 100;
	}

	.bottom-right {
		bottom: 1rem;
		right: 1rem;
	}

	.bottom-left {
		bottom: 1rem;
		left: 1rem;
	}

	.bottom-center {
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
	}

	.watermark-text {
		color: rgb(107 114 128);
	}

	.watermark-link {
		color: rgb(107 114 128);
		text-decoration: none;
		pointer-events: auto;
		transition: color 0.15s;
	}

	.watermark-link:hover {
		color: rgb(0 0 225);
	}

	.watermark.themed .watermark-text,
	.watermark.themed .watermark-link {
		color: var(--theme-foreground);
	}

	.watermark.themed .watermark-link:hover {
		color: var(--theme-accent);
	}
</style>
