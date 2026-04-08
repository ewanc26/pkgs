<script lang="ts">
	interface Props {
		/** Snippet for action items */
		children: import('svelte').Snippet;
		/** Position of the action bar */
		position?: 'left' | 'bottom' | 'right';
		/** Has theme applied */
		hasTheme?: boolean;
		/** Sticky positioning */
		sticky?: boolean;
	}

	const { children, position = 'left', hasTheme = false, sticky = false }: Props = $props();
</script>

<div
	class="action-bar {position}"
	class:themed={hasTheme}
	class:sticky
>
	{@render children()}
</div>

<style>
	.action-bar {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem;
		border-radius: 0.5rem;
		background-color: rgb(255 255 255);
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
	}

	.action-bar.themed {
		background-color: var(--theme-page-background, var(--theme-background));
	}

	.action-bar.left {
		flex-direction: column;
		align-items: center;
	}

	.action-bar.bottom {
		flex-direction: row;
		align-items: center;
	}

	.action-bar.right {
		flex-direction: column;
		align-items: center;
	}

	.action-bar.sticky {
		position: sticky;
	}

	.action-bar.left.sticky {
		top: 1rem;
	}

	.action-bar.bottom.sticky {
		bottom: 1rem;
	}

	.action-bar :global(button) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 9999px;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.action-bar :global(button:hover) {
		background-color: rgb(243 244 246);
	}

	.action-bar.themed :global(button:hover) {
		background-color: color-mix(in srgb, var(--theme-foreground) 10%, transparent);
	}
</style>
