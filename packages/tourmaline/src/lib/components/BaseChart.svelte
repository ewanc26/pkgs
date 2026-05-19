<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart } from '$lib/chart';
  import type { ChartConfiguration } from 'chart.js';

  let { config }: { config: ChartConfiguration } = $props();
  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  onMount(() => {
    chart = new Chart(canvas, config);
    return () => chart?.destroy();
  });

  // Update chart when config changes
  $effect(() => {
    if (chart) {
      chart.data = config.data;
      chart.options = config.options || {};
      chart.update();
    }
  });
</script>

<canvas bind:this={canvas}></canvas>
