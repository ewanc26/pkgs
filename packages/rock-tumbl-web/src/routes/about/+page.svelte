<script lang="ts">
	import { ArrowLeft, Check, X } from '@lucide/svelte';
</script>

<svelte:head>
	<title>About — rock-tumbl</title>
	<meta
		name="description"
		content="How rock-tumbl works, supported post types, privacy details, and licence information."
	/>
	<link rel="canonical" href="https://rock-tumbl.croft.click/about" />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://rock-tumbl.croft.click/about" />
	<meta property="og:title" content="About — rock-tumbl" />
	<meta
		property="og:description"
		content="How rock-tumbl works, supported post types, privacy details, and licence information."
	/>

	<!-- Twitter / X card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="About — rock-tumbl" />
	<meta
		property="twitter:description"
		content="How rock-tumbl works, supported post types, privacy details, and licence information."
	/>
</svelte:head>

<main>
	<a href="/" class="back inline-flex items-center gap-1"><ArrowLeft size={13} /> Back</a>

	<h1>About rock-tumbl</h1>

	<!-- ── Privacy & data ─────────────────────────────────────────────────────── -->
	<section>
		<h2>Privacy &amp; data</h2>

		<div class="card">
			<div class="pill pill-good">No tracking</div>
			<div class="pill pill-good">No accounts</div>
			<div class="pill pill-good">No stored uploads</div>
		</div>

		<p>
			Unlike the browser-only tools in this suite, rock-tumbl converts your export on
			the server: your ZIP is uploaded, parsed, and converted, and the temporary file
			is deleted afterwards. Nothing is kept — but the upload does leave your machine,
			so only convert exports you are comfortable transmitting.
		</p>
		<p>
			The only other network requests made are:
		</p>
		<ul>
			<li>
				<strong>Google Fonts</strong> — the layout loads Inter and JetBrains Mono via Google
				Fonts. If you prefer not to make this request, you can self-host the fonts or use a
				content-blocking extension.
			</li>
			<li>
				<strong>Your PDS</strong> — only if you choose to publish. Your handle and app
				password go directly to your PDS for authentication.
			</li>
		</ul>
		<p>
			No cookies, no fingerprinting.
		</p>

		<h3>Toolkit Usage Logging</h3>
		<p>
			If you choose to sign in with your AT Protocol identity, rock-tumbl will create a record in your
			own repository using the <code>click.croft.toolkit.use</code> lexicon each time you
			convert an export. This record contains only the number of documents converted
			and a timestamp, allowing you to track your activity across the croft.click suite. No
			export content or metadata is included in these usage records.
			</p>
	</section>

	<!-- ── Supported content ──────────────────────────────────────────────────── -->
	<section>
		<h2>Supported content</h2>

		<h3>Export layouts</h3>
		<p>
			Tumblr exports come in two layouts, and both are accepted — including the
			nested <code>posts.zip</code> inside the downloaded archive:
		</p>
		<ul class="check-list">
			<li><Check size={16} /> Current HTML exports (<code>posts/html/*.html</code>)</li>
			<li><Check size={16} /> Older XML exports (<code>posts/posts.xml</code>, with HTML bodies merged in when present)</li>
		</ul>

		<h3>Post types</h3>
		<ul class="check-list">
			<li><Check size={16} /> Text posts</li>
			<li><Check size={16} /> Photo posts (with captions)</li>
			<li><Check size={16} /> Quote posts</li>
			<li><Check size={16} /> Chat / dialogue posts</li>
			<li><Check size={16} /> Audio posts</li>
			<li><Check size={16} /> Video posts</li>
			<li><Check size={16} /> Ask / answer posts</li>
		</ul>

		<p class="not-imported">
			<X size={16} /> <strong>Not converted:</strong> Private and draft posts are skipped
			unless you tick “Include private/draft posts”. Anything unrecognised is rejected
			with a descriptive error rather than silently dropped.
		</p>
	</section>

	<!-- ── CLI usage ──────────────────────────────────────────────────────────── -->
	<section>
		<h2>CLI / Local usage</h2>
		<p>
			rock-tumbl also ships as a Node.js command-line tool, which converts fully
			locally — nothing leaves your machine unless you pass <code>--publish</code>.
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
cd pkgs/packages/rock-tumbl

# Install dependencies
pnpm install

# Build
pnpm build</code></pre>
		</div>

		<h3>Usage</h3>
		<div class="code-block">
			<pre><code># Preview a conversion without touching the network
rock-tumbl \
  --input tumblr-export.zip \
  --site https://myblog.example \
  --output preview.json

# Publish to Standard.site
rock-tumbl \
  --input tumblr-export.zip \
  --site https://myblog.example \
  --publish \
  --handle you.example \
  --password xxxx-xxxx-xxxx-xxxx</code></pre>
		</div>
	</section>

	<!-- ── Licence ────────────────────────────────────────────────────────────── -->
	<section>
		<h2>Licence</h2>
		<p>
			rock-tumbl is free software released under the
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
			<a
				href="https://github.com/ewanc26/pkgs/tree/main/packages/rock-tumbl/LICENCE"
				target="_blank"
				rel="noopener"
			>
				repository
			</a>.
		</p>
	</section>

	<!-- ── Credits ────────────────────────────────────────────────────────────── -->
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
			<a
				href="https://github.com/ewanc26/pkgs/tree/main/packages/rock-tumbl"
				target="_blank"
				rel="noopener"
			>
				GitHub
			</a>
			are always welcome. The full contributor list is maintained there.
		</p>

		<h3>Dependencies</h3>
		<ul class="deps">
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
				<a href="https://standard.site" target="_blank" rel="noopener">Standard.site</a>
				— the document format rock-tumbl converts to
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

	.back {
		display: inline-block;
		font-size: 0.8rem;
		color: var(--muted);
		margin-bottom: 2rem;
		text-decoration: none;
		transition: color 0.15s;
	}

	.back:hover {
		color: var(--text);
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 600;
		letter-spacing: -0.03em;
		color: var(--text);
		margin: 0 0 2.5rem;
	}

	section {
		margin-bottom: 2.75rem;
		padding-bottom: 2.75rem;
		border-bottom: 1px solid var(--border);
	}

	section:last-of-type {
		border-bottom: none;
	}

	h2 {
		font-size: 1rem;
		font-weight: 500;
		color: var(--text);
		margin: 0 0 1rem;
		letter-spacing: -0.01em;
	}

	h3 {
		font-size: 0.825rem;
		font-weight: 500;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 1.5rem 0 0.75rem;
	}

	h3:first-of-type {
		margin-top: 0;
	}

	p {
		font-size: 0.875rem;
		color: var(--muted);
		line-height: 1.7;
		margin: 0 0 0.75rem;
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

	/* ── Code blocks ──────────────────────────────────────────────────────────── */
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

	/* ── Pills ──────────────────────────────────────────────────────────────── */
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
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
		background: var(--accent-glow);
	}

	/* ── Check list ────────────────────────────────────────────────────────── */
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

	/* ── Person card ────────────────────────────────────────────────────────── */
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

	/* ── Contrib note ───────────────────────────────────────────────────────── */
	.contrib-note {
		font-size: 0.875rem;
		color: var(--muted);
	}

	/* ── Deps list ──────────────────────────────────────────────────────────── */
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
