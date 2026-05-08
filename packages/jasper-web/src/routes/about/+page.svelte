<script lang="ts">
	import { Check, X } from '@lucide/svelte';
</script>

<svelte:head>
	<title>About — Jasper</title>
	<meta name="description" content="How Jasper works, what's imported, privacy details, and OAuth scope information." />
	<link rel="canonical" href="https://jasper.croft.click/about" />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://jasper.croft.click/about" />
	<meta property="og:title" content="About — Jasper" />
	<meta property="og:description" content="How Jasper works, what's imported, privacy details, and OAuth scope information." />

	<!-- Twitter / X card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="About — Jasper" />
	<meta name="twitter:description" content="How Jasper works, what's imported, privacy details, and OAuth scope information." />
</svelte:head>

<main>
	<h1>About Jasper</h1>

	<p>
		Jasper imports your Instagram photos to <a
			href="https://grain.social"
			target="_blank"
			rel="noopener">Grain</a
		>
		or <a href="https://sprk.so" target="_blank" rel="noopener">Spark</a> while preserving original timestamps.
	</p>

	<h2>How it works</h2>
	<ol class="steps-list">
		<li>
			<span class="step-num">1</span>
			<div>
				<strong>Export</strong>
				<p>Download your Instagram data as JSON from their download page.</p>
			</div>
		</li>
		<li>
			<span class="step-num">2</span>
			<div>
				<strong>Upload</strong>
				<p>Drag your ZIP file or extracted folder into the import tool.</p>
			</div>
		</li>
		<li>
			<span class="step-num">3</span>
			<div>
				<strong>Authenticate</strong>
				<p>Sign in with your AT Protocol identity via OAuth.</p>
			</div>
		</li>
		<li>
			<span class="step-num">4</span>
			<div>
				<strong>Import</strong>
				<p>Photos are uploaded directly to Grain or Spark with original timestamps.</p>
			</div>
		</li>
	</ol>

	<h2>Privacy</h2>
	<p>
		Everything runs in your browser. Your Instagram export and photos are processed locally and
		uploaded directly to your own AT Protocol account via your PDS. No data is sent to any
		intermediate server.
	</p>
	<p>
		No cookies, no local storage, no fingerprinting.
	</p>

	<h2>What's imported</h2>
	<ul class="check-list">
		<li><Check size={16} /> Photos (JPEG, PNG, WebP, GIF)</li>
		<li><Check size={16} /> Original timestamps</li>
		<li><Check size={16} /> Captions (as alt text)</li>
		<li><Check size={16} /> Carousel posts (multiple photos)</li>
		<li><Check size={16} /> Videos (MP4, MOV) — Spark only</li>
		<li><Check size={16} /> Stories — Spark only</li>
	</ul>

	<p class="not-imported">
		<X size={16} /> <strong>Not imported:</strong> Reels. Videos and stories are not supported by Grain.
	</p>

	<h2>Getting your Instagram export</h2>
	<ol class="steps-list">
		<li>
			<span class="step-num">1</span>
			<div>
				<p>Open Instagram (app or web browser) and go to your profile</p>
			</div>
		</li>
		<li>
			<span class="step-num">2</span>
			<div>
				<p>Tap the menu (☰) → Settings → Accounts Center</p>
			</div>
		</li>
		<li>
			<span class="step-num">3</span>
			<div>
				<p>Select "Your information and permissions" → "Export your information"</p>
			</div>
		</li>
		<li>
			<span class="step-num">4</span>
			<div>
				<p>Choose "Export to device", select JSON format, and confirm with your password</p>
			</div>
		</li>
		<li>
			<span class="step-num">5</span>
			<div>
				<p>Wait for the email notification (can take hours to days) and download the ZIP file</p>
			</div>
		</li>
	</ol>

	<h2>OAuth Scope</h2>
	<p>Jasper requests minimal permissions based on your target platform:</p>
	<p><strong>Grain:</strong></p>
	<code
		>atproto blob:*/* repo:social.grain.photo repo:social.grain.gallery
		repo:social.grain.gallery.item</code
	>
	<p><strong>Spark:</strong></p>
	<code>atproto blob:*/* repo:so.sprk.feed.post repo:so.sprk.story.post</code>
	<p>
		This allows uploading photos as blobs and writing to the relevant collections. Your Bluesky
		profile is read directly from your PDS.
	</p>

	<h2>Source</h2>
	<p>
		Jasper is open source: <a
			href="https://github.com/ewanc26/pkgs/tree/main/packages/jasper"
			target="_blank"
			rel="noopener">github.com/ewanc26/pkgs</a
		>
	</p>
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text);
		margin: 0 0 1.5rem;
	}

	h2 {
		font-size: 1.125rem;
		font-weight: 500;
		color: var(--text);
		margin: 2.5rem 0 1rem;
	}

	p {
		color: var(--muted);
		line-height: 1.6;
		margin: 0 0 1rem;
	}

	code {
		display: inline-block;
		font-family: 'JetBrains Mono', monospace;
		background: var(--surface);
		border: 1px solid var(--border);
		padding: 0.4rem 0.75rem;
		border-radius: 6px;
		font-size: 0.8rem;
		color: var(--accent);
	}

	.check-list {
		list-style: none;
		padding: 0;
		margin: 0 0 1.5rem;
	}

	.check-list li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0;
		color: var(--accent);
	}

	.not-imported {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--muted);
	}

	.not-imported strong {
		color: var(--text);
	}

	.steps-list {
		list-style: none;
		padding: 0;
		margin: 0 0 1.5rem;
	}

	.steps-list li {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--border);
	}

	.steps-list li:last-child {
		border-bottom: none;
	}

	.step-num {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--surface);
		border: 1.5px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		font-family: 'JetBrains Mono', monospace;
		color: var(--accent);
		flex-shrink: 0;
	}

	.steps-list strong {
		display: block;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text);
		margin-bottom: 0.15rem;
	}

	.steps-list p {
		font-size: 0.825rem;
		color: var(--muted);
		line-height: 1.5;
		margin: 0;
	}
</style>
