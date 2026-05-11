<script lang="ts">

	import { Music } from '@lucide/svelte';

	let { origins = {} }: { origins: Record<string, number> } = $props();

	const entries = $derived(
		Object.entries(origins)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 6)
	);

	const total = $derived(Object.values(origins).reduce((a, b) => a + b, 0));

	/** Map common domains to friendly names. */
	const FRIENDLY: Record<string, string> = {
		'listenbrainz.org': 'ListenBrainz',
		'last.fm': 'Last.fm',
		'scrobbler.nate.land': 'NateLand',
		'spotify.com': 'Spotify',
		'open.spotify.com': 'Spotify',
		'apple.com': 'Apple Music',
		'youtube.com': 'YouTube',
		'music.youtube.com': 'YouTube Music',
		'deezer.com': 'Deezer',
		'tidal.com': 'Tidal',
		'pandora.com': 'Pandora',
		'soundcloud.com': 'SoundCloud',
		'bandcamp.com': 'Bandcamp'
	};

	function friendlyName(domain: string): string {
		return FRIENDLY[domain] ?? domain.replace(/^(www\.)?/, '').replace(/\.(com|org|net|io)$/, '');
	}
</script>

{#if entries.length > 0}
	<div class="flex flex-wrap gap-2">
		{#each entries as [domain, count] (domain)}
			{@const pct = total > 0 ? Math.round((count / total) * 100) : 0}
			<span
				class="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-xs"
			>
				<Music size={10} class="text-[var(--accent)]" />
				<span class="text-[var(--text-muted)]">{friendlyName(domain)}</span>
				<span class="font-mono text-[var(--text-dim)]">{pct}%</span>
			</span>
		{/each}
	</div>
{/if}
