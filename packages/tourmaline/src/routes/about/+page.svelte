<script lang="ts">
	import { Check, X, ArrowLeft } from '@lucide/svelte';
</script>

<svelte:head>
	<title>About — Tourmaline</title>
	<meta name="description" content="How Tourmaline works, privacy details, scrobble analysis, and licence information." />
</svelte:head>

<div class="mx-auto max-w-2xl px-3 py-8 sm:px-4">

	<!-- Back link -->
	<a
		href="/"
		class="mb-6 inline-flex items-center gap-1.5 text-xs text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors"
	>
		<ArrowLeft size={12} />
		Back to home
	</a>

	<h1 class="text-2xl font-bold tracking-tight text-[var(--text)]">About Tourmaline</h1>

	<!-- ── Privacy & data ─────────────────────────────────────────────────── -->
	<section>
		<h2>Privacy &amp; data</h2>

		<div class="flex flex-wrap gap-2">
			<span class="pill">No tracking</span>
			<span class="pill">No sign-in to browse</span>
			<span class="pill">No persistent server storage</span>
		</div>

		<p>
			Tourmaline analyses your listening history from your Teal.fm scrobbles.
			All fetching, analysis, and enrichment runs server-side. The server resolves your
			identity, fetches scrobbles from your PDS, computes the profile, and enriches top
			artists — then sends the results to your browser for display. No data is persisted
			between visits; the in-memory session cache is lost when the serverless function
			cold-starts.
		</p>
		<p>The network requests made are:</p>
		<ul>
			<li>
				<strong>Slingshot</strong> (<code>slingshot.microcosm.blue</code>) — resolves your
				AT Protocol handle to a DID and PDS URL. This is a standard identity lookup. No
				personally identifiable data beyond your handle is sent.
			</li>
			<li>
				<strong>Your PDS</strong> — reads <code>fm.teal.alpha.feed.play</code> records from
				your Personal Data Server. Reading is unauthenticated. If you choose to share your
				personality profile to Bluesky, Tourmaline will use OAuth to publish the post and will
				also create a usage record in your repository via the
				<code>click.croft.toolkit.use</code> lexicon. This record contains the total number of
				scrobbles analysed and a timestamp.
			</li>
			<li>
				<strong>MusicBrainz</strong> — enriches top artists with genre and tag data. Rate-limited
				to 1 request per second.
			</li>
			<li>
				<strong>Last.fm</strong> — supplements artist data with listener counts, play counts,
				and images. Rate-limited to 5 requests per second.
			</li>
			<li>
				<strong>Deezer</strong> — provides artist images as a fallback when Last.fm has none.
			</li>
			<li>
				<strong>Bluesky CDN</strong> — loads your avatar from <code>cdn.bsky.app</code>.
			</li>
		</ul>
		<p>
			Scrobbles are held in an in-memory session on the server for the duration of the
			analysis. This session expires after 10 minutes of inactivity and is never written
			to disk. No persistent database is used.
		</p>
	</section>

	<!-- ── How it works ───────────────────────────────────────────────────── -->
	<section>
		<h2>How it works</h2>
		<ol class="steps-list">
			<li>
				<span class="step-num">1</span>
				<div>
					<strong>Resolve identity</strong>
					<p>Your handle or DID is resolved to a PDS URL via Slingshot.</p>
				</div>
			</li>
			<li>
				<span class="step-num">2</span>
				<div>
					<strong>Fetch scrobbles</strong>
					<p>
						<code>fm.teal.alpha.feed.play</code> records are fetched page by page from your
						PDS. Fetched in batches to stay within serverless function time limits.
					</p>
				</div>
			</li>
			<li>
				<span class="step-num">3</span>
				<div>
					<strong>Analyse</strong>
					<p>
						Scrobbles are aggregated into top artists, tracks, albums, daily counts, genre
						profiles, mood mapping, era preference, diversity scoring, and obscurity
						indexing. All date range presets are computed at once so switching is instant.
					</p>
				</div>
			</li>
			<li>
				<span class="step-num">4</span>
				<div>
					<strong>Enrich</strong>
					<p>
						Top artists are enriched with genre data from MusicBrainz, listener counts from
						Last.fm, and images from Deezer. This runs in batches on the server after the
						base profile is already computed.
					</p>
				</div>
			</li>
		</ol>
	</section>

	<!-- ── What's analysed ────────────────────────────────────────────────── -->
	<section>
		<h2>What's analysed</h2>
		<ul class="check-list">
			<li><Check size={16} /> Top artists, tracks, and albums</li>
			<li><Check size={16} /> Genre profile (MusicBrainz + Last.fm tags)</li>
			<li><Check size={16} /> Mood mapping (energetic, melancholic, etc.)</li>
			<li><Check size={16} /> Listening timeline (365-day heatmap)</li>
			<li><Check size={16} /> Era preference (decade distribution)</li>
			<li><Check size={16} /> Diversity score (0–100)</li>
			<li><Check size={16} /> Obscurity index (0–100)</li>
			<li><Check size={16} /> Listener personality archetype</li>
		</ul>

		<p class="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
			<X size={16} />
			<span><strong class="text-[var(--text)]">Not analysed:</strong> Private/hidden scrobbles. Only <code>fm.teal.alpha.feed.play</code> records visible on your PDS are read.</span>
		</p>
	</section>

	<!-- ── Licence ────────────────────────────────────────────────────────── -->
	<section>
		<h2>Licence</h2>
		<p>
			Tourmaline is free software released under the
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
			<a href="https://github.com/ewanc26/pkgs/tree/main/packages/tourmaline" target="_blank" rel="noopener">
				repository
			</a>.
		</p>
	</section>

	<!-- ── Credits ────────────────────────────────────────────────────────── -->
	<section>
		<h2>Credits</h2>

		<h3>Created by</h3>
		<div class="person-card">
			<div class="flex flex-col gap-0.5">
				<span class="text-sm font-medium text-[var(--text)]">Ewan Croft</span>
				<span class="text-xs text-[var(--text-muted)]">Author &amp; maintainer</span>
			</div>
			<div class="flex gap-3">
				<a href="https://github.com/ewanc26" target="_blank" rel="noopener" class="text-xs text-[var(--text-muted)] underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]">GitHub</a>
				<a href="https://ewancroft.uk/support" class="text-xs text-[var(--text-muted)] underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]">Support</a>
				<a href="https://ewancroft.uk" target="_blank" rel="noopener" class="text-xs text-[var(--text-muted)] underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]">Website</a>
			</div>
		</div>

		<h3>Contributors</h3>
		<p class="text-sm text-[var(--text-muted)]">
			Contributions via
			<a href="https://github.com/ewanc26/pkgs/tree/main/packages/tourmaline" target="_blank" rel="noopener" class="text-[var(--text-muted)] underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]">GitHub</a>
			are always welcome. The full contributor list is maintained there.
		</p>

		<h3>Dependencies</h3>
		<ul class="deps">
			<li>
				<a href="https://svelte.dev" target="_blank" rel="noopener">Svelte / SvelteKit</a>
				— UI framework
			</li>
			<li>
				<a href="https://tailwindcss.com" target="_blank" rel="noopener">Tailwind CSS</a>
				— utility styles
			</li>
			<li>
				<a href="https://www.chartjs.org" target="_blank" rel="noopener">Chart.js</a>
				— charts and radar plots
			</li>
			<li>
				<a href="https://lucide.dev" target="_blank" rel="noopener">Lucide</a>
				— icons
			</li>
			<li>
				<a href="https://slingshot.microcosm.blue" target="_blank" rel="noopener">Slingshot</a>
				— identity resolution
			</li>
			<li>
				<a href="https://teal.fm" target="_blank" rel="noopener">Teal</a>
				— the <code>fm.teal.alpha</code> lexicon this tool reads from
			</li>
			<li>
				<a href="https://musicbrainz.org" target="_blank" rel="noopener">MusicBrainz</a>
				— genre and tag data
			</li>
			<li>
				<a href="https://www.last.fm" target="_blank" rel="noopener">Last.fm</a>
				— listener counts and artist images
			</li>
			<li>
				<a href="https://www.deezer.com" target="_blank" rel="noopener">Deezer</a>
				— artist image fallback
			</li>
		</ul>
	</section>

</div>

<style>
	section {
		margin-top: 2.5rem;
		margin-bottom: 2.5rem;
		padding-bottom: 2.5rem;
		border-bottom: 1px solid var(--border);
	}

	section:last-of-type {
		border-bottom: none;
	}

	h1 {
		margin-top: 1rem;
		margin-bottom: 2.5rem;
	}

	h2 {
		font-size: 1rem;
		font-weight: 500;
		color: var(--text);
		margin-bottom: 1rem;
		letter-spacing: -0.01em;
	}

	h3 {
		font-size: 0.825rem;
		font-weight: 500;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 1.5rem 0 0.75rem;
	}

	h3:first-of-type {
		margin-top: 0;
	}

	p {
		font-size: 0.875rem;
		color: var(--text-muted);
		line-height: 1.7;
		margin-bottom: 0.75rem;
	}

	ul {
		padding-left: 1.25rem;
		margin-bottom: 0.75rem;
	}

	li {
		font-size: 0.875rem;
		color: var(--text-muted);
		line-height: 1.7;
		margin-bottom: 0.4rem;
	}

	strong {
		color: var(--text);
		font-weight: 500;
	}

	:global(code) {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.82em;
		color: var(--accent);
		background: var(--surface);
		padding: 0.1em 0.35em;
		border-radius: 3px;
	}

	a {
		color: var(--text-muted);
	}

	a:hover {
		color: var(--accent);
	}

	.pill {
		font-size: 0.72rem;
		font-family: 'JetBrains Mono', monospace;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		border: 1px solid rgba(74, 222, 128, 0.35);
		color: var(--accent);
		background: rgba(74, 222, 128, 0.08);
	}

	.check-list {
		list-style: none;
		padding: 0;
		margin-bottom: 1.5rem;
	}

	.check-list li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0;
		color: var(--accent);
	}

	.steps-list {
		list-style: none;
		padding: 0;
		margin-bottom: 1.5rem;
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
		color: var(--text-muted);
		line-height: 1.5;
		margin: 0;
	}

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

	.deps a:hover {
		color: var(--accent);
	}

	@media (max-width: 480px) {
		.person-card {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
