<script lang="ts">
	import { ArrowLeft, ArrowRight, Eye, EyeOff } from '@lucide/svelte';
	import { login } from '$lib/core/auth.js';
	import { signInWithOAuth } from '$lib/core/oauth.js';
	import type { Agent } from '@atproto/api';
	import {
		saveCredentials,
		loadCredentials,
		hasSavedCredentials,
	} from '$lib/core/web-cache.js';

	let {
		onauth,
		onback,
	}: {
		onauth: (agent: Agent) => void;
		onback: () => void;
	} = $props();

	// ─── tab ─────────────────────────────────────────────────────────────────────

	let tab = $state<'oauth' | 'password'>('oauth');

	// ─── OAuth state ─────────────────────────────────────────────────────────────

	let oauthHandle  = $state('');
	let oauthLoading = $state(false);
	let oauthError   = $state<string | null>(null);

	async function doOAuth() {
		oauthError   = null;
		oauthLoading = true;
		try {
			await signInWithOAuth(oauthHandle.trim());
			// Never reached — signInWithOAuth redirects away.
		} catch (err: any) {
			oauthError   = err.message ?? 'OAuth sign-in failed';
			oauthLoading = false;
		}
	}

	// ─── App-password state ───────────────────────────────────────────────────────

	let handle      = $state('');
	let password    = $state('');
	let pdsOverride = $state('');

	let showPassword = $state(false);
	let showAdvanced = $state(false);
	let authError    = $state<string | null>(null);
	let authLoading  = $state(false);
	let rememberMe   = $state(true);

	// Check for saved credentials on mount
	let savedCreds = $state<{ handle: string; password: string } | null>(null);

	// Only attempt to load saved credentials once (avoids re-reading on every reactive cycle)
	let _credsLoaded = false;

	function ensureCredsLoaded() {
		if (!_credsLoaded) {
			_credsLoaded = true;
			const c = loadCredentials();
			if (c) {
				savedCreds = c;
				handle = c.handle;
				password = c.password;
			}
		}
	}

	async function doAuth() {
		authError   = null;
		authLoading = true;
		try {
			onauth(await login(handle.trim(), password, pdsOverride.trim() || undefined));
			// Save credentials only on successful login.
			if (rememberMe) {
				saveCredentials(handle.trim(), password);
			}
		} catch (err: any) {
			authError = err.message ?? 'Login failed';
		} finally {
			authLoading = false;
		}
	}
</script>

<section class="card-section">
	<button class="back-btn inline-flex items-center gap-1" onclick={onback}><ArrowLeft size={13} /> Back</button>
	<h2 class="section-title">Sign in to ATProto</h2>

	<div class="tabs">
		<button class:active={tab === 'oauth'}    onclick={() => (tab = 'oauth')}>OAuth <span class="badge-tab">Recommended</span></button>
		<button class:active={tab === 'password'} onclick={() => { tab = 'password'; ensureCredsLoaded(); }}>App password</button>
	</div>

	{#if tab === 'oauth'}
		<p class="section-sub">
			Sign in securely through your PDS — no password is ever shared with Malachite.
		</p>

		<div class="form">
			<label class="field">
				<span class="field-label">Handle</span>
				<input
					type="text"
					bind:value={oauthHandle}
					placeholder="you.bsky.social or did:web:example.com"
					autocomplete="username"
					spellcheck="false"
					onkeydown={(e) => e.key === 'Enter' && !oauthLoading && oauthHandle && doOAuth()}
				/>
			</label>

			{#if oauthError}
				<div class="alert alert-error">{oauthError}</div>
			{/if}

			<button
				class="btn-primary"
				onclick={doOAuth}
				disabled={oauthLoading || !oauthHandle}
			>
				{#if oauthLoading}<span class="spinner"></span> Redirecting…{:else}Continue with ATProto <ArrowRight size={13} />{/if}
			</button>

			<p class="oauth-note">
				You'll be sent to your PDS to approve access, then returned here automatically.
			</p>
		</div>

	{:else}
		<p class="section-sub">
			Use your Bluesky handle and an
			<a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener">app password</a>.
		</p>

		<div class="form">
			<label class="field">
				<span class="field-label">Handle or DID</span>
				<input
					type="text"
					bind:value={handle}
					placeholder="you.bsky.social or did:web:example.com"
					autocomplete="username"
					spellcheck="false"
				/>
			</label>

			<label class="field">
				<span class="field-label">App password</span>
				<div class="password-wrap">
					<input
						type={showPassword ? 'text' : 'password'}
						bind:value={password}
						placeholder="xxxx-xxxx-xxxx-xxxx"
						autocomplete="current-password"
					/>
					<button
						class="pw-toggle"
						onclick={() => (showPassword = !showPassword)}
						type="button"
						aria-label={showPassword ? 'Hide password' : 'Show password'}
					>
						{#if showPassword}<EyeOff size={14} />{:else}<Eye size={14} />{/if}
					</button>
				</div>
			</label>

			<button
				class="expand-btn"
				onclick={() => (showAdvanced = !showAdvanced)}
				type="button"
			>
				{showAdvanced ? '▾' : '▸'} Advanced options
			</button>

			{#if showAdvanced}
				<label class="field">
					<span class="field-label">PDS URL override <span class="badge">optional</span></span>
					<input
						type="url"
						bind:value={pdsOverride}
						placeholder="https://your.pds.example"
						spellcheck="false"
					/>
					<span class="field-hint">
						Skip Slingshot identity resolution and connect directly to your PDS.
					</span>
				</label>
			{/if}

			{#if authError}
				<div class="alert alert-error">{authError}</div>
			{/if}

			{#if savedCreds}
				<div class="alert alert-info">
					Saved credentials found for <strong>{savedCreds.handle}</strong>. The password is pre-filled.
				</div>
			{/if}

			<label class="field checkbox-field">
				<input type="checkbox" bind:checked={rememberMe} />
				<span class="field-label">Remember app password (stored locally, 7-day expiry)</span>
			</label>

			<button
				class="btn-primary"
				onclick={doAuth}
				disabled={authLoading || !handle || !password}
			>
				{#if authLoading}<span class="spinner"></span> Signing in…{:else}Sign in <ArrowRight size={13} />{/if}
			</button>
		</div>
	{/if}
</section>

<style>
	/* ── Tabs ─────────────────────────────────────────────────────────────────── */
	.tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.tabs button {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.55rem 0.75rem;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--muted);
		cursor: pointer;
		font-size: 0.85rem;
		transition: border-color 0.15s, color 0.15s;
	}

	.tabs button.active {
		border-color: var(--accent);
		color: var(--text);
	}

	.badge-tab {
		font-size: 0.65rem;
		font-family: 'JetBrains Mono', monospace;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	/* ── OAuth note ───────────────────────────────────────────────────────────── */
	.oauth-note {
		font-size: 0.775rem;
		color: var(--muted);
		text-align: center;
		margin: 0;
		line-height: 1.5;
	}

	/* ── Password field ───────────────────────────────────────────────────────── */
	.pw-toggle {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: var(--muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		padding: 0;
	}

	.pw-toggle:hover { color: var(--text); }

	/* ── Checkbox field ───────────────────────────────────────────────────────── */
	.checkbox-field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.75rem 0;
		cursor: pointer;
	}

	.checkbox-field input[type="checkbox"] {
		accent-color: var(--accent);
		width: 16px;
		height: 16px;
		margin: 0;
		flex-shrink: 0;
	}

	.checkbox-field .field-label {
		font-size: 0.8rem;
		color: var(--muted);
		margin: 0;
	}
</style>
