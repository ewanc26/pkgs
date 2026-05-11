import type { ArtistInfo } from '$lib/types';

const MB_USER_AGENT = 'Tourmaline/0.5.0 (https://github.com/ewanc26/pkgs/tree/main/packages/tourmaline)';
const MB_BASE = 'https://musicbrainz.org/ws/2';
const LFM_BASE = 'https://ws.audioscrobbler.com/2.0/';
const DZ_BASE = 'https://api.deezer.com';

// ── Rate limiters ─────────────────────────────────────────────────────

// MusicBrainz: 1 req/s
let mbLastRequest = 0;
const mbQueue: Array<{ resolve: () => void }> = [];

function scheduleMb() {
	if (mbQueue.length === 0) return;
	const wait = Math.max(0, 1100 - (Date.now() - mbLastRequest));
	if (wait > 0) {
		setTimeout(() => {
			mbLastRequest = Date.now();
			mbQueue.shift()!.resolve();
			scheduleMb();
		}, wait);
	} else {
		mbLastRequest = Date.now();
		mbQueue.shift()!.resolve();
		scheduleMb();
	}
}

function waitForMb(): Promise<void> {
	return new Promise((resolve) => {
		mbQueue.push({ resolve });
		if (mbQueue.length === 1) scheduleMb();
	});
}

// Last.fm: 5 req/s
let lfmLastRequest = 0;
const lfmQueue: Array<{ resolve: () => void }> = [];

function scheduleLfm() {
	if (lfmQueue.length === 0) return;
	const wait = Math.max(0, 200 - (Date.now() - lfmLastRequest));
	if (wait > 0) {
		setTimeout(() => {
			lfmLastRequest = Date.now();
			lfmQueue.shift()!.resolve();
			scheduleLfm();
		}, wait);
	} else {
		lfmLastRequest = Date.now();
		lfmQueue.shift()!.resolve();
		scheduleLfm();
	}
}

function waitForLfm(): Promise<void> {
	return new Promise((resolve) => {
		lfmQueue.push({ resolve });
		if (lfmQueue.length === 1) scheduleLfm();
	});
}

// ── MusicBrainz ───────────────────────────────────────────────────────

interface MBArtist {
	id: string;
	name: string;
	tags?: Array<{ name: string; count: number }>;
	genres?: Array<{ name: string; count: number }>;
	rating?: { value?: number };
	'life-span'?: { begin?: string; end?: string; ended?: boolean };
}

interface MBSearchResult {
	artists: Array<{ id: string; name: string; score: number }>;
}

async function mbSearchArtist(name: string): Promise<string | null> {
	await waitForMb();
	const path = `/artist?query=artist:${encodeURIComponent(name)}&limit=1&fmt=json`;
	const res = await fetch(`${MB_BASE}${path}`, {
		headers: { 'User-Agent': MB_USER_AGENT, Accept: 'application/json' }
	});
	if (!res.ok) return null;
	const data: MBSearchResult = await res.json();
	return data.artists?.[0]?.id ?? null;
}

async function mbGetArtistInfo(mbId: string): Promise<ArtistInfo | null> {
	await waitForMb();
	const path = `/artist/${mbId}?inc=tags+genres+ratings&fmt=json`;
	const res = await fetch(`${MB_BASE}${path}`, {
		headers: { 'User-Agent': MB_USER_AGENT, Accept: 'application/json' }
	});
	if (!res.ok) return null;

	const data: MBArtist = await res.json();
	const beginDate = data['life-span']?.begin;
	const startYear = beginDate ? parseInt(beginDate.substring(0, 4), 10) : undefined;

	return {
		name: data.name,
		mbId: data.id,
		genres: (data.genres ?? []).sort((a, b) => b.count - a.count).map((g) => g.name),
		tags: (data.tags ?? []).sort((a, b) => b.count - a.count).map((t) => t.name),
		similar: [],
		listenerCount: undefined,
		playCount: undefined,
		startYear: isNaN(startYear!) ? undefined : startYear
	};
}

// ── Last.fm ───────────────────────────────────────────────────────────

interface LFMArtist {
	name: string;
	mbid?: string;
	listeners?: string;
	playcount?: string;
	tags?: { tag: Array<{ name: string; count: string }> };
	similar?: { artist: Array<{ name: string; mbid?: string }> };
	image?: Array<{ '#text': string; size: string }>;
}

async function lfmGetArtistInfo(name: string, apiKey: string): Promise<Partial<ArtistInfo> | null> {
	await waitForLfm();
	const params = new URLSearchParams({
		method: 'artist.getinfo',
		artist: name,
		api_key: apiKey,
		format: 'json',
		autocorrect: '1'
	});

	const res = await fetch(`${LFM_BASE}?${params.toString()}`);
	if (!res.ok) return null;

	const data = (await res.json()) as { artist?: LFMArtist };
	if (!data.artist) return null;

	const a = data.artist;
	return {
		tags: (a.tags?.tag ?? []).map((t) => t.name),
		similar: (a.similar?.artist ?? []).map((s) => ({
			name: s.name,
			mbId: s.mbid || undefined
		})),
		listenerCount: a.listeners ? parseInt(a.listeners) : undefined,
		playCount: a.playcount ? parseInt(a.playcount) : undefined,
		imageUrl: a.image?.find((i) => i.size === 'large')?.['#text'] || undefined
	};
}

// ── Deezer ────────────────────────────────────────────────────────────

interface DeezerArtist {
	id: number;
	name: string;
	picture_medium?: string;
	nb_fan?: number;
}

interface DeezerSearchResult {
	data: DeezerArtist[];
	total: number;
}

async function dzSearchArtist(name: string): Promise<DeezerArtist | null> {
	const url = `${DZ_BASE}/search/artist?q=${encodeURIComponent(name)}`;
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		const data: DeezerSearchResult = await res.json();
		return data.data?.[0] ?? null;
	} catch {
		return null;
	}
}

async function dzGetArtistImage(name: string): Promise<string | null> {
	const artist = await dzSearchArtist(name);
	return artist?.picture_medium ?? null;
}

// ── Public API ────────────────────────────────────────────────────────

export interface EnrichBatchResult {
	enriched: Array<{ name: string; info: ArtistInfo }>;
	remaining: string[];
}

/**
 * Enrich a batch of artists (up to `batchSize`).
 * Each call does MusicBrainz + Last.fm + Deezer for each artist.
 * At ~6s per 5 artists, this stays under Vercel's 10s limit.
 */
export async function enrichArtistBatch(
	artists: string[],
	existing: Map<string, ArtistInfo>,
	batchSize = 5
): Promise<EnrichBatchResult> {
	const lfmApiKey = process.env.LASTFM_API_KEY ?? null;
	const toProcess = artists.slice(0, batchSize);
	const enriched: Array<{ name: string; info: ArtistInfo }> = [];

	for (const name of toProcess) {
		// Skip if already enriched
		if (existing.has(name)) {
			enriched.push({ name, info: existing.get(name)! });
			continue;
		}

		let info: ArtistInfo = {
			name,
			genres: [],
			tags: [],
			similar: []
		};

		// MusicBrainz
		try {
			const mbId = await mbSearchArtist(name);
			if (mbId) {
				const mbInfo = await mbGetArtistInfo(mbId);
				if (mbInfo) {
					info = { ...info, ...mbInfo };
				}
			}
		} catch {
			// MusicBrainz failure is non-critical
		}

		// Last.fm (supplements tags, similar, listener count, image)
		if (lfmApiKey) {
			try {
				const lfmInfo = await lfmGetArtistInfo(name, lfmApiKey);
				if (lfmInfo) {
					info = {
						...info,
						tags: lfmInfo.tags?.length ? lfmInfo.tags : info.tags,
						similar: lfmInfo.similar?.length ? lfmInfo.similar : info.similar,
						listenerCount: lfmInfo.listenerCount ?? info.listenerCount,
						playCount: lfmInfo.playCount ?? info.playCount,
						imageUrl: lfmInfo.imageUrl ?? info.imageUrl
					};
				}
			} catch {
				// Last.fm failure is non-critical
			}
		}

		// Deezer (image fallback)
		if (!info.imageUrl) {
			try {
				const dzImage = await dzGetArtistImage(name);
				if (dzImage) info.imageUrl = dzImage;
			} catch {
				// Deezer failure is non-critical
			}
		}

		enriched.push({ name, info });
	}

	const remaining = artists.slice(batchSize);
	return { enriched, remaining };
}
