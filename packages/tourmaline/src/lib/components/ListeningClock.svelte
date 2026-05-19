<script lang="ts">
  import BaseChart from '$lib/components/BaseChart.svelte';
  import type { TempStats } from '$lib/analysis/statsBuilder';

  let { stats }: { stats: TempStats } = $props();

  const config = $derived({
    type: 'radar' as const,
    data: {
      labels: Object.keys(stats.hours).map(h => `${h}:00`),
      datasets: [{
        label: 'Scrobbles by hour',
        data: Object.values(stats.hours),
        backgroundColor: 'rgba(74, 222, 128, 0.2)',
        borderColor: '#4ade80'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true
        }
      }
    }
  });
</script>

<div class="h-64">
  <BaseChart config={config} />
</div>
