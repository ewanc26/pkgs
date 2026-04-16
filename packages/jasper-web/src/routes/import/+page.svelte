<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Agent } from '@atproto/api';
	import { initOAuth, signInWithOAuth } from '$lib/core/oauth';
	import {
		runImport,
		fetchUserGalleries,
		createNewGallery,
		fetchOrphanPhotos,
		organizeOrphanPhotos,
		type GalleryInfo,
		type OrphanPhoto
	} from '@ewanc26/jasper/browser';
	import logo from '$lib/assets/favicon.svg';
	import { Upload, Loader2, ArrowRight, FolderOpen, Image, AlertTriangle } from '@lucide/svelte';

	let step = $state(0);
	let prevStep = $state(0);

	let agent = $state<Agent | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let handle = $state('');
	let file = $state<File | null>(null);
	let dryRun = $state(false);
	let batchSize = $state(100);

	// Gallery state
	let galleries = $state<GalleryInfo[]>([]);
	let selectedGalleryUri = $state<string | null>(null);
	let newGalleryTitle = $state('');
	let newGalleryDescription = $state('');
	let showNewGalleryForm = $state(false);
	let loadingGalleries = $state(false);

	// Orphan state
	let orphans = $state<OrphanPhoto[]>([]);
	let loadingOrphans = $state(false);
	let showOrphanStep = $state(false);
	let orphanGalleryUri = $state<string | null>(null);
	let orphanProgress = $state<{ current: number; total: number } | null>(null);

	let isRunning = $state(false);
	let logs = $state<{ level: string; message: string }[]>([]);
	let progress = $state<{ current: number; total: number } | null>(null);
	let result = $state<{ success: number; errors: number; photosImported?: number; galleryItemsCreated?: number } | null>(null);

	let goingForward = $derived(step >= prevStep);

	function goTo(n: number) {
		prevStep = step;
		step = n;
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			file = target.files[0];
		}
	}

	async function signIn() {
		if (!handle.trim()) return;
		error = null;
		try {
			await signInWithOAuth(handle);
		} catch (e) {
			error = (e as Error).message;
		}
	}

	async function loadGalleries() {
		if (!agent) return;
		loadingGalleries = true;
		try {
			galleries = await fetchUserGalleries(agent);
		} catch (e) {
			console.error('Failed to load galleries:', e);
		} finally {
			loadingGalleries = false;
		}
	}

	async function loadOrphans() {
		if (!agent) return;
		loadingOrphans = true;
		try {
			orphans = await fetchOrphanPhotos(agent);
		} catch (e) {
			console.error('Failed to load orphans:', e);
		} finally {
			loadingOrphans = false;
		}
	}

	async function handleCreateGallery() {
		if (!agent || !newGalleryTitle.trim()) return;
		error = null;
		try {
			const result = await createNewGallery(agent, newGalleryTitle, newGalleryDescription || undefined, dryRun);
			if (result.success && result.uri) {
				selectedGalleryUri = result.uri;
				showNewGalleryForm = false;
				await loadGalleries();
			} else {
				error = result.error || 'Failed to create gallery';
			}
		} catch (e) {
			error = (e as Error).message;
		}
	}

	async function handleSelectGallery(uri: string) {
		selectedGalleryUri = uri;
	}

	async function handleStartImport() {
		if (!agent || !file) return;
		isRunning = true;
		logs = [];
		result = null;
		goTo(3);

		try {
			const importResult = await runImport(
				agent,
				file,
				dryRun,
				selectedGalleryUri,
				batchSize,
				(current, total) => {
					progress = { current, total };
				},
				(level, message) => {
					logs = [...logs, { level, message }];
				}
			);

			result = {
				success: importResult.photosImported || importResult.success,
				errors: importResult.errors,
				photosImported: importResult.photosImported,
				galleryItemsCreated: importResult.galleryItemsCreated
			};
			logs = [
				...logs,
				{ level: 'success', message: dryRun ? 'Dry run complete' : 'Import complete' }
			];
		} catch (error) {
			logs = [...logs, { level: 'error', message: `Import failed: ${error}` }];
			result = { success: 0, errors: 1 };
		} finally {
			isRunning = false;
			progress = null;
		}
	}

	async function handleOrganizeOrphans() {
		if (!agent || !orphanGalleryUri || orphans.length === 0) return;
		isRunning = true;
		logs = [];
		result = null;
		goTo(5);

		try {
			const orgResult = await organizeOrphanPhotos(
				agent,
				orphanGalleryUri,
				orphans.map(o => o.uri),
				dryRun,
				(current, total) => {
					orphanProgress = { current, total };
				},
				(level, message) => {
					logs = [...logs, { level, message }];
				}
			);

			result = { success: orgResult.success, errors: orgResult.errors };
			logs = [
				...logs,
				{ level: 'success', message: dryRun ? 'Dry run complete' : 'Orphans organized' }
			];
		} catch (error) {
			logs = [...logs, { level: 'error', message: `Organization failed: ${error}` }];
			result = { success: 0, errors: 1 };
		} finally {
			isRunning = false;
			orphanProgress = null;
		}
	}

	function handleReset() {
		goTo(1);
		file = null;
		dryRun = false;
		selectedGalleryUri = null;
		logs = [];
		result = null;
	}

	function handleResetOrphans() {
		goTo(0);
		orphans = [];
		orphanGalleryUri = null;
		logs = [];
		result = null;
	}

	onMount(async () => {
		try {
			agent = await initOAuth();
			if (agent) {
				goTo(1);
			}
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Import — Jasper</title>
	<meta
		name="description"
		content="Import Instagram photos to Grain.social from your browser and keep your own data under your control."
	/>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<header>
		<img src={logo} alt="Jasper" width={48} height={48} class="logo-img" />
		<p class="tagline">
			Import Instagram photos to Grain.social without giving your data to a middleman
		</p>
	</header>

	<div class="step-viewport">
		{#key step}
			<div
				class="step-slide"
				in:fly={{ x: goingForward ? 40 : -40, duration: 280, easing: cubicOut }}
				out:fly={{ x: goingForward ? -40 : 40, duration: 200, easing: cubicOut }}
			>
				{#if loading}
					<div class="card-section loading-card">
						<Loader2 class="spin" size={24} />
						<p>Loading...</p>
					</div>
				{:else if step === 0}
					<div class="card-section">
						<h2 class="section-title">Sign in</h2>
						<p class="section-sub">Sign in with your AT Protocol identity to import photos.</p>

						{#if error}
							<p class="alert alert-error">{error}</p>
						{/if}

						<div class="field">
							<input
								type="text"
								bind:value={handle}
								placeholder="your.handle"
								onkeydown={(e) => e.key === 'Enter' && signIn()}
							/>
						</div>
						<button class="btn-primary" onclick={signIn}>
							Sign in with OAuth <ArrowRight size={16} />
						</button>
					</div>
				{:else if step === 1}
					<div class="card-section">
						<h2 class="section-title">Choose import type</h2>
						<p class="section-sub">Signed in as <strong>{agent?.did}</strong></p>

						<div class="choice-cards">
							<button class="choice-card" onclick={() => { goTo(2); loadGalleries(); }}>
								<Upload size={24} />
								<span class="choice-title">Import Instagram export</span>
								<span class="choice-desc">Upload a ZIP file from your Instagram data export</span>
							</button>

							<button class="choice-card" onclick={() => { showOrphanStep = true; goTo(4); loadOrphans(); }}>
								<FolderOpen size={24} />
								<span class="choice-title">Organize existing photos</span>
								<span class="choice-desc">Add photos from previous imports to a gallery</span>
							</button>
						</div>

						<div class="actions">
							<button
								class="btn-secondary"
								onclick={() => {
									agent = null;
									goTo(0);
								}}
							>
								Sign out
							</button>
						</div>
					</div>
				{:else if step === 2}
					<div class="card-section">
						<h2 class="section-title">Upload your export</h2>

						<label class="file-drop">
							<input type="file" accept=".zip,application/zip" onchange={handleFileChange} />
							{#if file}
								<span class="file-name">{file.name}</span>
							{:else}
								<span class="file-prompt">
									<Upload size={28} />
									<span>Drop ZIP file or click to browse</span>
								</span>
							{/if}
						</label>

						<div class="field">
							<label class="field-label">Batch size (per-day limit)</label>
							<input type="number" bind:value={batchSize} min="10" max="500" />
							<span class="field-hint">Prevents hitting blob upload limits. Default: 100</span>
						</div>

						<label class="checkbox-line">
							<input type="checkbox" bind:checked={dryRun} />
							<span class="field-hint">Dry run (preview without importing)</span>
						</label>

						<h3 class="subsection-title">Select Gallery</h3>
						<p class="section-sub">Photos will be added to the selected gallery.</p>

						{#if loadingGalleries}
							<div class="loading-inline"><Loader2 class="spin" size={18} /> Loading galleries...</div>
						{:else if galleries.length > 0}
							<div class="gallery-list">
								{#each galleries as gallery}
									<button
										class="gallery-item"
										class:selected={selectedGalleryUri === gallery.uri}
										onclick={() => handleSelectGallery(gallery.uri)}
									>
										<Image size={16} />
										<span class="gallery-title">{gallery.title}</span>
										<span class="gallery-date">{new Date(gallery.createdAt).toLocaleDateString()}</span>
									</button>
								{/each}
							</div>
						{:else}
							<p class="field-hint">No galleries yet. Create one below.</p>
						{/if}

						{#if showNewGalleryForm}
							<div class="new-gallery-form">
								<div class="field">
									<input
										type="text"
										bind:value={newGalleryTitle}
										placeholder="Gallery title"
									/>
								</div>
								<div class="field">
									<input
										type="text"
										bind:value={newGalleryDescription}
										placeholder="Description (optional)"
									/>
								</div>
								<div class="actions-inline">
									<button class="btn-secondary" onclick={() => showNewGalleryForm = false}>Cancel</button>
									<button class="btn-primary" onclick={handleCreateGallery}>Create</button>
								</div>
							</div>
						{:else}
							<button class="btn-secondary full-width" onclick={() => showNewGalleryForm = true}>
								+ Create new gallery
							</button>
						{/if}

						<div class="actions">
							<button class="btn-secondary" onclick={() => goTo(1)}>Back</button>
							<button
								class="btn-primary"
								disabled={!file || !selectedGalleryUri}
								onclick={handleStartImport}
							>
								{dryRun ? 'Preview' : 'Import'}
								<ArrowRight size={16} />
							</button>
						</div>
					</div>
				{:else if step === 3}
					<div class="card-section">
						<h2 class="section-title">{dryRun ? 'Previewing' : 'Importing'}</h2>

						{#if isRunning}
							<div class="running-indicator">
								<Loader2 class="spin" size={18} />
								<span>Processing...</span>
								{#if progress}
									<div class="progress-bar">
										<div
											class="progress-fill"
											style="width: {Math.round((progress.current / progress.total) * 100)}%"
										></div>
									</div>
									<span class="progress-text">{progress.current} / {progress.total}</span>
								{/if}
							</div>
						{/if}

						<div class="logs">
							{#each logs as log}
								<p class="log-{log.level}">{log.message}</p>
							{/each}
						</div>

						{#if result}
							<div class="result-summary">
								<p class="alert alert-info">
									{result.photosImported || result.success} photo(s) {dryRun ? 'would be ' : ''}imported.
									{#if result.galleryItemsCreated}
										<br>{result.galleryItemsCreated} gallery items created.
									{/if}
								</p>
							</div>
							<button class="btn-primary" onclick={handleReset}> Start new import </button>
						{/if}
					</div>
				{:else if step === 4}
					<div class="card-section">
						<h2 class="section-title">Organize Existing Photos</h2>
						<p class="section-sub">
							Photos imported before the gallery fix need to be linked to a gallery to display on Grain.
						</p>

						{#if loadingOrphans}
							<div class="loading-inline"><Loader2 class="spin" size={18} /> Scanning for orphan photos...</div>
						{:else if orphans.length > 0}
							<div class="alert alert-warning">
								<AlertTriangle size={16} />
								Found <strong>{orphans.length}</strong> photos not linked to any gallery.
							</div>

							<h3 class="subsection-title">Select gallery to add them to</h3>

							{#if galleries.length > 0}
								<div class="gallery-list">
									{#each galleries as gallery}
										<button
											class="gallery-item"
											class:selected={orphanGalleryUri === gallery.uri}
											onclick={() => orphanGalleryUri = gallery.uri}
										>
											<Image size={16} />
											<span class="gallery-title">{gallery.title}</span>
										</button>
									{/each}
								</div>
							{/if}

							<label class="checkbox-line">
								<input type="checkbox" bind:checked={dryRun} />
								<span class="field-hint">Dry run (preview changes)</span>
							</label>

							<div class="actions">
								<button class="btn-secondary" onclick={handleResetOrphans}>Back</button>
								<button
									class="btn-primary"
									disabled={!orphanGalleryUri}
									onclick={handleOrganizeOrphans}
								>
									{dryRun ? 'Preview' : 'Add to gallery'}
									<ArrowRight size={16} />
								</button>
							</div>
						{:else}
							<div class="alert alert-success">
								All your photos are already organized into galleries.
							</div>
							<div class="actions">
								<button class="btn-secondary" onclick={handleResetOrphans}>Back</button>
							</div>
						{/if}
					</div>
				{:else if step === 5}
					<div class="card-section">
						<h2 class="section-title">{dryRun ? 'Previewing' : 'Organizing'}</h2>

						{#if isRunning}
							<div class="running-indicator">
								<Loader2 class="spin" size={18} />
								<span>Linking photos to gallery...</span>
								{#if orphanProgress}
									<div class="progress-bar">
										<div
											class="progress-fill"
											style="width: {Math.round((orphanProgress.current / orphanProgress.total) * 100)}%"
										></div>
									</div>
									<span class="progress-text">{orphanProgress.current} / {orphanProgress.total}</span>
								{/if}
							</div>
						{/if}

						<div class="logs">
							{#each logs as log}
								<p class="log-{log.level}">{log.message}</p>
							{/each}
						</div>

						{#if result}
							<div class="result-summary">
								<p class="alert alert-info">
									{result.success} photo(s) {dryRun ? 'would be ' : ''}linked to gallery.
								</p>
							</div>
							<button class="btn-primary" onclick={handleResetOrphans}> Done </button>
						{/if}
					</div>
				{/if}
			</div>
		{/key}
	</div>

	<footer>
		<a href="/">← Home</a>
		<span class="sep">·</span>
		<a href="/about">About &amp; privacy</a>
		<span class="sep">·</span>
		<a
			href="https://github.com/ewanc26/pkgs/tree/main/packages/jasper"
			target="_blank"
			rel="noopener">↗ GitHub</a
		>
	</footer>
</main>

<style>
	main {
		max-width: 680px;
		margin: 0 auto;
		padding: 2.5rem 1.5rem 5rem;
		min-height: 100vh;
	}

	header {
		margin-bottom: 2.5rem;
		text-align: center;
	}

	.logo-img {
		display: block;
		margin: 0 auto 0.5rem;
	}

	.tagline {
		color: var(--muted);
		font-size: 0.875rem;
		margin: 0;
	}

	.step-viewport {
		display: grid;
		overflow: hidden;
	}
	.step-slide {
		grid-area: 1 / 1;
		min-width: 0;
	}

	.loading-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		text-align: center;
	}

	.spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.choice-cards {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.choice-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1.25rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 8px;
		text-align: left;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.choice-card:hover {
		border-color: var(--accent);
		background: var(--bg-hover);
	}

	.choice-title {
		font-weight: 600;
		color: var(--text);
	}

	.choice-desc {
		font-size: 0.85rem;
		color: var(--muted);
	}

	.file-drop {
		display: block;
		padding: 2.5rem;
		border: 2px dashed var(--border);
		border-radius: 8px;
		text-align: center;
		cursor: pointer;
		margin-bottom: 1rem;
		transition: border-color 0.15s;
	}

	.file-drop:hover {
		border-color: var(--accent);
	}

	.file-drop input {
		display: none;
	}

	.file-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		color: var(--muted);
	}

	.file-name {
		font-family: 'JetBrains Mono', monospace;
		color: var(--text);
	}

	.field {
		margin-bottom: 0.75rem;
	}

	.field-label {
		display: block;
		font-size: 0.85rem;
		font-weight: 500;
		margin-bottom: 0.25rem;
	}

	.field input[type="text"],
	.field input[type="number"] {
		width: 100%;
		padding: 0.6rem 0.75rem;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--text);
		font-size: 0.95rem;
	}

	.field input[type="number"] {
		max-width: 120px;
	}

	.field-hint {
		display: block;
		font-size: 0.8rem;
		color: var(--muted);
		margin-top: 0.25rem;
	}

	.checkbox-line {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 1rem 0;
		cursor: pointer;
	}

	.subsection-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 1.5rem 0 0.5rem;
	}

	.gallery-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.gallery-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 6px;
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.gallery-item:hover {
		border-color: var(--accent);
	}

	.gallery-item.selected {
		border-color: var(--accent);
		background: var(--bg-hover);
	}

	.gallery-title {
		flex: 1;
		text-align: left;
	}

	.gallery-date {
		font-size: 0.8rem;
		color: var(--muted);
	}

	.new-gallery-form {
		padding: 1rem;
		background: var(--bg-secondary);
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.loading-inline {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--muted);
		padding: 1rem 0;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.actions button {
		flex: 1;
	}

	.actions-inline {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.full-width {
		width: 100%;
	}

	.running-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		color: var(--accent);
		margin-bottom: 1rem;
	}

	.progress-bar {
		width: 100%;
		height: 4px;
		background: var(--border);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--accent);
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 0.8rem;
		font-family: 'JetBrains Mono', monospace;
	}

	.logs {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.8rem;
		line-height: 1.6;
		margin-bottom: 1rem;
	}

	.logs p {
		margin: 0;
		padding: 0.25rem 0;
	}

	.log-info {
		color: var(--muted);
	}
	.log-success {
		color: var(--accent);
	}
	.log-error {
		color: var(--error);
	}
	.log-warn {
		color: var(--warn);
	}

	.result-summary {
		margin: 1.5rem 0;
	}

	.alert {
		padding: 0.75rem 1rem;
		border-radius: 6px;
		font-size: 0.9rem;
	}

	.alert-info {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
	}

	.alert-warning {
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.3);
		color: #fbbf24;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.alert-success {
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.3);
		color: #10b981;
	}

	.alert-error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	footer {
		text-align: center;
		font-size: 0.78rem;
		color: var(--muted);
		margin-top: 2rem;
	}

	footer a {
		color: var(--muted);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	footer a:hover {
		color: var(--accent);
	}
	.sep {
		margin: 0 0.4rem;
	}
</style>
