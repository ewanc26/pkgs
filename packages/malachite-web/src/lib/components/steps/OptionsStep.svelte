<script lang="ts">
  import { ArrowLeft, ArrowRight } from '@lucide/svelte';
  import type { ImportMode } from '$lib/types.js';

  let {
    mode,
    dryRun       = $bindable(false),
    reverseOrder = $bindable(false),
    fresh        = $bindable(false),
    batchSize    = $bindable(100),
    batchDelay   = $bindable(2000),
    aggressive   = $bindable(false),
    onstartimport,
    onback,
  }: {
    mode: ImportMode | null;
    dryRun: boolean;
    reverseOrder: boolean;
    fresh: boolean;
    batchSize: number;
    batchDelay: number;
    aggressive: boolean;
    onstartimport: () => void;
    onback: () => void;
  } = $props();
</script>

<section class="card-section">
  <button class="back-btn inline-flex items-center gap-1" onclick={onback}><ArrowLeft size={13} /> Back</button>
  <h2 class="section-title">{mode === 'deduplicate' ? 'Deduplication options' : 'Import options'}</h2>

  <div class="options">
    <div class="option-row">
      <div class="option-info">
        <span class="option-name">Dry run</span>
        <span class="option-desc">{mode === 'deduplicate' ? 'Preview duplicates that would be removed without making changes' : 'Preview what would be imported without making changes'}</span>
      </div>
      <button
        class="toggle"
        class:on={dryRun}
        onclick={() => (dryRun = !dryRun)}
        type="button"
        aria-label="Toggle dry run"
        aria-pressed={dryRun}
      >
        <span class="toggle-thumb"></span>
      </button>
    </div>

    {#if mode !== 'deduplicate'}
      <div class="option-row">
        <div class="option-info">
          <span class="option-name">Reverse order</span>
          <span class="option-desc">Process newest records first (default: oldest first)</span>
        </div>
        <button
          class="toggle"
          class:on={reverseOrder}
          onclick={() => (reverseOrder = !reverseOrder)}
          type="button"
          aria-label="Toggle reverse order"
          aria-pressed={reverseOrder}
        >
          <span class="toggle-thumb"></span>
        </button>
      </div>

      <div class="option-row">
        <div class="option-info">
          <span class="option-name">Fresh start</span>
          <span class="option-desc">Re-fetch existing records instead of using the session cache</span>
        </div>
        <button
          class="toggle"
          class:on={fresh}
          onclick={() => (fresh = !fresh)}
          type="button"
          aria-label="Toggle fresh start"
          aria-pressed={fresh}
        >
          <span class="toggle-thumb"></span>
        </button>
      </div>

      <div class="option-row">
        <div class="option-info">
          <span class="option-name">Batch size</span>
          <input type="number" bind:value={batchSize} min="10" max="500" class="num-input" />
          <span class="option-desc">Records per batch</span>
        </div>
      </div>

      <div class="option-row">
        <div class="option-info">
          <span class="option-name">Batch delay (ms)</span>
          <input type="number" bind:value={batchDelay} min="1000" class="num-input" />
          <span class="option-desc">Delay between batches</span>
        </div>
      </div>

      <div class="option-row">
        <div class="option-info">
          <span class="option-name">Aggressive mode</span>
          <span class="option-desc">Faster imports (8,500/day vs 7,500/day default)</span>
        </div>
        <button
          class="toggle"
          class:on={aggressive}
          onclick={() => (aggressive = !aggressive)}
          type="button"
          aria-label="Toggle aggressive mode"
          aria-pressed={aggressive}
        >
          <span class="toggle-thumb"></span>
        </button>
      </div>
    {/if}
  </div>

  {#if dryRun}
    <div class="alert alert-info">Dry run enabled — no records will be written to Teal.</div>
  {/if}

  <button class="btn-primary inline-flex items-center gap-1" onclick={onstartimport}>
    {#if mode === 'deduplicate'}
      {dryRun ? 'Preview duplicates' : 'Start deduplication'}
    {:else}
      {dryRun ? 'Preview import' : 'Start import'}
    {/if}
    <ArrowRight size={13} />
  </button>
</section>

<style>
  .options {
    display: flex;
    flex-direction: column;
    margin-bottom: 1.25rem;
  }

  .option-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.875rem 0;
    border-bottom: 1px solid var(--border);
  }

  .option-row:last-child { border-bottom: none; }

  .option-info  { flex: 1; }
  .option-name  { font-size: 0.875rem; color: var(--text); display: block; }
  .option-desc  { font-size: 0.75rem; color: var(--muted); display: block; margin-top: 0.15rem; }

  .num-input {
    width: 80px;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: var(--surface-1);
    color: var(--text);
    font-size: 0.875rem;
  }

  .toggle {
    width: 40px;
    height: 22px;
    border-radius: 11px;
    background: var(--surface-2);
    border: 1.5px solid var(--border);
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
    transition: background 0.2s, border-color 0.2s;
  }

  .toggle.on { background: var(--accent); border-color: var(--accent); }

  .toggle-thumb {
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--muted);
    top: 2px;
    left: 2px;
    transition: transform 0.2s, background 0.2s;
  }

  .toggle.on .toggle-thumb { transform: translateX(18px); background: #000; }
</style>
