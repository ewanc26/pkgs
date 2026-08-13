<script lang="ts">
	/**
	 * Shimmering placeholder block for content that's still filling in
	 * (e.g. artist enrichment growing a list in real time). Sized via
	 * width/height props or the parent's layout — this is deliberately a
	 * plain block, not a specific shape.
	 */
	let {
		width = '100%',
		height = '1rem',
		rounded = 'rounded'
	}: { width?: string; height?: string; rounded?: string } = $props();
</script>

<div
	class="animate-pulse bg-[var(--surface-2)] {rounded}"
	style="width: {width}; height: {height};"
	aria-hidden="true"
></div>
