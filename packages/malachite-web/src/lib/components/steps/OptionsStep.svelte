<script lang="ts">
  import { ArrowLeft, ArrowRight } from '@lucide/svelte';
  import type { ImportMode } from '$lib/types.js';

  let {
    mode,
    dryRun       = $bindable(false),
    reverseOrder = $bindable(false),
    fresh        = $bindable(false),
    enrichFromMusicBrainz = $bindable(false),
    dangerZone = $bindable(false),
    onstartimport,
    onback,
  }: {
    mode: ImportMode | null;
    dryRun: boolean;
    reverseOrder: boolean;
    fresh: boolean;
    enrichFromMusicBrainz: boolean;
    dangerZone: boolean;
    onstartimport: () => void;
    onback: () => void;
  } = $props();
</script>

<section class="card-section">
  <button class="back-btn inline-flex items-center gap-1" onclick={onback}><ArrowLeft size={13} /> Back</button>
  <h2 class="section-title">{mode === 'deduplicate' ? 'Deduplication options' : mode === 'polish' ? 'Polish options' : 'Import options'}</h2>

  {#if mode === 'polish'}
    <div class="alert alert-info polish-note">
      Polish migrates legacy <code>fm.teal.alpha.feed.play</code> scrobbles into the production
      <code>fm.teal.feed.play</code> collection, then removes the legacy copies. No files needed.
    </div>
  {/if}

  <div class="options">
    <div class="option-row">
      <div class="option-info">
        <span class="option-name">Dry run</span>
        <span class="option-desc">{mode === 'deduplicate' ? 'Preview duplicates that would be removed without making changes' : mode === 'polish' ? 'Preview the migration without making changes' : 'Preview what would be imported without making changes'}</span>
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

    {#if mode !== 'deduplicate' && mode !== 'polish'}
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

      <div class="danger-zone">
        <div class="danger-heading">Danger Zone</div>
        <div class="option-row danger-row">
          <div class="option-info">
            <span class="option-name">Use all observed quota</span>
            <span class="option-desc">Disables Malachite's 15% safety buffer. This can rate-limit every user on the PDS. Only use this on a PDS you control.</span>
          </div>
          <button
            class="toggle danger-toggle"
            class:on={dangerZone}
            onclick={() => (dangerZone = !dangerZone)}
            type="button"
            aria-label="Toggle Danger Zone"
            aria-pressed={dangerZone}
          >
            <span class="toggle-thumb"></span>
          </button>
        </div>
        {#if dangerZone}
          <div class="danger-warning">Warning: the PDS still enforces its limit, but this may exhaust shared quota and affect other users.</div>
        {/if}
      </div>

      <div class="option-row">
        <div class="option-info">
          <span class="option-name">Look up missing artists</span>
          <span class="option-desc">
            Resolve Apple Music gaps against Apple's catalogue first, then use MusicBrainz for anything still unresolved.
            Existing Teal records are skipped before lookup, and Apple rows without a verified artist are never published.
          </span>
        </div>
        <button
          class="toggle"
          class:on={enrichFromMusicBrainz}
          onclick={() => (enrichFromMusicBrainz = !enrichFromMusicBrainz)}
          type="button"
          aria-label="Toggle artist lookup"
          aria-pressed={enrichFromMusicBrainz}
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

    {/if}
  </div>

  {#if dryRun}
    <div class="alert alert-info">Dry run enabled — no records will be written to Teal.</div>
  {/if}

  <button class="btn-primary inline-flex items-center gap-1" onclick={onstartimport}>
    {#if mode === 'deduplicate'}
      {dryRun ? 'Preview duplicates' : 'Start deduplication'}
    {:else if mode === 'polish'}
      {dryRun ? 'Preview polish' : 'Start polish'}
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

  .toggle.on { background: var(--accent); border-color: var(--accent); }
  .toggle.on .toggle-thumb { transform: translateX(18px); background: #000; }

  .polish-note { margin-bottom: 0.5rem; }
  .danger-zone { margin-top: 1rem; padding: 0 0.75rem; border: 1px solid var(--border); border-radius: 0.5rem; background: var(--surface); }
  .danger-heading { padding-top: 0.75rem; color: var(--warn); font-size: 0.8rem; font-weight: 600; }
  .danger-row { border-bottom: none; }
  .danger-toggle.on { background: var(--warn); border-color: var(--warn); }
  .danger-warning { padding: 0 0 0.75rem; color: var(--warn); font-size: 0.75rem; line-height: 1.4; }
  .polish-note code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.78em;
    color: var(--accent);
  }
</style>
