<script lang="ts">
	import { Check, X } from '@lucide/svelte';
</script>

<svelte:head>
	<title>About — Jasper</title>
</svelte:head>

<main>
	<h1>About Jasper</h1>
	
	<p>Jasper imports your Instagram photos to <a href="https://grain.social" target="_blank" rel="noopener">Grain.social</a> while preserving original timestamps.</p>

	<h2>How it works</h2>
	<ol>
		<li><strong>Export</strong> — Download your Instagram data as JSON</li>
		<li><strong>Upload</strong> — Drag your ZIP file or extracted folder</li>
		<li><strong>Authenticate</strong> — Sign in with your ATProto identity via OAuth</li>
		<li><strong>Import</strong> — Photos are uploaded directly to Grain</li>
	</ol>

	<h2>Privacy</h2>
	<p>Everything runs in your browser. Your Instagram export and photos are processed locally and uploaded directly to your own Grain account via your PDS. No data is sent to any intermediate server.</p>

	<h2>What's imported</h2>
	<ul class="check-list">
		<li><Check size={16} /> Photos (JPEG, PNG, WebP, GIF)</li>
		<li><Check size={16} /> Original timestamps</li>
		<li><Check size={16} /> Captions (as alt text)</li>
		<li><Check size={16} /> Carousel posts (multiple photos)</li>
	</ul>

	<p class="not-imported"><X size={16} /> <strong>Not imported:</strong> Videos, Stories, or Reels (not supported by Grain yet).</p>

	<h2>Getting your Instagram export</h2>
	<ol>
		<li>Go to <a href="https://accountscenter.instagram.com/info_and_permissions/dgp/" target="_blank" rel="noopener">Instagram's download page</a></li>
		<li>Request a download of your information</li>
		<li>Select "Some of your information" → "Posts" and "Archived posts"</li>
		<li>Choose JSON format</li>
		<li>Download the ZIP file when ready</li>
	</ol>

	<h2>OAuth Scope</h2>
	<p>Jasper requests minimal permissions:</p>
	<code>atproto blob:*/* repo:social.grain.photo</code>
	<p>This allows uploading photos as blobs and writing to Grain's photo collection only. No broad permissions.</p>

	<h2>Source</h2>
	<p>Jasper is open source: <a href="https://github.com/ewanc26/pkgs/tree/main/packages/jasper" target="_blank" rel="noopener">github.com/ewanc26/pkgs</a></p>
</main>

<style>
	ol, ul {
		padding-left: 1.5rem;
	}
	li {
		margin-bottom: 0.5rem;
	}
	h2 {
		margin-top: 2rem;
	}
	.check-list {
		list-style: none;
		padding-left: 0;
	}
	.check-list li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--success);
	}
	.not-imported {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--muted);
	}
	.not-imported strong {
		color: var(--fg);
	}
</style>
