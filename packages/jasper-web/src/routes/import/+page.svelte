<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Agent } from '@atproto/api';
	import { initOAuth, signInWithOAuth } from '$lib/core/oauth';
	import { Upload, Loader2, ArrowRight } from '@lucide/svelte';

	let step = $state(0);
	let prevStep = $state(0);

	let agent = $state<Agent | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let handle = $state('');
	let file = $state<File | null>(null);
	let dryRun = $state(false);

	let isRunning = $state(false);
	let logs = $state<{ level: string; message: string }[]>([]);
	let progress = $state<{ current: number; total: number } | null>(null);
	let result = $state<{ success: number; errors: number } | null>(null);

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

	async function handleStartImport() {
		if (!agent || !file) return;
		isRunning = true;
		logs = [];
		result = null;
		goTo(2);

		// Placeholder for actual import logic
		logs.push({ level: 'info', message: 'Import functionality coming soon...' });
		logs.push({ level: 'info', message: `File: ${file.name}` });
		logs.push({ level: 'info', message: `Agent: ${agent.did}` });

		// Simulate completion
		setTimeout(() => {
			result = { success: 0, errors: 0 };
			logs.push({ level: 'success', message: dryRun ? 'Dry run complete' : 'Import complete' });
			isRunning = false;
		}, 2000);
	}

	function handleReset() {
		goTo(0);
		file = null;
		dryRun = false;
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
	<meta name="description" content="Import your Instagram photos to Grain.social" />
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<header>
		<p class="logo-text">Jasper</p>
		<p class="tagline">Import Instagram photos to Grain.social</p>
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
						<h2 class="section-title">Upload your export</h2>
						<p class="section-sub">Signed in as <strong>{agent?.did}</strong></p>

						<label class="file-drop">
							<input
								type="file"
								accept=".zip,application/zip"
								onchange={handleFileChange}
							/>
							{#if file}
								<span class="file-name">{file.name}</span>
							{:else}
								<span class="file-prompt">
									<Upload size={28} />
									<span>Drop ZIP file or click to browse</span>
								</span>
							{/if}
						</label>

						<label class="checkbox-line">
							<input type="checkbox" bind:checked={dryRun} />
							<span class="field-hint">Dry run (preview without importing)</span>
						</label>

						<div class="actions">
							<button class="btn-secondary" onclick={() => { agent = null; goTo(0); }}>
								Sign out
							</button>
							<button class="btn-primary" disabled={!file} onclick={handleStartImport}>
								{dryRun ? 'Preview' : 'Import'} <ArrowRight size={16} />
							</button>
						</div>
					</div>

				{:else if step === 2}
					<div class="card-section">
						<h2 class="section-title">{dryRun ? 'Previewing' : 'Importing'}</h2>

						{#if isRunning}
							<div class="running-indicator">
								<Loader2 class="spin" size={18} />
								<span>Processing...</span>
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
									{result.success} photo(s) {dryRun ? 'would be ' : ''}imported.
								</p>
							</div>
							<button class="btn-primary" onclick={handleReset}>
								Start new import
							</button>
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
		<a href="https://github.com/ewanc26/pkgs/tree/main/packages/jasper" target="_blank" rel="noopener">↗ GitHub</a>
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

	.logo-text {
		font-family: 'JetBrains Mono', monospace;
		font-size: 1.5rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		color: var(--text);
		margin: 0 0 0.25rem;
	}

	.tagline {
		color: var(--muted);
		font-size: 0.875rem;
		margin: 0;
	}

	.step-viewport { display: grid; overflow: hidden; }
	.step-slide    { grid-area: 1 / 1; min-width: 0; }

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
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
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

	.checkbox-line {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 1rem 0;
		cursor: pointer;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.actions button {
		flex: 1;
	}

	.running-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--accent);
		margin-bottom: 1rem;
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

	.log-info { color: var(--muted); }
	.log-success { color: var(--accent); }
	.log-error { color: var(--error); }
	.log-warn { color: var(--warn); }

	.result-summary {
		margin: 1.5rem 0;
	}

	footer {
		text-align: center;
		font-size: 0.78rem;
		color: var(--muted);
		margin-top: 2rem;
	}

	footer a { color: var(--muted); text-decoration: underline; text-underline-offset: 3px; }
	footer a:hover { color: var(--accent); }
	.sep { margin: 0 0.4rem; }
</style>
