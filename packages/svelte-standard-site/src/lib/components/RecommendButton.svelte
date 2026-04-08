<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		/** AT-URI of the document */
		documentUri: string;
		/** Initial recommend count */
		count?: number;
		/** Whether current user has recommended */
		recommended?: boolean;
		/** Has theme applied */
		hasTheme?: boolean;
		/** On recommend callback */
		onRecommend?: () => Promise<void>;
		/** On unrecommend callback */
		onUnrecommend?: () => Promise<void>;
	}

	const {
		documentUri,
		count = 0,
		recommended = false,
		hasTheme = false,
		onRecommend,
		onUnrecommend
	}: Props = $props();

	let isRecommended = $state(recommended);
	let recommendCount = $state(count);
	let isLoading = $state(false);

	async function toggleRecommend() {
		if (isLoading) return;
		isLoading = true;

		try {
			if (isRecommended) {
				if (onUnrecommend) {
					await onUnrecommend();
				}
				isRecommended = false;
				recommendCount = Math.max(0, recommendCount - 1);
			} else {
				if (onRecommend) {
					await onRecommend();
				}
				isRecommended = true;
				recommendCount += 1;
			}
		} catch (error) {
			console.error('Failed to toggle recommend:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<button
	class="recommend-button"
	class:recommended={isRecommended}
	class:themed={hasTheme}
	class:loading={isLoading}
	onclick={toggleRecommend}
	disabled={isLoading}
	aria-label={isRecommended ? 'Remove recommendation' : 'Recommend'}
	aria-pressed={isRecommended}
>
	<span class="icon">
		{#if isRecommended}
			<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
				<path
					d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"
				/>
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
				/>
			</svg>
		{/if}
	</span>
	{#if recommendCount > 0}
		<span class="count">{recommendCount}</span>
	{/if}
</button>

<style>
	.recommend-button {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		border-radius: 9999px;
		border: 1px solid rgb(229 231 235);
		background-color: transparent;
		color: rgb(107 114 128);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.recommend-button:hover:not(:disabled) {
		background-color: rgb(249 250 251);
		border-color: rgb(209 213 219);
	}

	.recommend-button.recommended {
		color: rgb(239 68 68);
		border-color: rgb(254 202 202);
		background-color: rgb(254 242 242);
	}

	.recommend-button.recommended:hover:not(:disabled) {
		background-color: rgb(254 226 226);
	}

	.recommend-button.themed {
		border-color: color-mix(in srgb, var(--theme-foreground) 20%, transparent);
		color: var(--theme-foreground);
	}

	.recommend-button.themed:hover:not(:disabled) {
		background-color: color-mix(in srgb, var(--theme-foreground) 5%, transparent);
	}

	.recommend-button.themed.recommended {
		color: var(--theme-accent);
		border-color: var(--theme-accent);
		background-color: color-mix(in srgb, var(--theme-accent) 10%, transparent);
	}

	.recommend-button.themed.recommended:hover:not(:disabled) {
		background-color: color-mix(in srgb, var(--theme-accent) 20%, transparent);
	}

	.recommend-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.count {
		font-weight: 500;
	}
</style>
