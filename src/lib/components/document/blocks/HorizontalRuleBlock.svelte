<script lang="ts">
	interface Props {
		hasTheme?: boolean;
	}

	const { hasTheme = false }: Props = $props();
</script>

<hr
	class="my-2 border-t"
	style:border-color={hasTheme ? 'var(--theme-accent)' : undefined}
	class:border-gray-200={!hasTheme}
	class:dark:border-gray-700={!hasTheme}
/>
