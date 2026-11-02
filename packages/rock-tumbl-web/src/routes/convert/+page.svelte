<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowLeft, LogIn, LogOut, RefreshCw, Download } from '@lucide/svelte';
	import { SupportSection } from '@ewanc26/landing-ui';
	import type { Agent } from '@atproto/api';
	import { initOAuth, signInWithOAuth } from '$lib/core/oauth';

	type Mode = 'convert';

	// ── OAuth state ───────────────────────────────────────────────────────────
	const HANDLE_KEY = 'rock-tumbl:signed-in-handle';

	let agent = $state<Agent | null>(null);
	let authHandle = $state('');
	let authLoading = $state(true);
	let authError = $state('');
	/**
	 * The OAuth Agent only exposes a DID, so the handle typed at sign-in is
	 * stashed across the authorisation redirect purely for display.
	 */
	let signedInHandle = $state('');
	let signedInAs = $derived(signedInHandle || agent?.did || 'signed in');

	onMount(async () => {
		try {
			agent = await initOAuth();
			if (agent) {
				signedInHandle = sessionStorage.getItem(HANDLE_KEY) ?? '';
			}
		} catch (e: any) {
			console.warn('[rock-tumbl] OAuth init failed:', e);
		} finally {
			authLoading = false;
		}
	});

	async function doLogin() {
		if (!authHandle.trim()) return;
		authError = '';
		try {
			try {
				sessionStorage.setItem(HANDLE_KEY, authHandle.trim());
			} catch {
				// sessionStorage unavailable — the DID is shown instead.
			}
			await signInWithOAuth(authHandle.trim());
		} catch (e: any) {
			authError = e.message || 'Sign-in failed';
		}
	}

	function doLogout() {
		localStorage.clear();
		sessionStorage.clear();
		window.location.reload();
	}

	async function logToolkitUse(count: number) {
		if (!agent) return;
		try {
			await agent.com.atproto.repo.createRecord({
				repo: agent.assertDid,
				collection: 'click.croft.toolkit.use',
				record: {
					$type: 'click.croft.toolkit.use',
					tool: {
						$type: 'click.croft.tools.rock-tumbl',
						documentsConverted: count
					},
					createdAt: new Date().toISOString()
				}
			});
		} catch (e) {
			console.warn('[rock-tumbl] Failed to log toolkit usage:', e);
		}
	}

	// ── Convert state ─────────────────────────────────────────────────────────
	let uploading = $state(false);
	let result = $state<any>(null);
	let errorMsg = $state('');
	let showNotice = $state(false);
	let noticeText = $state('');
	let noticeType = $state<'success' | 'error'>('success');
	let fileInput: HTMLInputElement | null = null;
	let siteUrl = $state('');
	let includePrivate = $state(false);

	const handleConvert = async (e: Event) => {
		e.preventDefault();
		if (!fileInput?.files?.length) {
			showNotice = true;
			noticeText = 'Please select a Tumblr export ZIP file';
			noticeType = 'error';
			setTimeout(() => {
				showNotice = false;
			}, 5000);
			return;
		}
		if (!siteUrl.trim()) {
			showNotice = true;
			noticeText = 'Please enter a Standard.site publication URL';
			noticeType = 'error';
			setTimeout(() => {
				showNotice = false;
			}, 5000);
			return;
		}

		uploading = true;
		errorMsg = '';
		result = null;

		const formData = new FormData();
		formData.append('input', fileInput.files[0]);
		formData.append('site', siteUrl.trim());
		formData.append('include-private', String(includePrivate));

		try {
			const resp = await fetch('/api/convert', {
				method: 'POST',
				body: formData
			});

			if (!resp.ok) {
				const err = await resp.json();
				throw new Error(err.message || 'Conversion failed');
			}

			result = await resp.json();
			const count = result.documents?.length ?? 0;
			showNotice = true;
			noticeText = `${count} document(s) converted successfully`;
			noticeType = 'success';
			setTimeout(() => {
				showNotice = false;
			}, 5000);

			// Log use if signed in — best-effort, never fails the conversion.
			if (agent) {
				await logToolkitUse(count);
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Conversion failed';
			showNotice = true;
			noticeText = errorMsg;
			noticeType = 'error';
			setTimeout(() => {
				showNotice = false;
			}, 5000);
		} finally {
			uploading = false;
		}
	};

	const downloadResult = () => {
		if (!result?.documents) return;
		const json = JSON.stringify(result.documents, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'rock-tumbl-documents.json';
		a.click();
		URL.revokeObjectURL(url);
	};
</script>

<svelte:head>
	<title>Convert — rock-tumbl</title>
	<meta
		name="description"
		content="Upload your Tumblr export ZIP and convert it into Standard.site documents."
	/>
	<link rel="canonical" href="https://rock-tumbl.croft.click/convert" />
</svelte:head>

<main>
	<div class="header-row">
		<a href="/" class="back-btn inline-flex items-center gap-1">
			<ArrowLeft size={14} />
			Home
		</a>

		<div class="auth-box">
			{#if authLoading}
				<div class="auth-loading">
					<RefreshCw size={12} class="spin" />
				</div>
			{:else if agent}
				<div class="auth-user">
					<span class="user-handle" title={agent.did}>{signedInAs}</span>
					<button class="btn-ghost-icon" onclick={doLogout} title="Sign out">
						<LogOut size={14} />
					</button>
				</div>
			{:else}
				<div class="auth-login">
					<input
						type="text"
						bind:value={authHandle}
						placeholder="handle.bsky.social"
						class="auth-input"
						onkeydown={(e) => e.key === 'Enter' && doLogin()}
					/>
					<button class="btn-auth" onclick={doLogin} title="Sign in to log usage">
						<LogIn size={14} />
					</button>
				</div>
			{/if}
		</div>
	</div>

	{#if authError}
		<div class="alert alert-error auth-alert">
			{authError}
		</div>
	{/if}

	<header class="converter-header">
		<h1>Convert your export</h1>
		<p class="subtitle">Upload your Tumblr export ZIP and convert it into Standard.site documents.</p>
	</header>

	{#if !authLoading && !agent}
		<div class="alert alert-info auth-hint">
			No account needed to convert. Sign in above if you'd like your conversions counted on
			<a href="https://croft.click" target="_blank" rel="noopener">croft.click</a>.
		</div>
	{/if}

	{#if showNotice}
		<div class="alert {noticeType === 'error' ? 'alert-error' : 'alert-info'}" aria-live="polite" role="alert">
			{noticeText}
		</div>
	{/if}

	{#if errorMsg}
		<div class="alert alert-error">
			<p>{errorMsg}</p>
		</div>
	{/if}

	<div class="card-section">
		<h2 class="section-title">Your export</h2>
		<p class="section-sub">
			Drop in the ZIP you downloaded from Tumblr. Files are converted on the server and
			deleted afterwards — nothing is kept.
		</p>

		<div class="form">
			<div class="field">
				<label class="field-label" for="tumblr-input">Tumblr export ZIP</label>
				<input type="file" id="tumblr-input" accept=".zip,.zipx" bind:this={fileInput} required />
			</div>

			<div class="field">
				<label class="field-label" for="site-url">Standard.site publication URL or AT URI</label>
				<input
					type="text"
					id="site-url"
					bind:value={siteUrl}
					placeholder="https://myblog.example.com"
					required
				/>
				<span class="field-hint"
					>Use the publication URL or an AT URI pointing at a site.standard.publication
					record.</span
				>
			</div>

			<label class="toggle-row">
				<input type="checkbox" bind:checked={includePrivate} />
				Include private/draft posts
			</label>

			<button type="submit" class="btn-primary" disabled={uploading} onclick={handleConvert}>
				{#if uploading}
					<RefreshCw size={14} class="spin" /> Converting…
				{:else}
					Convert
				{/if}
			</button>
			<button
				type="button"
				class="btn-secondary"
				onclick={() => {
					result = null;
					errorMsg = '';
				}}
			>
				Clear
			</button>
		</div>
	</div>

	<details>
		<summary>Want to publish to Standard.site?</summary>
		<p>
			The web converter downloads your documents as JSON. Publishing them to your PDS —
			including creating the publication record and uploading media — is currently done
			with the <code>rock-tumbl</code> command-line tool:
		</p>
		<p>
			<code
				>rock-tumbl --input tumblr-export.zip --site https://myblog.example --publish --handle
				you.example --password xxxx-xxxx-xxxx-xxxx</code
			>
		</p>
	</details>

	{#if result}
		<div class="card-section">
			<h2 class="section-title">Results</h2>
			<p class="section-sub">
				<strong>{result.documents?.length ?? 0}</strong> document(s) converted{#if result.skipped},
					{result.skipped} skipped{/if}{#if result.errors?.length}, {result.errors.length} with
					errors{/if}{#if result.warnings?.length}, {result.warnings.length} with warnings{/if}.
			</p>
			<button class="btn-secondary" onclick={downloadResult}>
				<span class="inline-flex items-center gap-1"><Download size={14} /> Download Documents as JSON</span>
			</button>
		</div>
	{/if}

	<SupportSection name="rock-tumbl" githubUrl="https://github.com/ewanc26/pkgs/tree/main/packages/rock-tumbl" />
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
	}

	.header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.header-row .back-btn {
		margin-bottom: 0;
	}

	.auth-box {
		display: flex;
		align-items: center;
	}
	.auth-loading {
		display: flex;
		align-items: center;
		color: var(--muted);
	}
	.auth-user {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.user-handle {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		color: var(--muted);
		max-width: 12rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.btn-ghost-icon {
		background: none;
		border: none;
		color: var(--muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		padding: 0.25rem;
		transition: color 0.15s;
	}
	.btn-ghost-icon:hover {
		color: var(--text);
	}
	.auth-login {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.auth-input {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.4rem 0.6rem;
		color: var(--text);
		font-size: 1rem;
		font-family: 'JetBrains Mono', monospace;
		width: 11rem;
		max-width: 100%;
		transition: border-color 0.15s;
	}
	.auth-input:focus {
		outline: none;
		border-color: var(--accent);
	}
	.btn-auth {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.4rem;
		color: var(--muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			border-color 0.15s,
			color 0.15s;
	}
	.btn-auth:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.auth-alert {
		margin-bottom: 1rem;
	}
	.auth-hint {
		margin-bottom: 1.25rem;
	}
	.auth-hint a {
		color: var(--accent);
	}

	.converter-header {
		margin-bottom: 1.5rem;
		text-align: center;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border);
	}

	.converter-header h1 {
		font-size: clamp(1.5rem, 4vw, 2rem);
		font-weight: 600;
		color: var(--accent);
		margin-bottom: 0.5rem;
	}

	.converter-header .subtitle {
		color: var(--muted);
		font-size: 0.95rem;
		max-width: 480px;
		margin: 0 auto;
	}

	details {
		margin: 1.25rem 0;
	}
	details p + p {
		margin-top: 0.5rem;
	}

	:global(.spin) {
		animation: spin 0.6s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 480px) {
		main {
			padding: 2rem 1rem 4rem;
		}

		.header-row {
			flex-wrap: wrap;
		}

		.auth-login {
			flex: 1;
			min-width: 0;
		}

		.auth-input {
			width: 100%;
			flex: 1;
			min-width: 0;
		}
	}
</style>
