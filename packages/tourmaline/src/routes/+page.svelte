<script lang="ts">
	import { onMount } from "svelte";
	import { LandingPage } from "@ewanc26/landing-ui";
	import {
		BarChart3,
		Brain,
		CalendarDays,
		Fingerprint,
		Gem,
		Music,
		Shield,
		Eye,
		Search,
	} from "@lucide/svelte";

	interface ActorResult {
		did: string;
		handle: string;
		displayName?: string;
		avatar?: string;
	}

	let identifier = $state("");
	let loading = $state(false);
	let error = $state("");

	// Autocomplete state
	let suggestions = $state<ActorResult[]>([]);
	let showSuggestions = $state(false);
	let searchLoading = $state(false);
	let selectedIndex = $state(-1);
	let inputRef: HTMLInputElement | undefined = $state();
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async function searchActors(query: string): Promise<ActorResult[]> {
		if (query.length < 2) return [];
		try {
			const res = await fetch(
				`https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(query)}&limit=8`,
			);
			if (!res.ok) return [];
			const data = await res.json();
			return data.actors ?? [];
		} catch {
			return [];
		}
	}

	function handleInput() {
		if (debounceTimer) clearTimeout(debounceTimer);

		const value = identifier.trim();

		// Don't search for DIDs
		if (value.startsWith("did:")) {
			suggestions = [];
			showSuggestions = false;
			return;
		}

		if (value.length < 2) {
			suggestions = [];
			showSuggestions = false;
			return;
		}

		debounceTimer = setTimeout(async () => {
			searchLoading = true;
			suggestions = await searchActors(value);
			searchLoading = false;
			showSuggestions = suggestions.length > 0;
			selectedIndex = -1;
		}, 300);
	}

	function selectSuggestion(actor: ActorResult) {
		identifier = actor.handle;
		suggestions = [];
		showSuggestions = false;
		selectedIndex = -1;
		inputRef?.focus();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!showSuggestions || suggestions.length === 0) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, -1);
		} else if (e.key === "Enter" && selectedIndex >= 0) {
			e.preventDefault();
			selectSuggestion(suggestions[selectedIndex]);
		} else if (e.key === "Escape") {
			showSuggestions = false;
			selectedIndex = -1;
		}
	}

	function analyse() {
		const input = identifier.trim();
		if (!input) return;

		loading = true;
		error = "";

		const encoded = encodeURIComponent(input);
		window.location.href = `/profile/${encoded}`;
	}

	onMount(() => {
		return () => {
			if (debounceTimer) clearTimeout(debounceTimer);
		};
	});

	const features = [
		{
			icon: BarChart3,
			title: "Top artists & tracks",
			description:
				"Ranked lists of your most-played artists, tracks, and albums with play counts.",
		},
		{
			icon: Music,
			title: "Genre profile",
			description:
				"MusicBrainz tags and Last.fm genres mapped to a weighted genre chart.",
		},
		{
			icon: Brain,
			title: "Mood mapping",
			description:
				"Energy, melancholy, tension, brightness -- derived from genre weights.",
		},
		{
			icon: CalendarDays,
			title: "365-day heatmap",
			description:
				"A full year of listening at a glance. Spot patterns, gaps, and spikes.",
		},
		{
			icon: Fingerprint,
			title: "Personality archetype",
			description:
				"The Curator, The Explorer, The Loyalist -- your listener profile in a few words.",
		},
		{
			icon: Gem,
			title: "Obscurity index",
			description:
				"How deep into the catalog do you go? Scored from mainstream to obscure.",
		},
		{
			icon: Eye,
			title: "Diversity score",
			description:
				"Measures breadth across artists and genres. Are you a generalist or a specialist?",
		},
		{
			icon: Shield,
			title: "Privacy-first",
			description:
				"No sign-in needed to browse. Reads public scrobbles from any PDS. Sign-in only required to share.",
		},
	];

	const steps = [
		{
			title: "Enter a handle",
			description:
				"Any AT Protocol handle or DID. No sign-in, no app password.",
		},
		{
			title: "Fetch scrobbles",
			description:
				"fm.teal.alpha.feed.play records are read from the user's PDS. All processing runs server-side.",
		},
		{
			title: "Analyse",
			description:
				"Scrobbles are aggregated into top artists, genres, moods, era preference, diversity, obscurity, and a personality archetype.",
		},
		{
			title: "Enrich",
			description:
				"Top artists are enriched with genre data from MusicBrainz, listener counts from Last.fm, and images from Deezer -- after the profile is already visible.",
		},
	];

	const siblings = [
		{
			name: "Malachite",
			url: "https://malachite.croft.click",
			description:
				"Import Last.fm and Spotify listening history into Teal.",
		},
		{
			name: "Opal",
			url: "https://opal.croft.click",
			description:
				"Convert Twitter, Mastodon, Threads, and Nostr posts to Bluesky.",
		},
		{
			name: "Jasper",
			url: "https://jasper.croft.click",
			description:
				"Import Instagram photos and videos to Grain or Spark.",
		},
		{
			name: "Bismuth",
			url: "https://bismuth.croft.click",
			description:
				"Convert ATProto richtext-block documents to Markdown.",
		},
	];
</script>

<svelte:head>
	<title>Tourmaline -- Teal.fm Scrobble Analyser</title>
	<meta
		name="description"
		content="Discover what kind of listener you are. Analyses your Teal.fm scrobbles -- genres, moods, eras, obscurity, and a personality archetype."
	/>
	<link rel="canonical" href="https://tourmaline.croft.click" />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://tourmaline.croft.click" />
	<meta
		property="og:title"
		content="Tourmaline -- Teal.fm Scrobble Analyser"
	/>
	<meta
		property="og:description"
		content="Discover what kind of listener you are. Analyses your Teal.fm scrobbles -- genres, moods, eras, obscurity, and a personality archetype."
	/>
	<meta property="og:image" content="https://tourmaline.croft.click/og.svg" />

	<!-- Twitter / X card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta
		name="twitter:title"
		content="Tourmaline -- Teal.fm Scrobble Analyser"
	/>
	<meta
		name="twitter:description"
		content="Discover what kind of listener you are. Analyses your Teal.fm scrobbles -- genres, moods, eras, obscurity, and a personality archetype."
	/>
	<meta
		name="twitter:image"
		content="https://tourmaline.croft.click/og.svg"
	/>
</svelte:head>

{#snippet heroAction()}
	<form
		onsubmit={(e) => {
			e.preventDefault();
			analyse();
		}}
		class="search-form"
	>
		<div class="input-wrapper">
			<input
				bind:this={inputRef}
				type="text"
				bind:value={identifier}
				oninput={handleInput}
				onkeydown={handleKeydown}
				onfocus={() => {
					if (suggestions.length > 0) showSuggestions = true;
				}}
				onblur={() => {
					setTimeout(() => {
						showSuggestions = false;
					}, 150);
				}}
				placeholder="ewancroft.uk or did:plc:..."
				class="search-input"
				disabled={loading}
				autocomplete="off"
			/>
			{#if showSuggestions && suggestions.length > 0}
				<ul class="suggestions" role="listbox">
					{#each suggestions as actor, i (actor.did)}
						<li
							class="suggestion {selectedIndex === i
								? 'selected'
								: ''}"
							role="option"
							aria-selected={selectedIndex === i}
							onclick={() => selectSuggestion(actor)}
							onkeydown={(e) => {
								if (e.key === "Enter") selectSuggestion(actor);
							}}
							tabindex={-1}
						>
							{#if actor.avatar}
								<img src={actor.avatar} alt="" class="avatar" />
							{:else}
								<div class="avatar avatar-placeholder"></div>
							{/if}
							<div class="actor-info">
								<span class="display-name"
									>{actor.displayName ?? actor.handle}</span
								>
								<span class="handle">@{actor.handle}</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
			{#if searchLoading}
				<div class="search-indicator">
					<Search size={14} class="animate-pulse" />
				</div>
			{/if}
		</div>
		<button type="submit" class="btn-primary" disabled={loading}>
			{loading ? "Analysing..." : "Analyse"}
		</button>
	</form>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	<p class="hero-note">
		Reads <code>fm.teal.alpha.feed.play</code> records from the user's PDS. Enriches
		with MusicBrainz, Last.fm, and Deezer.
	</p>
{/snippet}

{#snippet ctaAction()}
	<h2>Try it</h2>
	<p>Enter any AT Protocol handle or DID. No account needed.</p>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			analyse();
		}}
		class="search-form"
	>
		<div class="input-wrapper">
			<input
				type="text"
				bind:value={identifier}
				oninput={handleInput}
				onkeydown={handleKeydown}
				onfocus={() => {
					if (suggestions.length > 0) showSuggestions = true;
				}}
				onblur={() => {
					setTimeout(() => {
						showSuggestions = false;
					}, 150);
				}}
				placeholder="ewancroft.uk or did:plc:..."
				class="search-input"
				disabled={loading}
				autocomplete="off"
			/>
			{#if searchLoading}
				<div class="search-indicator">
					<Search size={14} class="animate-pulse" />
				</div>
			{/if}
		</div>
		<button type="submit" class="btn-primary" disabled={loading}>
			{loading ? "Analysing..." : "Analyse"}
		</button>
	</form>
{/snippet}

{#snippet headingSnippet()}
	Discover what kind of<br />listener you are.
{/snippet}

{#snippet subSnippet()}
	Tourmaline analyses your
	<a href="https://teal.fm" target="_blank" rel="noopener">Teal</a>
	scrobbles -- genres, moods, eras, obscurity, and a personality archetype.
{/snippet}

<LandingPage
	name="tourmaline"
	logo="/logo.svg"
	eyebrow="Open source | No sign-in needed"
	heading={headingSnippet}
	sub={subSnippet}
	githubUrl="https://github.com/ewanc26/pkgs/tree/main/packages/tourmaline"
	{features}
	{steps}
	{siblings}
	{heroAction}
	{ctaAction}
/>

<style>
	/* ── Search form ──────────────────────────────────────────────────────── */
	.search-form {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.75rem;
		width: min(100%, 760px);
		margin: 0 auto;
		align-items: stretch;
	}

	.input-wrapper {
		flex: 1;
		position: relative;
		min-width: 0;
	}

	.search-input {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		padding: 0.9rem 1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
		font-family: "JetBrains Mono", monospace;
		font-size: 0.95rem;
		text-align: left;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.15);
	}

	.search-input::placeholder {
		color: var(--text-dim);
	}

	.search-indicator {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-dim);
		pointer-events: none;
	}

	/* Suggestions dropdown */
	.suggestions {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 4px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		list-style: none;
		padding: 0.25rem 0;
		max-height: 280px;
		overflow-y: auto;
		z-index: 100;
		text-align: left;
	}

	.suggestion {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		transition: background 0.1s;
	}

	.suggestion:hover,
	.suggestion.selected {
		background: var(--surface-2);
	}

	.avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.avatar-placeholder {
		background: var(--surface-2);
	}

	.actor-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.display-name {
		font-size: 0.85rem;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.handle {
		font-size: 0.75rem;
		color: var(--text-dim);
		font-family: "JetBrains Mono", monospace;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 160px;
		background: var(--accent-dim);
		color: #fff;
		font-weight: 600;
		font-size: 0.95rem;
		padding: 0.9rem 1.5rem;
		border-radius: 6px;
		border: none;
		cursor: pointer;
		white-space: nowrap;
		transition:
			background 0.15s,
			transform 0.1s;
	}

	.btn-primary:hover {
		background: var(--accent);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.error {
		color: var(--error);
		font-size: 0.85rem;
		margin-top: 0.75rem;
	}

	.hero-note {
		font-size: 0.75rem;
		color: var(--text-dim);
		margin-top: 1.5rem;
	}

	.hero-note code {
		font-family: "JetBrains Mono", monospace;
		font-size: 0.82em;
		color: var(--text-muted);
		background: var(--surface);
		padding: 0.1em 0.35em;
		border-radius: 3px;
	}

	/* ── Responsive ──────────────────────────────────────────────────────── */
	@media (max-width: 640px) {
		.search-form {
			grid-template-columns: minmax(0, 1fr) auto;
			width: 100%;
		}

		.btn-primary {
			width: auto;
			min-width: 0;
			padding: 0.9rem 1rem;
		}
	}
</style>
