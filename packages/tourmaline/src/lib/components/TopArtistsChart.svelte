<script lang="ts">
  import BaseChart from '$lib/components/BaseChart.svelte';
  import type { TempStats } from '$lib/analysis/statsBuilder';

  let { stats }: { stats: TempStats } = $props();

  const topArtists = $derived(
    Object.entries(stats.seenArtists)
      .sort((a, b) => b[1].scrobbles.length - a[1].scrobbles.length)
      .slice(0, 10)
  );

  const config = $derived({
    type: 'bar' as const,
    data: {
      labels: topArtists.map(a => a[0]),
      datasets: [{
        label: 'Plays',
        data: topArtists.map(a => a[1].scrobbles.length),
        backgroundColor: '#60a5fa'
      }]
    },
    options: {
      indexAxis: 'y' as const,
      responsive: true,
      maintainAspectRatio: false
    }
  });
</script>

<div class="h-64">
  <BaseChart config={config} />
</div>
