<script lang="ts">
  import { ArrowLeft, ArrowRight, CheckCircle2, Music2, Disc3, Apple, Youtube, Waves } from '@lucide/svelte';
  import { LISTENBRAINZ_ACCEPT } from '$lib/core/listenbrainz.js';
  import { fetchLastFmAsFile, type LastFmFetchProgress } from '$lib/core/csv.js';
  import { saveLastFmApi, loadLastFmApi } from '$lib/core/web-cache.js';

  /** A ListenBrainz export is a .zip of per-month .jsonl files. */
  const LB_EXTENSIONS = ['.zip', '.json', '.jsonl'];
  const isListenBrainzFile = (f: File) =>
    LB_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext));

  let {
    lastfmFiles  = $bindable<File[]>([]),
    spotifyFiles = $bindable<File[]>([]),
    appleFiles   = $bindable<File[]>([]),
    youtubeFiles = $bindable<File[]>([]),
    listenbrainzFiles = $bindable<File[]>([]),
    needs,
    oncontinue,
    onback,
  }: {
    lastfmFiles:  File[];
    spotifyFiles: File[];
    appleFiles:   File[];
    youtubeFiles: File[];
    listenbrainzFiles: File[];
    needs: { lastfm: boolean; spotify: boolean; apple: boolean; youtube: boolean; listenbrainz: boolean; files: boolean };
    oncontinue: () => void;
    onback: () => void;
  } = $props();

  let lfDragging = $state(false);
  let spDragging = $state(false);
  let amDragging = $state(false);
  let ytDragging = $state(false);
  let lbDragging = $state(false);

  // ─── Last.fm live fetch ────────────────────────────────────────────────────
  const savedLastFm = loadLastFmApi();
  let lfShowFetch  = $state(false);
  let lfUsername   = $state(savedLastFm?.username ?? '');
  let lfApiKey     = $state(savedLastFm?.apiKey ?? '');
  let lfFetching   = $state(false);
  let lfFetchError = $state<string | null>(null);
  let lfProgress   = $state<LastFmFetchProgress | null>(null);
  let lfAbort: AbortController | null = null;

  async function handleFetchLastFm() {
    if (!lfUsername.trim() || !lfApiKey.trim() || lfFetching) return;
    lfFetching = true;
    lfFetchError = null;
    lfProgress = null;
    lfAbort = new AbortController();
    try {
      const file = await fetchLastFmAsFile(lfUsername, lfApiKey, {
        signal: lfAbort.signal,
        onProgress: (p) => { lfProgress = p; },
      });
      lastfmFiles = [file];
      saveLastFmApi(lfUsername.trim(), lfApiKey.trim());
      lfShowFetch = false;
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        lfFetchError = err?.message ?? 'Failed to fetch scrobbles from Last.fm.';
      }
    } finally {
      lfFetching = false;
      lfAbort = null;
    }
  }

  function handleCancelFetch() {
    lfAbort?.abort();
  }

  function handleDrop(e: DragEvent, type: 'lf' | 'sp' | 'am' | 'yt' | 'lb') {
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
    } else if (type === 'lb') {
      lbDragging   = false;
      listenbrainzFiles = files.filter(isListenBrainzFile);
    }
  }

  let canContinue = $derived(
    (!needs.lastfm || lastfmFiles.length > 0) &&
    (!needs.spotify || spotifyFiles.length > 0) &&
    (!needs.apple || appleFiles.length > 0) &&
    (!needs.youtube || youtubeFiles.length > 0) &&
    (!needs.listenbrainz || listenbrainzFiles.length > 0) &&
    (lastfmFiles.length > 0 || spotifyFiles.length > 0 || appleFiles.length > 0 || youtubeFiles.length > 0 || listenbrainzFiles.length > 0)
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

    {#if needs.listenbrainz}
      <div
        class="drop-zone"
        class:dragging={lbDragging}
        class:filled={listenbrainzFiles.length > 0}
        role="button"
        tabindex="0"
        aria-label="Upload ListenBrainz export"
        ondragover={(e) => { e.preventDefault(); lbDragging = true; }}
        ondragleave={() => (lbDragging = false)}
        ondrop={(e) => handleDrop(e, 'lb')}
        onclick={() => document.getElementById('lbInput')?.click()}
        onkeydown={(e) => e.key === 'Enter' && document.getElementById('lbInput')?.click()}
      >
        <input
          id="lbInput"
          type="file"
          accept={LISTENBRAINZ_ACCEPT}
          multiple
          hidden
          onchange={(e) => { listenbrainzFiles = Array.from((e.target as HTMLInputElement).files ?? []); }}
        />
        {#if listenbrainzFiles.length > 0}
          <span class="drop-icon drop-done"><CheckCircle2 size={28} /></span>
          <span class="drop-filename">
            {listenbrainzFiles.length === 1
              ? listenbrainzFiles[0].name
              : `${listenbrainzFiles.length} files selected`}
          </span>
          <span class="drop-meta">
            {(listenbrainzFiles.reduce((n, f) => n + f.size, 0) / 1024 / 1024).toFixed(1)} MB
          </span>
        {:else}
          <span class="drop-icon"><Waves size={28} /></span>
          <span class="drop-title">ListenBrainz export</span>
          <span class="drop-hint">Drop the .zip, or select the .jsonl files</span>
        {/if}
      </div>
    {/if}
  </div>

  {#if needs.lastfm && lastfmFiles.length === 0}
    <div class="lastfm-fetch">
      {#if !lfShowFetch}
        <button type="button" class="lastfm-fetch-toggle" onclick={() => (lfShowFetch = true)}>
          Or fetch scrobbles directly from Last.fm →
        </button>
      {:else}
        <div class="lastfm-fetch-form">
          <p class="lastfm-fetch-title">Fetch directly from Last.fm</p>
          <p class="lastfm-fetch-hint">
            Requires a free personal API key from
            <a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener">last.fm/api/account/create</a>.
            It's stored only in this browser and sent directly to Last.fm — never to a Malachite server.
          </p>
          <div class="lastfm-fetch-fields">
            <input
              type="text"
              placeholder="Last.fm username"
              autocomplete="off"
              bind:value={lfUsername}
              disabled={lfFetching}
            />
            <input
              type="password"
              placeholder="Last.fm API key"
              autocomplete="off"
              bind:value={lfApiKey}
              disabled={lfFetching}
            />
          </div>
          {#if lfFetching}
            <div class="lastfm-fetch-progress">
              <span class="spinner"></span>
              <span>
                {#if lfProgress}
                  Fetching page {lfProgress.page} of {lfProgress.totalPages} — {lfProgress.fetched.toLocaleString()} scrobble(s) so far…
                {:else}
                  Fetching…
                {/if}
              </span>
              <button type="button" class="lastfm-fetch-cancel" onclick={handleCancelFetch}>Cancel</button>
            </div>
          {:else}
            <div class="lastfm-fetch-actions">
              <button
                type="button"
                class="btn-secondary"
                onclick={handleFetchLastFm}
                disabled={!lfUsername.trim() || !lfApiKey.trim()}
              >
                Fetch scrobbles
              </button>
              <button type="button" class="lastfm-fetch-cancel" onclick={() => (lfShowFetch = false)}>Cancel</button>
            </div>
          {/if}
          {#if lfFetchError}
            <p class="lastfm-fetch-error">{lfFetchError}</p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <div class="how-to">
    {#if needs.lastfm}
      <details>
        <summary>How to export from Last.fm</summary>
        <p>
          Malachite can <button type="button" class="link-btn" onclick={() => (lfShowFetch = true)}>fetch your scrobbles directly</button>
          — no export needed. If you'd rather export a CSV yourself, use
          <a href="https://lastfmstats.com" target="_blank" rel="noopener">lastfmstats.com</a>:
          enter your username, then use its Export button to download your scrobble history as a CSV.
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
    {#if needs.listenbrainz}
      <details>
        <summary>How to export from ListenBrainz</summary>
        <p>
          Go to your <a href="https://listenbrainz.org/settings/export/" target="_blank" rel="noopener">
            ListenBrainz export settings
          </a> and use "Download Listens". Upload the .zip exactly as downloaded —
          it contains one .jsonl file per month, and all of them are imported.
          Individual .json or .jsonl files work too.
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

  /* ─── Last.fm live fetch ────────────────────────────────────────────────── */
  .lastfm-fetch { margin: -0.5rem 0 1.25rem; }

  .lastfm-fetch-toggle {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.8rem;
    color: var(--muted);
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
  .lastfm-fetch-toggle:hover { color: var(--accent); }

  .lastfm-fetch-form {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem 1.1rem;
  }

  .lastfm-fetch-title { font-size: 0.85rem; font-weight: 500; color: var(--text); margin: 0 0 0.3rem; }
  .lastfm-fetch-hint  { font-size: 0.75rem; color: var(--muted); line-height: 1.5; margin: 0 0 0.75rem; }
  .lastfm-fetch-hint a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }

  .lastfm-fetch-fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .lastfm-fetch-fields input {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.5rem 0.65rem;
    font-size: 0.825rem;
    color: var(--text);
  }
  .lastfm-fetch-fields input:focus { outline: none; border-color: var(--accent); }

  .lastfm-fetch-actions { display: flex; align-items: center; gap: 0.75rem; }

  .lastfm-fetch-progress {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.8rem;
    color: var(--muted);
  }

  .lastfm-fetch-cancel {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.78rem;
    color: var(--muted);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
  .lastfm-fetch-cancel:hover { color: var(--text); }

  .lastfm-fetch-error {
    font-size: 0.78rem;
    color: #e5534b;
    margin: 0.6rem 0 0;
  }

  .link-btn {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
</style>
