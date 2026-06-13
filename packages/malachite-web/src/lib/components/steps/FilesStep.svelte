<script lang="ts">
  import { ArrowLeft, ArrowRight, CheckCircle2, Music2, Disc3, Apple, Youtube } from '@lucide/svelte';

  let {
    lastfmFiles  = $bindable<File[]>([]),
    spotifyFiles = $bindable<File[]>([]),
    appleFiles   = $bindable<File[]>([]),
    youtubeFiles = $bindable<File[]>([]),
    needs,
    oncontinue,
    onback,
  }: {
    lastfmFiles:  File[];
    spotifyFiles: File[];
    appleFiles:   File[];
    youtubeFiles: File[];
    needs: { lastfm: boolean; spotify: boolean; apple: boolean; youtube: boolean; files: boolean };
    oncontinue: () => void;
    onback: () => void;
  } = $props();

  let lfDragging = $state(false);
  let spDragging = $state(false);
  let amDragging = $state(false);
  let ytDragging = $state(false);

  function handleDrop(e: DragEvent, type: 'lf' | 'sp' | 'am' | 'yt') {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (type === 'lf') {
      lfDragging  = false;
      lastfmFiles = files.filter((f) => f.name.endsWith('.csv'));
    } else if (type === 'sp') {
      spDragging   = false;
      spotifyFiles = files.filter((f) => f.name.endsWith('.json'));
    } else if (type === 'am') {
      amDragging  = false;
      appleFiles  = files.filter((f) => f.name.endsWith('.csv'));
    } else if (type === 'yt') {
      ytDragging   = false;
      youtubeFiles = files.filter((f) => f.name.endsWith('.json'));
    }
  }

  let canContinue = $derived(
    (!needs.lastfm || lastfmFiles.length > 0) &&
    (!needs.spotify || spotifyFiles.length > 0) &&
    (!needs.apple || appleFiles.length > 0) &&
    (!needs.youtube || youtubeFiles.length > 0) &&
    (lastfmFiles.length > 0 || spotifyFiles.length > 0 || appleFiles.length > 0 || youtubeFiles.length > 0)
  );
</script>

<section class="card-section">
  <button class="back-btn inline-flex items-center gap-1" onclick={onback}><ArrowLeft size={13} /> Back</button>
  <h2 class="section-title">
    Upload your exports
  </h2>

  <div class="drop-zones">
    {#if needs.lastfm}
      <div
        class="drop-zone"
        class:dragging={lfDragging}
        class:filled={lastfmFiles.length > 0}
        role="button"
        tabindex="0"
        aria-label="Upload Last.fm CSV file"
        ondragover={(e) => { e.preventDefault(); lfDragging = true; }}
        ondragleave={() => (lfDragging = false)}
        ondrop={(e) => handleDrop(e, 'lf')}
        onclick={() => document.getElementById('lfInput')?.click()}
        onkeydown={(e) => e.key === 'Enter' && document.getElementById('lfInput')?.click()}
      >
        <input
          id="lfInput"
          type="file"
          accept=".csv"
          hidden
          onchange={(e) => { lastfmFiles = Array.from((e.target as HTMLInputElement).files ?? []); }}
        />
        {#if lastfmFiles.length > 0}
          <span class="drop-icon drop-done"><CheckCircle2 size={28} /></span>
          <span class="drop-filename">{lastfmFiles[0].name}</span>
          <span class="drop-meta">{(lastfmFiles[0].size / 1024).toFixed(0)} KB · CSV</span>
        {:else}
          <span class="drop-icon"><Music2 size={28} /></span>
          <span class="drop-title">Last.fm CSV</span>
          <span class="drop-hint">Drag & drop or click to select</span>
        {/if}
      </div>
    {/if}

    {#if needs.spotify}
      <div
        class="drop-zone"
        class:dragging={spDragging}
        class:filled={spotifyFiles.length > 0}
        role="button"
        tabindex="0"
        aria-label="Upload Spotify JSON files"
        ondragover={(e) => { e.preventDefault(); spDragging = true; }}
        ondragleave={() => (spDragging = false)}
        ondrop={(e) => handleDrop(e, 'sp')}
        onclick={() => document.getElementById('spInput')?.click()}
        onkeydown={(e) => e.key === 'Enter' && document.getElementById('spInput')?.click()}
      >
        <input
          id="spInput"
          type="file"
          accept=".json"
          multiple
          hidden
          onchange={(e) => { spotifyFiles = Array.from((e.target as HTMLInputElement).files ?? []); }}
        />
        {#if spotifyFiles.length > 0}
          <span class="drop-icon drop-done"><CheckCircle2 size={28} /></span>
          <span class="drop-filename">
            {spotifyFiles.length === 1 ? spotifyFiles[0].name : `${spotifyFiles.length} files selected`}
          </span>
          <span class="drop-meta">
            {spotifyFiles.length === 1
              ? `${(spotifyFiles[0].size / 1024).toFixed(0)} KB · JSON`
              : 'JSON · Streaming_History_Audio_*'}
          </span>
        {:else}
          <span class="drop-icon"><Disc3 size={28} /></span>
          <span class="drop-title">Spotify JSON</span>
          <span class="drop-hint">Select one or more JSON files</span>
        {/if}
      </div>
    {/if}

    {#if needs.apple}
      <div
        class="drop-zone"
        class:dragging={amDragging}
        class:filled={appleFiles.length > 0}
        role="button"
        tabindex="0"
        aria-label="Upload Apple Music CSV file"
        ondragover={(e) => { e.preventDefault(); amDragging = true; }}
        ondragleave={() => (amDragging = false)}
        ondrop={(e) => handleDrop(e, 'am')}
        onclick={() => document.getElementById('amInput')?.click()}
        onkeydown={(e) => e.key === 'Enter' && document.getElementById('amInput')?.click()}
      >
        <input
          id="amInput"
          type="file"
          accept=".csv"
          hidden
          onchange={(e) => { appleFiles = Array.from((e.target as HTMLInputElement).files ?? []); }}
        />
        {#if appleFiles.length > 0}
          <span class="drop-icon drop-done"><CheckCircle2 size={28} /></span>
          <span class="drop-filename">{appleFiles[0].name}</span>
          <span class="drop-meta">{(appleFiles[0].size / 1024).toFixed(0)} KB · CSV</span>
        {:else}
          <span class="drop-icon"><Apple size={28} /></span>
          <span class="drop-title">Apple Music CSV</span>
          <span class="drop-hint">Drag & drop or click to select</span>
        {/if}
      </div>
    {/if}

    {#if needs.youtube}
      <div
        class="drop-zone"
        class:dragging={ytDragging}
        class:filled={youtubeFiles.length > 0}
        role="button"
        tabindex="0"
        aria-label="Upload YouTube Music JSON files"
        ondragover={(e) => { e.preventDefault(); ytDragging = true; }}
        ondragleave={() => (ytDragging = false)}
        ondrop={(e) => handleDrop(e, 'yt')}
        onclick={() => document.getElementById('ytInput')?.click()}
        onkeydown={(e) => e.key === 'Enter' && document.getElementById('ytInput')?.click()}
      >
        <input
          id="ytInput"
          type="file"
          accept=".json"
          multiple
          hidden
          onchange={(e) => { youtubeFiles = Array.from((e.target as HTMLInputElement).files ?? []); }}
        />
        {#if youtubeFiles.length > 0}
          <span class="drop-icon drop-done"><CheckCircle2 size={28} /></span>
          <span class="drop-filename">
            {youtubeFiles.length === 1 ? youtubeFiles[0].name : `${youtubeFiles.length} files selected`}
          </span>
          <span class="drop-meta">
            {youtubeFiles.length === 1
              ? `${(youtubeFiles[0].size / 1024).toFixed(0)} KB · JSON`
              : 'JSON · Watch_History.json'}
          </span>
        {:else}
          <span class="drop-icon"><Youtube size={28} /></span>
          <span class="drop-title">YouTube Music JSON</span>
          <span class="drop-hint">Select one or more JSON files</span>
        {/if}
      </div>
    {/if}
  </div>

  <div class="how-to">
    {#if needs.lastfm}
      <details>
        <summary>How to export from Last.fm</summary>
        <p>
          Use the third-party export tool at <a href="https://lastfm.ghan.nl/export/" target="_blank" rel="noopener">
            lastfm.ghan.nl/export
          </a> to download your scrobble history as a CSV.
        </p>
      </details>
    {/if}
    {#if needs.spotify}
      <details>
        <summary>How to export from Spotify</summary>
        <p>
          Go to <a href="https://www.spotify.com/account/privacy" target="_blank" rel="noopener">
            spotify.com/account/privacy
          </a>, request "Extended streaming history", and upload all
          <code>Streaming_History_Audio_*.json</code> files.
        </p>
      </details>
    {/if}
    {#if needs.apple}
      <details>
        <summary>How to export from Apple Music</summary>
        <p>
          Go to <a href="https://privacy.apple.com/" target="_blank" rel="noopener">privacy.apple.com</a>, 
          request a copy of your data (Apple Media Services), and once ready, upload the 
          <code>Apple_Media_Services/Apple Music Activity/Apple Music - Play History Daily.csv</code> file.
        </p>
      </details>
    {/if}
    {#if needs.youtube}
      <details>
        <summary>How to export from YouTube Music</summary>
        <p>
          Go to <a href="https://takeout.google.com/" target="_blank" rel="noopener">takeout.google.com</a>, 
          deselect all and select only "YouTube and YouTube Music", choose "JSON" format, and upload the 
          <code>YouTube and YouTube Music/history/watch-history.json</code> file.
        </p>
      </details>
    {/if}
  </div>

  <button class="btn-primary inline-flex items-center gap-1" onclick={oncontinue} disabled={!canContinue}>Continue <ArrowRight size={13} /></button>
</section>

<style>
  .drop-zones {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .drop-zone {
    background: var(--surface-2);
    border: 1.5px dashed var(--border);
    border-radius: 8px;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    text-align: center;
    user-select: none;
  }

  .drop-zone:hover,
  .drop-zone.dragging { border-color: var(--accent); background: var(--accent-glow); }
  .drop-zone.filled   { border-style: solid; border-color: var(--accent); }

  .drop-icon          { color: var(--muted); display: flex; }
  .drop-icon.drop-done { color: var(--accent); }
  .drop-title         { font-size: 0.875rem; font-weight: 500; color: var(--text); }
  .drop-filename      { font-size: 0.825rem; color: var(--accent); font-family: 'JetBrains Mono', monospace; word-break: break-all; }
  .drop-meta          { font-size: 0.7rem; color: var(--muted); }
  .drop-hint          { font-size: 0.75rem; color: var(--muted); }
</style>
