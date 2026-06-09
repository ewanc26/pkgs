<script lang="ts">
  import BaseChart from '$lib/components/BaseChart.svelte';
  import type { ListenerProfile } from '$lib/types';

  let { stats }: { stats: ListenerProfile & { years: Record<string, number> } } = $props();

  const config = $derived({
    type: 'bar' as const,
    data: {
      labels: Object.keys(stats.years),
      datasets: [{
        label: 'Scrobbles per year',
        data: Object.values(stats.years),
        backgroundColor: '#4ade80'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
</script>

<div class="h-64">
  <BaseChart config={config} />
</div>
