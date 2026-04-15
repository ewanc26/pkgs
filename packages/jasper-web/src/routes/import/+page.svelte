<script lang="ts">
	import { onMount } from 'svelte';
	import { initOAuth, signInWithOAuth } from '$lib/core/oauth';
	import { Agent } from '@atproto/api';
	import { Upload, Eye, Loader2 } from '@lucide/svelte';

	let agent: Agent | null = $state(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let handle = $state('');
	let file = $state<File | null>(null);
	let dryRun = $state(false);

	onMount(async () => {
		try {
			agent = await initOAuth();
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	});

	async function signIn() {
		if (!handle.trim()) return;
		error = null;
		try {
			await signInWithOAuth(handle);
		} catch (e) {
			error = (e as Error).message;
		}
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			file = target.files[0];
		}
	}
</script>

<svelte:head>
	<title>Import — Jasper</title>
</svelte:head>

<main>
	{#if loading}
		<div class="loading">
			<Loader2 class="spin" size={24} />
			<p>Loading...</p>
		</div>
	{:else if !agent}
		<div class="card auth-card">
			<h2>Sign in</h2>
			<p>Sign in with your AT Protocol identity to import photos.</p>
			
			{#if error}
				<p class="error">{error}</p>
			{/if}

			<div class="auth-form">
				<input 
					type="text" 
					bind:value={handle} 
					placeholder="your.handle"
					onkeydown={(e) => e.key === 'Enter' && signIn()}
				/>
				<button onclick={signIn}>Sign in with OAuth</button>
			</div>
		</div>
	{:else}
		<div class="card">
			<h2>Welcome</h2>
			<p>Signed in as <strong>{agent.did}</strong></p>
		</div>

		<div class="card">
			<h2>Upload your Instagram export</h2>
			<p>Drag your ZIP file or extracted folder here.</p>

			<label class="file-drop">
				<input
					type="file"
					accept=".zip,application/zip"
					onchange={handleFileChange}
				/>
				{#if file}
					<span>Selected: {file.name}</span>
				{:else}
					<span class="file-drop-content">
						<Upload size={32} />
						<span>Drop ZIP file or click to browse</span>
					</span>
				{/if}
			</label>

			<label class="checkbox">
				<input type="checkbox" bind:checked={dryRun} />
				Dry run (preview without importing)
			</label>

			<button disabled={!file} class="btn primary">
				{dryRun ? 'Preview' : 'Import'}
			</button>
		</div>
	{/if}
</main>

<style>
	.loading {
		text-align: center;
		padding: 4rem 2rem;
		color: var(--muted);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	.spin {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	.auth-card {
		max-width: 400px;
		margin: 2rem auto;
	}
	.auth-form {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.auth-form input {
		flex: 1;
		padding: 0.6rem 1rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--fg);
	}
	.auth-form input:focus {
		outline: none;
		border-color: var(--accent);
	}
	.auth-form button {
		padding: 0.6rem 1.2rem;
		background: var(--accent);
		color: var(--bg);
		border: none;
		border-radius: 6px;
		font-weight: 500;
	}
	.file-drop {
		display: block;
		padding: 3rem;
		border: 2px dashed var(--border);
		border-radius: 8px;
		text-align: center;
		cursor: pointer;
		margin: 1rem 0;
		transition: border-color 0.2s;
	}
	.file-drop:hover {
		border-color: var(--accent);
	}
	.file-drop input {
		display: none;
	}
	.file-drop-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		color: var(--muted);
	}
	.checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 1rem 0;
		cursor: pointer;
	}
	.btn {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn.primary {
		background: var(--accent);
		color: var(--bg);
	}
	.btn.primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.error {
		color: var(--error);
		padding: 0.5rem;
		background: rgba(243, 139, 168, 0.1);
		border-radius: 4px;
	}
</style>
