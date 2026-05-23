<script lang="ts">
	import { ArrowLeft, Check, X } from '@lucide/svelte';
</script>

<svelte:head>
	<title>About — Opal</title>
	<meta name="description" content="How Opal works, supported platforms, privacy details, OAuth scope, and licence information." />
	<link rel="canonical" href="https://opal.croft.click/about" />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://opal.croft.click/about" />
	<meta property="og:title" content="About — Opal" />
	<meta property="og:description" content="How Opal works, supported platforms, privacy details, OAuth scope, and licence information." />

	<!-- Twitter / X card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="About — Opal" />
	<meta name="twitter:description" content="How Opal works, supported platforms, privacy details, OAuth scope, and licence information." />
</svelte:head>

<main>
	<a href="/" class="back inline-flex items-center gap-1"><ArrowLeft size={13} /> Back</a>

	<h1>About Opal</h1>

	<p>
		Opal converts your microblog posts from Twitter, Mastodon, Threads, and Nostr to
		<a href="https://bsky.social" target="_blank" rel="noopener">Bluesky</a>
		while preserving original timestamps.
	</p>

	<h2>How it works</h2>
	<ol class="steps-list">
		<li>
			<span class="step-num">1</span>
			<div>
				<strong>Choose a platform</strong>
				<p>Pick Twitter, Mastodon, Threads, or Nostr.</p>
			</div>
		</li>
		<li>
			<span class="step-num">2</span>
			<div>
				<strong>Authenticate</strong>
				<p>Sign in with your AT Protocol identity via OAuth. Nothing is stored.</p>
			</div>
		</li>
		<li>
			<span class="step-num">3</span>
			<div>
				<strong>Upload your export</strong>
				<p>Drop in your archive file — everything is processed locally in your browser.</p>
			</div>
		</li>
		<li>
			<span class="step-num">4</span>
			<div>
				<strong>Import</strong>
				<p>Opal publishes your posts to your PDS with automatic rate-limit handling.</p>
			</div>
		</li>
	</ol>

	<!-- ── Privacy & data ─────────────────────────────────────────────────── -->
	<section>
		<h2>Privacy &amp; data</h2>

		<div class="card">
			<div class="pill pill-good">No tracking</div>
			<div class="pill pill-good">No accounts</div>
			<div class="pill pill-good">No server storage</div>
		</div>

		<p>
			Opal runs entirely in your browser. Your export files are parsed locally — they are
			never uploaded to any server run by this project.
		</p>
		<p>
			The only network requests made are:
		</p>
		<ul>
			<li>
				<strong>Your PDS</strong> — Opal authenticates directly with your Personal Data
				Server and publishes records there on your behalf, exactly as any other ATProto client
				would. If you sign in via OAuth, Opal also creates a record in your repository using the
				<code>click.croft.toolkit.use</code> lexicon each time you perform an import. This record
				contains the number of posts imported and a timestamp, helping you track your activity
				across the croft.click suite.
			</li>
			<li>
				<strong>Google Fonts</strong> — the layout loads Inter and JetBrains Mono via Google
				Fonts. If you prefer not to make this request, you can self-host the fonts or use a
				content-blocking extension.
			</li>
		</ul>
		<p>
			No cookies, no local storage, no fingerprinting.
		</p>
	</section>

	<!-- ── Supported platforms ────────────────────────────────────────────── -->
	<section>
		<h2>Supported platforms</h2>

		<h3>Twitter / X</h3>
		<p>
			Import your tweet archive from Twitter's data export file. Supports tweets, retweets,
			and quote tweets with facets.
		</p>

		<h3>Mastodon</h3>
		<p>
			Convert your ActivityPub outbox or CSV export from any Mastodon instance. Handles
			content warnings, media attachments, and poll metadata.
		</p>

		<h3>Threads</h3>
		<p>
			Bring over your Threads posts from Meta's data export. Supports text posts and
			media attachments.
		</p>

		<h3>Nostr</h3>
		<p>
			Convert your Nostr text notes (kind 1 events) to Bluesky posts.
		</p>

		<h3>What's converted</h3>
		<ul class="check-list">
			<li><Check size={16} /> Posts with original timestamps</li>
			<li><Check size={16} /> Links, mentions, and hashtags as facets</li>
			<li><Check size={16} /> Media attachments (images)</li>
			<li><Check size={16} /> Reply threads (where resolvable)</li>
			<li><Check size={16} /> Content warnings (Mastodon)</li>
		</ul>

		<p class="not-imported">
			<X size={16} /> <strong>Not converted:</strong> Videos, polls, DMs, bookmarks, and
			circle-only posts.
		</p>
	</section>

	<!-- ── OAuth scope ─────────────────────────────────────────────────────── -->
	<section>
		<h2>OAuth scope</h2>
		<p>Opal requests minimal permissions to publish posts:</p>
		<code>atproto repo:app.bsky.feed.post repo:click.croft.toolkit.use</code>
		<p>
			This allows reading your profile, writing posts to your repository, and logging tool
			usage. Your Bluesky profile is read directly from your PDS.
		</p>
	</section>

	<!-- ── CLI / Local usage ──────────────────────────────────────────────── -->
	<section>
		<h2>CLI / Local usage</h2>
		<p>
			Opal also ships as a Node.js command-line tool. This is useful if you prefer to
			run imports locally, need full control over batch settings, or want to automate things
			with scripts.
		</p>

		<h3>Prerequisites</h3>
		<ul>
			<li><a href="https://nodejs.org" target="_blank" rel="noopener">Node.js</a> v18 or later</li>
			<li><a href="https://pnpm.io" target="_blank" rel="noopener">pnpm</a> (recommended) — or npm / yarn</li>
		</ul>

		<h3>Install &amp; build</h3>
		<div class="code-block">
			<pre><code># Clone the repository
git clone https://github.com/ewanc26/pkgs.git
cd pkgs/packages/opal

# Install dependencies
pnpm install

# Build
pnpm build</code></pre>
		</div>

		<h3>Usage</h3>
		<div class="code-block">
			<pre><code># Interactive mode
pnpm start

# Import from Twitter archive
pnpm start -i tweets.js -h alice.bsky.social -p xxxx-xxxx-xxxx-xxxx -y

# Import from Mastodon outbox
pnpm start -i outbox.json -m mastodon -h alice.bsky.social -p xxxx-xxxx-xxxx-xxxx -y

# Sync (skip already-imported records)
pnpm start -i tweets.js -m sync -h alice.bsky.social -p xxxx-xxxx-xxxx-xxxx -y

# Preview without publishing
pnpm start -i tweets.js --dry-run</code></pre>
		</div>

		<h3>Key flags</h3>
		<div class="flag-table">
			<div class="flag-row flag-row--header">
				<span>Flag</span><span>Description</span>
			</div>
			<div class="flag-row"><code>-i &lt;path&gt;</code><span>Input file or directory</span></div>
			<div class="flag-row"><code>-h &lt;handle&gt;</code><span>ATProto handle or DID</span></div>
			<div class="flag-row"><code>-p &lt;password&gt;</code><span>App password (not your main password)</span></div>
			<div class="flag-row"><code>-m &lt;mode&gt;</code><span><code>twitter</code> · <code>mastodon</code> · <code>threads</code> · <code>nostr</code> · <code>sync</code></span></div>
			<div class="flag-row"><code>-y</code><span>Skip confirmation prompts</span></div>
			<div class="flag-row"><code>--dry-run</code><span>Preview without writing records</span></div>
			<div class="flag-row"><code>-v</code><span>Verbose / debug output</span></div>
			<div class="flag-row"><code>-q</code><span>Quiet mode (warnings &amp; errors only)</span></div>
		</div>

		<p>
			Full documentation is available at
			<a href="https://docs.ewancroft.uk/projects/opal" target="_blank" rel="noopener">docs.ewancroft.uk/projects/opal</a>.
		</p>
	</section>

	<!-- ── Rate limits ─────────────────────────────────────────────────────── -->
	<section>
		<h2>Rate limits &amp; PDS safety</h2>
		<p>
			ATProto PDS instances enforce rate limits on write operations. Exceeding them can
			temporarily affect all users on a shared PDS. Opal protects against this by:
		</p>
		<ul>
			<li>Reading the <code>ratelimit-*</code> headers from each response</li>
			<li>Maintaining a 15% headroom buffer before the quota ceiling</li>
			<li>Automatically adjusting batch size (up to 200 records) in real time</li>
			<li>Pausing immediately when the abort signal fires if you press Cancel</li>
		</ul>
	</section>

	<!-- ── Licence ────────────────────────────────────────────────────────── -->
	<section>
		<h2>Licence</h2>
		<p>
			Opal is free software released under the
			<a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener">
				GNU Affero General Public License v3.0
			</a> (AGPL-3.0-only).
		</p>
		<p>
			In short: you are free to use, modify, and redistribute this software, but any modified
			version you run as a network service must also be released under the same licence with
			its source code made available.
		</p>
		<p>
			The full licence text is included in the
			<a href="https://github.com/ewanc26/pkgs/tree/main/packages/opal/LICENCE" target="_blank" rel="noopener">
				repository
			</a>.
		</p>
	</section>

	<!-- ── Credits ────────────────────────────────────────────────────────── -->
	<section>
		<h2>Credits</h2>

		<h3>Created by</h3>
		<div class="person-card">
			<div class="person-info">
				<span class="person-name">Ewan Croft</span>
				<span class="person-role">Author &amp; maintainer</span>
			</div>
			<div class="person-links">
				<a href="https://github.com/ewanc26" target="_blank" rel="noopener">GitHub</a>
				<a href="https://ewancroft.uk/support">Support</a>
				<a href="https://ewancroft.uk" target="_blank" rel="noopener">Website</a>
			</div>
		</div>

		<h3>Contributors</h3>
		<p class="contrib-note">
			Contributions via
			<a href="https://github.com/ewanc26/pkgs/tree/main/packages/opal" target="_blank" rel="noopener">
				GitHub
			</a>
			are always welcome. The full contributor list is maintained there.
		</p>

		<h3>Dependencies</h3>
		<ul class="deps">
			<li>
				<a href="https://github.com/bluesky-social/atproto" target="_blank" rel="noopener">@atproto/api</a>
				— ATProto client
			</li>
			<li>
				<a href="https://svelte.dev" target="_blank" rel="noopener">Svelte / SvelteKit</a>
				— UI framework
			</li>
			<li>
				<a href="https://lucide.dev" target="_blank" rel="noopener">Lucide</a>
				— icons
			</li>
			<li>
				<a href="https://tailwindcss.com" target="_blank" rel="noopener">Tailwind CSS</a>
				— utility styles
			</li>
			<li>
				<a href="https://bsky.social" target="_blank" rel="noopener">Bluesky</a>
				— the <code>app.bsky.*</code> lexicon this tool publishes to
			</li>
		</ul>
	</section>

</main>

<style>
	main {
		max-width: 680px;
		margin: 0 auto;
		padding: 3rem 1.5rem 5rem;
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 600;
		letter-spacing: -0.03em;
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

	ul {
		padding-left: 1.25rem;
		margin: 0 0 0.75rem;
	}

	li {
		font-size: 0.875rem;
		color: var(--muted);
		line-height: 1.7;
		margin-bottom: 0.4rem;
	}

	strong {
		color: var(--text);
		font-weight: 500;
	}

	code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.82em;
		color: var(--accent);
		background: var(--surface-2);
		padding: 0.1em 0.35em;
		border-radius: 3px;
	}

	a {
		color: var(--muted);
	}

	a:hover {
		color: var(--accent);
	}

	section {
		margin-bottom: 2.75rem;
		padding-bottom: 2.75rem;
		border-bottom: 1px solid var(--border);
	}

	section:last-of-type {
		border-bottom: none;
	}

	/* ── Steps list ──────────────────────────────────────────────────────── */
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

	/* ── Code blocks ──────────────────────────────────────────────────────── */
	.code-block {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow-x: auto;
		margin: 0 0 1rem;
	}

	.code-block pre {
		margin: 0;
		padding: 1rem 1.25rem;
	}

	.code-block code {
		background: none;
		padding: 0;
		font-size: 0.8rem;
		color: var(--text);
		line-height: 1.7;
	}

	/* ── Flag table ──────────────────────────────────────────────────────── */
	.flag-table {
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
		margin: 0 0 1rem;
		font-size: 0.85rem;
	}

	.flag-row {
		display: grid;
		grid-template-columns: 10rem 1fr;
		gap: 1rem;
		padding: 0.55rem 1rem;
		border-bottom: 1px solid var(--border);
		align-items: center;
	}

	.flag-row:last-child {
		border-bottom: none;
	}

	.flag-row--header {
		background: var(--surface-2);
		font-size: 0.72rem;
		font-family: 'JetBrains Mono', monospace;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
	}

	.flag-row code {
		background: none;
		padding: 0;
		color: var(--accent);
		font-size: 0.82em;
	}

	.flag-row span {
		color: var(--muted);
	}

	/* ── Pills ──────────────────────────────────────────────────────────── */
	.card {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.pill {
		font-size: 0.72rem;
		font-family: 'JetBrains Mono', monospace;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		border: 1px solid;
	}

	.pill-good {
		color: var(--accent);
		border-color: rgba(167, 243, 208, 0.35);
		background: var(--accent-glow);
	}

	/* ── Check list ──────────────────────────────────────────────────────── */
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

	/* ── Person card ──────────────────────────────────────────────────────── */
	.person-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 0.875rem 1rem;
	}

	.person-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.person-name {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text);
	}

	.person-role {
		font-size: 0.75rem;
		color: var(--muted);
	}

	.person-links {
		display: flex;
		gap: 0.75rem;
	}

	.person-links a {
		font-size: 0.8rem;
		color: var(--muted);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.person-links a:hover {
		color: var(--accent);
	}

	/* ── Contrib note ──────────────────────────────────────────────────────── */
	.contrib-note {
		font-size: 0.875rem;
		color: var(--muted);
	}

	/* ── Deps list ──────────────────────────────────────────────────────── */
	.deps {
		list-style: none;
		padding: 0;
	}

	.deps li {
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border);
	}

	.deps li:last-child {
		border-bottom: none;
	}

	@media (max-width: 480px) {
		.person-card {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
