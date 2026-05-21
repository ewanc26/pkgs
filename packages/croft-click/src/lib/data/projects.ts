export interface Project {
	name: string;
	slug: string;
	url: string;
	heading: string;
	description: string;
	accent: string;
	logo: string;
}

export const projects: Project[] = [
	{
		name: 'Jasper',
		slug: 'jasper',
		url: 'https://jasper.croft.click',
		heading: 'Instagram → Grain & Spark',
		description:
			'Import your photos, stories, and videos from an Instagram data export. Original timestamps preserved, duplicates skipped.',
		accent: '#fb923c',
		logo: '/jasper.svg'
	},
	{
		name: 'Malachite',
		slug: 'malachite',
		url: 'https://malachite.croft.click',
		heading: 'Last.fm & Spotify → Teal',
		description:
			'Import your listening history from Last.fm scrobbles and Spotify plays. Smart deduplication and sync support.',
		accent: '#3fb968',
		logo: '/malachite.svg'
	},
	{
		name: 'Bismuth',
		slug: 'bismuth',
		url: 'https://bismuth.croft.click',
		heading: 'standard.site → Markdown',
		description:
			'Convert ATProto richtext-block documents from Leaflet, Pckt, and Offprint to Markdown in your browser.',
		accent: '#c4b5fd',
		logo: '/bismuth.svg'
	},
	{
		name: 'Opal',
		slug: 'opal',
		url: 'https://opal.croft.click',
		heading: 'Microblog → Bluesky',
		description:
			'Convert your posts from Twitter, Mastodon, Threads, and Nostr to AT Protocol Bluesky posts. Original timestamps preserved.',
		accent: '#a7f3d0',
		logo: '/opal.svg'
	},
	{
		name: 'Tourmaline',
		slug: 'tourmaline',
		url: 'https://tourmaline.croft.click',
		heading: 'Teal.fm scrobble analyser',
		description:
			'Analyse your Teal.fm listening history. Personality archetypes, genre profiles, mood mapping, and share-to-Bluesky.',
		accent: '#4ade80',
		logo: '/tourmaline.svg'
	},
	{
		name: 'Devlog',
		slug: 'devlog',
		url: 'https://devlog.croft.click',
		heading: 'Changelog',
		description:
			'What changed, when, and why. An automated devlog published to AT Protocol via Sequoia.',
		accent: '#e2a93b',
		logo: '/devlog.svg'
	}
];
