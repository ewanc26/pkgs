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
		heading: 'site.standard.document → Markdown',
		description:
			'Convert ATProto richtext-block documents from Leaflet, Pckt, and Offprint to Markdown in your browser.',
		accent: '#c4b5fd',
		logo: '/bismuth.svg'
	}
];
