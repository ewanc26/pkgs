<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Agent } from '@atproto/api';
	import type { Platform, MicroblogPost, ConvertResult } from '@ewanc26/opal';
	import { initOAuth, signInWithOAuth } from '$lib/core/oauth.js';
	import { parseExport, runImport } from '$lib/core/import.js';

	// ─── persistence keys ────────────────────────────────────────────────────────

	const KEY_STEP = 'opal:step';
	const KEY_PLATFORM = 'opal:platform';

	// ─── wizard state ────────────────────────────────────────────────────────────

	const _initStep = Number(sessionStorage.getItem(KEY_STEP)) || 0;
	const _initPlatform = sessionStorage.getItem(KEY_PLATFORM) as Platform | null;

	let step = $state(_initStep);
	let prevStep = $state(_initStep);
	let platform = $state<Platform | null>(_initPlatform);

	let agent = $state<Agent | null>(null);
	let handle = $state('');
	let convertResult = $state<ConvertResult | null>(null);
	let selectedPosts = $state<Set<number>>(new Set());

	let isRunning = $state(false);
	let cancelled = false;
	let stopping = $state(false);
	let logs = $state<{ level: string; message: string; timestamp: number }[]>([]);
	let progress = $state<{ recordsProcessed: number; totalRecords: number; successCount: number; errorCount: number; message: string } | null>(null);
	let importError = $state<string | null>(null);
	let authError = $state<string | null>(null);

	// ─── derived ─────────────────────────────────────────────────────────────────

	let goingForward = $derived(step >= prevStep);

	// ─── navigation ──────────────────────────────────────────────────────────────

	function goTo(n: number) {
		prevStep = step;
		step = n;
		sessionStorage.setItem(KEY_STEP, String(n));
	}

	function setPlatform(p: Platform | null) {
		platform = p;
		if (p) sessionStorage.setItem(KEY_PLATFORM, p);
		else sessionStorage.removeItem(KEY_PLATFORM);
	}

	function handleSelectPlatform(p: Platform) {
		setPlatform(p);
		goTo(1);
	}

	function handleBack() {
		goTo(Math.max(0, step - 1));
	}

	// ─── auth ────────────────────────────────────────────────────────────────────

	async function handleSignIn() {
		if (!handle.trim()) return;
		authError = null;
		try {
			await signInWithOAuth(handle.trim());
		} catch (err: any) {
			if (!err.message?.includes('redirect')) {
				authError = err.message ?? 'Sign-in failed';
			}
		}
	}

	function handleAuth(a: Agent) {
		agent = a;
		goTo(2);
	}

	// ─── file parsing ───────────────────────────────────────────────────────────

	async function handleFile(file: File) {
		importError = null;
		try {
			convertResult = await parseExport(file, platform!);
			selectedPosts = new Set(convertResult.posts.map((_, i) => i));
			goTo(3);
		} catch (err: any) {
			importError = err.message ?? 'Failed to parse export file';
		}
	}

	// ─── import ──────────────────────────────────────────────────────────────────

	function addLog(level: string, message: string) {
		logs = [...logs, { level, message, timestamp: Date.now() }];
	}

	async function handleStartImport() {
		if (!agent || !convertResult) return;
		isRunning = true;
		cancelled = false;
		stopping = false;
		logs = [];
		importError = null;
		goTo(4);

		const postsToImport = convertResult.posts.filter((_, i) => selectedPosts.has(i));

		try {
			const result = await runImport(
				agent,
				postsToImport,
				false,
				{
					onLog: addLog,
					onProgress: (p) => { progress = p; },
					isCancelled: () => cancelled,
				},
			);

			const n = result.success.toLocaleString();
			if (result.cancelled) addLog('warn', `Stopped. ${n} post(s) published.`);
			else {
				addLog('success', `Import complete! ${n} post(s) published.`);
				if (result.errors > 0) addLog('warn', `${result.errors} post(s) failed.`);
			}
		} catch (err: any) {
			importError = err.message ?? 'An unexpected error occurred';
			addLog('error', `Fatal: ${importError}`);
		} finally {
			isRunning = false;
			stopping = false;
		}
	}

	// ─── OAuth callback ────────────────────────────────────────────────────────

	onMount(async () => {
		try {
			const oauthAgent = await initOAuth();
			if (oauthAgent) {
				agent = oauthAgent;
				goTo(platform ? 2 : 1);
			}
		} catch (err: any) {
			console.error('OAuth init error:', err);
		}
	});

	function handleReset() {
		setPlatform(null);
		goTo(0);
		agent = null;
		handle = '';
		convertResult = null;
		selectedPosts = new Set();
		logs = [];
		progress = null;
		importError = null;
		authError = null;
		cancelled = false;
		stopping = false;
	}
</script>

<svelte:head>
	<title>Opal — Convert to Bluesky</title>
	<meta
		name="description"
		content="Convert your microblog posts from Twitter, Mastodon, Threads, and Nostr to AT Protocol Bluesky posts."
	/>
	<link rel="canonical" href="https://opal.croft.click/import" />
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<header>
		<img src="/logo/Opal.svg" alt="Opal" width={48} height={48} class="logo-img" />
		<p class="tagline">
			Convert microblog posts to Bluesky — own your words, not the platforms'
		</p>
	</header>

	<div class="step-viewport">
		{#key step}
			<div
				class="step-slide"
				in:fly={{ x: goingForward ? 40 : -40, duration: 280, easing: cubicOut }}
				out:fly={{ x: goingForward ? -40 : 40, duration: 200, easing: cubicOut }}
			>
				{#if step === 0}
					<!-- Platform selection -->
					<section class="step">
						<h2>Choose a platform</h2>
						<p class="step-desc">Where are your posts coming from?</p>
						<div class="platform-grid">
							<button class="platform-btn" onclick={() => handleSelectPlatform('twitter')}>
								<span class="platform-name">Twitter / X</span>
								<span class="platform-desc">tweets.js archive</span>
							</button>
							<button class="platform-btn" onclick={() => handleSelectPlatform('mastodon')}>
								<span class="platform-name">Mastodon</span>
								<span class="platform-desc">outbox.json export</span>
							</button>
							<button class="platform-btn" onclick={() => handleSelectPlatform('threads')}>
								<span class="platform-name">Threads</span>
								<span class="platform-desc">JSON export</span>
							</button>
							<button class="platform-btn" onclick={() => handleSelectPlatform('nostr')}>
								<span class="platform-name">Nostr</span>
								<span class="platform-desc">event JSON array</span>
							</button>
						</div>
					</section>
				{:else if step === 1}
					<!-- Auth -->
					<section class="step">
						<h2>Sign in with ATProto</h2>
						<p class="step-desc">Enter your Bluesky handle to authenticate. Nothing is stored.</p>
						<div class="auth-form">
							<input
								type="text"
								bind:value={handle}
								placeholder="you.bsky.social"
								class="handle-input"
								onkeydown={(e) => { if (e.key === 'Enter') handleSignIn(); }}
							/>
							<button class="btn-primary" onclick={handleSignIn} disabled={!handle.trim()}>
								Sign in
							</button>
						</div>
						{#if authError}
							<p class="error">{authError}</p>
						{/if}
						<div class="step-actions">
							<button class="btn-secondary" onclick={handleBack}>← Back</button>
						</div>
					</section>
				{:else if step === 2}
					<!-- File upload -->
					<section class="step">
						<h2>Upload your export</h2>
						<p class="step-desc">
							{#if platform === 'twitter'}
								Upload your <code>tweets.js</code> file from the Twitter data export.
							{:else if platform === 'mastodon'}
								Upload your <code>outbox.json</code> from the Mastodon export.
							{:else if platform === 'threads'}
								Upload your Threads JSON export file.
							{:else if platform === 'nostr'}
								Upload your Nostr events JSON file.
							{/if}
						</p>
						<div class="file-drop">
							<input
								type="file"
								accept=".json,.js,.csv"
								onchange={(e) => {
									const target = e.target as HTMLInputElement;
									if (target.files?.[0]) handleFile(target.files[0]);
								}}
							/>
						</div>
						{#if importError}
							<p class="error">{importError}</p>
						{/if}
						<div class="step-actions">
							<button class="btn-secondary" onclick={handleBack}>← Back</button>
						</div>
					</section>
				{:else if step === 3}
					<!-- Review & import -->
					<section class="step">
						<h2>Review posts</h2>
						{#if convertResult}
							<p class="step-desc">
								{convertResult.posts.length} posts found.
								{convertResult.skipped} skipped.
								{#if convertResult.errors.length > 0}
									{convertResult.errors.length} errors.
								{/if}
							</p>
							<div class="post-list">
								{#each convertResult.posts.slice(0, 20) as post, i}
									<label class="post-item">
										<input
											type="checkbox"
											checked={selectedPosts.has(i)}
											onchange={() => {
												const next = new Set(selectedPosts);
												if (next.has(i)) next.delete(i);
												else next.add(i);
												selectedPosts = next;
											}}
										/>
										<span class="post-text">{post.text.slice(0, 100)}{post.text.length > 100 ? '…' : ''}</span>
										<span class="post-date">{post.createdAt.slice(0, 10)}</span>
									</label>
								{/each}
								{#if convertResult.posts.length > 20}
									<p class="muted">…and {convertResult.posts.length - 20} more</p>
								{/if}
							</div>
						{/if}
						<div class="step-actions">
							<button class="btn-secondary" onclick={handleBack}>← Back</button>
							<button class="btn-primary" onclick={handleStartImport}>
								Import {selectedPosts.size} posts
							</button>
						</div>
					</section>
				{:else if step === 4}
					<!-- Running -->
					<section class="step">
						<h2>{isRunning ? 'Importing…' : 'Done'}</h2>
						{#if progress}
							<div class="progress-bar">
								<div
									class="progress-fill"
									style="width: {(progress.recordsProcessed / progress.totalRecords) * 100}%"
								></div>
							</div>
							<p class="progress-text">{progress.recordsProcessed} / {progress.totalRecords}</p>
						{/if}
						<div class="log-list">
							{#each logs as log}
								<p class="log-{log.level}">{log.message}</p>
							{/each}
						</div>
						{#if importError}
							<p class="error">{importError}</p>
						{/if}
						<div class="step-actions">
							{#if isRunning}
								<button
									class="btn-secondary"
									onclick={() => {
										cancelled = true;
										stopping = true;
									}}
									disabled={stopping}
								>
									{stopping ? 'Stopping…' : 'Cancel'}
								</button>
							{:else}
								<button class="btn-primary" onclick={handleReset}>Start over</button>
							{/if}
						</div>
					</section>
				{/if}
			</div>
		{/key}
	</div>

	<footer>
		<a href="/">← Home</a>
		<span class="sep">·</span>
		<a href="https://github.com/ewanc26/pkgs/tree/main/packages/opal" target="_blank" rel="noopener">↗ GitHub</a>
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

	.step h2 {
		margin-bottom: 0.5rem;
	}

	.step-desc {
		color: var(--muted);
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
	}

	.platform-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.platform-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1.25rem 1rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--surface-0);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.platform-btn:hover {
		border-color: var(--accent);
		background: var(--surface-1);
	}

	.platform-name {
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.platform-desc {
		font-size: 0.8rem;
		color: var(--muted);
	}

	.auth-form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.handle-input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		background: var(--surface-0);
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--text);
		font-size: 0.9rem;
	}

	.handle-input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.step-actions {
		display: flex;
		justify-content: space-between;
		margin-top: 1.5rem;
	}

	.btn-primary {
		padding: 0.5rem 1.25rem;
		background: var(--accent);
		color: var(--base);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 600;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		padding: 0.5rem 1.25rem;
		background: transparent;
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 4px;
		cursor: pointer;
	}

	.file-drop {
		border: 2px dashed var(--border);
		border-radius: 4px;
		padding: 2rem;
		text-align: center;
		margin-bottom: 1rem;
	}

	.post-list {
		max-height: 400px;
		overflow-y: auto;
		border: 1px solid var(--border);
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.post-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--border);
		font-size: 0.85rem;
	}

	.post-text {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.post-date {
		color: var(--muted);
		font-size: 0.75rem;
		white-space: nowrap;
	}

	.progress-bar {
		height: 6px;
		background: var(--surface-1);
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-fill {
		height: 100%;
		background: var(--accent);
		transition: width 0.3s;
	}

	.progress-text {
		font-size: 0.8rem;
		color: var(--muted);
		margin-bottom: 1rem;
	}

	.log-list {
		max-height: 300px;
		overflow-y: auto;
		font-family: var(--font-mono, monospace);
		font-size: 0.8rem;
		margin-bottom: 1rem;
	}

	.log-info { color: var(--text); }
	.log-success { color: var(--accent); }
	.log-warn { color: #f59e0b; }
	.log-error { color: #ef4444; }
	.log-progress { color: var(--muted); }

	.error {
		color: #ef4444;
		font-size: 0.85rem;
	}

	.muted {
		color: var(--muted);
		font-size: 0.8rem;
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
