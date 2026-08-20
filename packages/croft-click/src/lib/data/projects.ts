export interface Project {
	name: string;
	slug: string;
	url: string;
	heading: string;
	description: string;
	accent: string;
	logo: string;
}

export const coreProjects: Project[] = [
	{
		name: 'Jasper',
		slug: 'jasper',
		url: 'https://jasper.croft.click',
		heading: 'Instagram → Grain & Spark',
		description:
			'Import your photos, stories, and videos from an Instagram data export. Original timestamps preserved, duplicates skipped.',
		accent: '#e65733',
		logo: '/jasper.svg'
	},
	{
		name: 'Malachite',
		slug: 'malachite',
		url: 'https://malachite.croft.click',
		heading: 'Last.fm, Spotify, Apple, YT Music & ListenBrainz scrobbles → Teal',
		description:
			'Import your listening history from Last.fm, Spotify, Apple Music, YouTube Music, and ListenBrainz. Smart deduplication and sync support.',
		accent: '#21ca81',
		logo: '/malachite.svg'
	},
	{
		name: 'Bismuth',
		slug: 'bismuth',
		url: 'https://bismuth.croft.click',
		heading: 'standard.site → Markdown',
		description:
			'Convert ATProto richtext-block documents from Leaflet, Pckt, and Offprint to Markdown in your browser.',
		accent: '#bd73e8',
		logo: '/bismuth.svg'
	},
	{
		name: 'Opal',
		slug: 'opal',
		url: 'https://opal.croft.click',
		heading: 'Microblog → Bluesky',
		description:
			'Convert your posts from Twitter, Mastodon, Threads, and Nostr to AT Protocol Bluesky posts. Original timestamps preserved.',
		accent: '#84ddeb',
		logo: '/opal.svg'
	}
];

export const extraProjects: Project[] = [
	{
		name: 'Hasharium',
		slug: 'hasharium',
		url: 'https://hasharium.croft.click',
		heading: 'DIDs → deterministic forms',
		description:
			'Observe and collect stable geometric specimens derived locally from decentralised identifiers.',
		accent: '#79c841',
		logo: '/hasharium.svg'
	},
	{
		name: 'Tourmaline',
		slug: 'tourmaline',
		url: 'https://tourmaline.croft.click',
		heading: 'Teal.fm scrobble analyser',
		description:
			'Analyse your Teal.fm listening history. Personality archetypes, genre profiles, mood mapping, and share-to-Bluesky.',
		accent: '#e94984',
		logo: '/tourmaline.svg'
	},
	{
		name: 'Devlog',
		slug: 'devlog',
		url: 'https://devlog.croft.click',
		heading: 'Changelog',
		description:
			'What changed, when, and why. An automated devlog published to AT Protocol via Sequoia.',
		accent: '#ddb43c',
		logo: '/devlog.svg'
	}
];

export const projects: Project[] = [...coreProjects, ...extraProjects];
