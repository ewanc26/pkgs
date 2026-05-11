<script lang="ts">
	import type { DateRangePreset } from '$lib/analysis/date-range';
	import { PRESET_LABELS } from '$lib/analysis/date-range';

	let { value = $bindable('all') }: { value: DateRangePreset } = $props();

	const PRESETS: DateRangePreset[] = ['7d', '30d', '90d', '365d', 'all'];
</script>

<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Date range">
	{#each PRESETS as preset (preset)}
		<button
			class="rounded-full border px-3 py-1 text-xs font-medium transition-colors {value === preset
				? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
				: 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]'}"
			onclick={() => (value = preset)}
			role="radio"
			aria-checked={value === preset}
		>
			{PRESET_LABELS[preset]}
		</button>
	{/each}
</div>
