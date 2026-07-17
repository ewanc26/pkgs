<script lang="ts">
	import { onMount } from 'svelte';
	import type { Agent } from '@atproto/api';
	import { initOAuth, signInWithOAuth } from '$lib/atproto/oauth';
	import { sharePersonality } from '$lib/share/post';
	import { renderPersonalitySvg } from '$lib/share/personality-svg';
	import type { PersonalityCardData } from '$lib/share/personality-svg';
	import { ExternalLink, ArrowLeft } from '@lucide/svelte';

	const STORAGE_KEY = 'tourmaline:share';

	let agent = $state<Agent | null>(null);
	let card = $state<PersonalityCardData | null>(null);
	let handle = $state('');
	let svgPreview = $state('');
	let profileUrl = $state('/');

	let loading = $state(true);
	let signingIn = $state(false);
	let posting = $state(false);
	let done = $state(false);
	let postUri = $state('');
	let error = $state('');

	onMount(async () => {
		// Restore personality data from sessionStorage
		const stored = sessionStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const parsed = JSON.parse(stored) as PersonalityCardData;
				card = parsed;
				svgPreview = renderPersonalitySvg(parsed);
			} catch {
				error = 'No personality data found. Go back to your profile and try again.';
			}
		} else {
			error = 'No personality data found. Go back to your profile and try again.';
		}

		// Build a link back to the profile page
		const params = new URLSearchParams(window.location.search);
		const did = params.get('did');
		const h = params.get('handle');
		if (did || h) {
			profileUrl = `/profile/${encodeURIComponent(did ?? h ?? '')}`;
		}

		// Try to restore an existing OAuth session
		try {
			agent = await initOAuth();
		} catch (e: any) {
			// OAuth init can fail if the user denied the authorization,
			// the PDS is unreachable, or the session expired.
			const msg = e?.message ?? String(e);
			if (msg.includes('denied') || msg.includes('rejected') || msg.includes('unauthorized')) {
				error = 'Authorisation was denied. You can try again or go back to your profile.';
			} else if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
				error = 'Could not reach your PDS. Check your connection and try again.';
			}
			// Silently ignore other init failures — the user just needs to sign in.
			console.warn('[tourmaline] OAuth init:', msg);
		}

		loading = false;
	});

	async function doSignIn() {
		if (!handle.trim()) return;
		signingIn = true;
		error = '';
		try {
			await signInWithOAuth(handle.trim());
		} catch (e: any) {
			const msg = e?.message ?? 'OAuth sign-in failed';
			if (msg.includes('not found') || msg.includes('resolve')) {
				error = 'Could not resolve that handle. Check it and try again.';
			} else {
				error = msg;
			}
			signingIn = false;
		}
	}

	async function doPost() {
		if (!agent || !card) return;
		posting = true;
		error = '';
		try {
			const result = await sharePersonality(agent, card);
			postUri = result.uri;

			done = true;
			sessionStorage.removeItem(STORAGE_KEY);
		} catch (e: any) {
			const msg = e?.message ?? 'Failed to post';
			if (msg.includes('blob') || msg.includes('upload')) {
				error = 'Failed to upload the image. Your PDS may not have accepted the blob.';
			} else if (msg.includes('record') || msg.includes('validation')) {
				error = 'The post record was rejected by your PDS.';
			} else if (msg.includes('network') || msg.includes('fetch')) {
				error = 'Network error while posting. Check your connection and try again.';
			} else {
				error = msg;
			}
		} finally {
			posting = false;
		}
	}

	function postUrl(): string {
		if (!postUri) return '';
		// at://did:plc:.../collection/rkey → https://aturi.to/did:plc:.../collection/rkey
		const uri = postUri.replace('at://', '');
		return `https://aturi.to/${uri}`;
	}
	function doLogout() {
		agent = null;
		sessionStorage.clear();
		window.location.reload();
	}
</script>

<svelte:head>
	<title>Share — tourmaline</title>
</svelte:head>

<div class="mx-auto max-w-lg px-3 py-8 sm:px-4">
	<div class="flex items-center justify-between">
		<h1 class="text-lg font-bold text-[var(--text)]">Share to Bluesky</h1>
		{#if agent}
			<button class="text-sm text-[var(--muted)] hover:text-[var(--text)]" onclick={doLogout}>
				Sign out
			</button>
		{/if}
	</div>

	{#if error}
		<div class="mt-4 rounded border border-red-800/30 bg-red-900/20 p-3 text-sm text-red-400">
			{error}
		</div>
	{/if}

	{#if loading}
		<div class="mt-6 flex items-center gap-3">
			<div class="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
			<span class="text-sm text-[var(--text-muted)]">Restoring session...</span>
		</div>
	{:else if done}
		<div class="mt-6 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4">
			<p class="text-sm font-medium text-[var(--accent)]">Posted!</p>
			<p class="mt-2 text-sm text-[var(--text-muted)]">Your personality profile is now on Bluesky.</p>
			<a
				href={postUrl()}
				target="_blank"
				rel="noopener"
				class="mt-3 inline-block text-sm text-[var(--accent)] underline"
			>
				View post <ExternalLink size={12} />
			</a>
		</div>
	{:else if card}
		<!-- SVG preview -->
		<div class="mt-4 rounded border border-[var(--border)]">
			{@html svgPreview}
		</div>

		{#if agent}
			<!-- Authenticated: post it -->
			<button
				class="mt-6 w-full rounded bg-[var(--accent-dim)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent)]"
				onclick={doPost}
				disabled={posting}
			>
				{#if posting}
					<span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
					Posting...
				{:else}
					Post to Bluesky
				{/if}
			</button>
		{:else}
			<!-- Not authenticated: sign in -->
			<div class="mt-6 rounded border border-[var(--border)] bg-[var(--surface)] p-4">
				<p class="text-sm text-[var(--text-muted)]">Sign in to post your personality profile.</p>

				<label class="mt-3 block">
					<span class="text-xs text-[var(--text-dim)]">Handle</span>
					<input
						type="text"
						bind:value={handle}
						placeholder="you.bsky.social"
						autocomplete="username"
						spellcheck="false"
						class="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent)] focus:outline-none"
						onkeydown={(e) => e.key === 'Enter' && !signingIn && handle && doSignIn()}
					/>
				</label>

				<button
					class="mt-3 w-full rounded bg-[var(--accent-dim)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent)] disabled:opacity-50"
					onclick={doSignIn}
					disabled={signingIn || !handle}
				>
					{#if signingIn}
						Redirecting...
					{:else}
						Sign in with AT Protocol
					{/if}
				</button>

				<p class="mt-2 text-center text-xs text-[var(--text-dim)]">
					You'll be sent to your PDS to approve access, then returned here.
				</p>
			</div>
		{/if}
	{/if}

	<div class="mt-6 text-center">
		<a href={profileUrl} class="inline-flex items-center gap-1 text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)]"><ArrowLeft size={12} /> Back to profile</a>
	</div>
</div>
