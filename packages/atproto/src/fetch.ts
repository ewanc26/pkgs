import { cache } from './cache.js';
import { withFallback, resolveIdentity } from './agents.js';
import { buildPdsBlobUrl } from './media.js';
import { findArtwork } from './musicbrainz.js';
import type {
	ProfileData,
	SiteInfoData,
	LinkData,
	MusicStatusData,
	KibunStatusData,
	TangledRepo,
	TangledReposData,
	PopfeedReview,
	PopfeedCreativeWorkType,
	PopfeedMainCreditRole,
	SifaProfileData,
	SifaSkill,
	SifaProject,
	SifaLanguage,
	SifaCertification,
	SifaExternalAccount
} from './types.js';

export async function fetchProfile(did: string, fetchFn?: typeof fetch): Promise<ProfileData> {
	const cacheKey = `profile:${did}`;
	const cached = cache.get<ProfileData>(cacheKey);
	if (cached) return cached;

	const profile = await withFallback(
		did,
		async (agent) => {
			const response = await agent.getProfile({ actor: did });
			return response.data;
		},
		false,
		fetchFn
	);

	let pronouns: string | undefined;
	try {
		const recordResponse = await withFallback(
			did,
			async (agent) => {
				const response = await agent.com.atproto.repo.getRecord({
					repo: did,
					collection: 'app.bsky.actor.profile',
					rkey: 'self'
				});
				return response.data;
			},
			false,
			fetchFn
		);
		pronouns = (recordResponse.value as any).pronouns;
	} catch { /* pronouns optional */ }

	const data: ProfileData = {
		did: profile.did,
		handle: profile.handle,
		displayName: profile.displayName,
		description: profile.description,
		avatar: profile.avatar,
		banner: profile.banner,
		followersCount: profile.followersCount,
		followsCount: profile.followsCount,
		postsCount: profile.postsCount,
		pronouns
	};

	cache.set(cacheKey, data);
	return data;
}

export async function fetchSiteInfo(
	did: string,
	fetchFn?: typeof fetch
): Promise<SiteInfoData | null> {
	const cacheKey = `siteinfo:${did}`;
	const cached = cache.get<SiteInfoData>(cacheKey);
	if (cached) return cached;

	try {
		const result = await withFallback(
			did,
			async (agent) => {
				try {
					const response = await agent.com.atproto.repo.getRecord({
						repo: did,
						collection: 'uk.ewancroft.site.info',
						rkey: 'self'
					});
					return response.data;
				} catch (err: any) {
					if (err.error === 'RecordNotFound') return null;
					throw err;
				}
			},
			true,
			fetchFn
		);

		if (!result?.value) return null;
		const data = result.value as SiteInfoData;
		cache.set(cacheKey, data);
		return data;
	} catch {
		return null;
	}
}

export async function fetchLinks(
	did: string,
	fetchFn?: typeof fetch
): Promise<LinkData | null> {
	const cacheKey = `links:${did}`;
	const cached = cache.get<LinkData>(cacheKey);
	if (cached) return cached;

	try {
		const value = await withFallback(
			did,
			async (agent) => {
				const response = await agent.com.atproto.repo.getRecord({
					repo: did,
					collection: 'blue.linkat.board',
					rkey: 'self'
				});
				return response.data.value;
			},
			true,
			fetchFn
		);

		if (!value || !Array.isArray((value as any).cards)) return null;
		const data: LinkData = { cards: (value as any).cards };
		cache.set(cacheKey, data);
		return data;
	} catch {
		return null;
	}
}

export async function fetchMusicStatus(
	did: string,
	fetchFn?: typeof fetch
): Promise<MusicStatusData | null> {
	const cacheKey = `music-status:${did}`;
	const cached = cache.get<MusicStatusData>(cacheKey);
	if (cached) return cached;

	try {
		// Try actor status first
		try {
			const statusRecords = await withFallback(
				did,
				async (agent) => {
					const response = await agent.com.atproto.repo.listRecords({
						repo: did,
						collection: 'fm.teal.alpha.actor.status',
						limit: 1
					});
					return response.data.records;
				},
				true,
				fetchFn
			);

			if (statusRecords?.length) {
				const record = statusRecords[0];
				const value = record.value as any;
				if (value.expiry) {
					const expiryTime = parseInt(value.expiry) * 1000;
					if (Date.now() <= expiryTime) {
						const trackName = value.item?.trackName || value.trackName;
						const artists = value.item?.artists || value.artists || [];
						const releaseName = value.item?.releaseName || value.releaseName;
						const artistName = artists[0]?.artistName;
						const releaseMbId = value.item?.releaseMbId || value.releaseMbId;

						let artworkUrl: string | undefined;
						if (releaseName && artistName) {
							artworkUrl = (await findArtwork(releaseName, artistName, releaseName, releaseMbId, fetchFn)) || undefined;
						}
						if (!artworkUrl && trackName && artistName) {
							artworkUrl = (await findArtwork(trackName, artistName, releaseName, releaseMbId, fetchFn)) || undefined;
						}
						if (!artworkUrl) {
							const artwork = value.item?.artwork || value.artwork;
							if (artwork?.ref?.$link) {
								const identity = await resolveIdentity(did, fetchFn);
								artworkUrl = buildPdsBlobUrl(identity.pds, did, artwork.ref.$link);
							}
						}

						const data: MusicStatusData = {
							trackName,
							artists,
							releaseName,
							playedTime: value.item?.playedTime || value.playedTime,
							originUrl: value.item?.originUrl || value.originUrl,
							recordingMbId: value.item?.recordingMbId || value.recordingMbId,
							releaseMbId,
							isrc: value.isrc,
							duration: value.duration,
							musicServiceBaseDomain: value.item?.musicServiceBaseDomain || value.musicServiceBaseDomain,
							submissionClientAgent: value.item?.submissionClientAgent || value.submissionClientAgent,
							$type: 'fm.teal.alpha.actor.status',
							expiry: value.expiry,
							artwork: value.item?.artwork || value.artwork,
							artworkUrl
						};
						cache.set(cacheKey, data);
						return data;
					}
				}
			}
		} catch { /* fall through to feed play */ }

		// Fall back to feed play
		const playRecords = await withFallback(
			did,
			async (agent) => {
				const response = await agent.com.atproto.repo.listRecords({
					repo: did,
					collection: 'fm.teal.alpha.feed.play',
					limit: 1
				});
				return response.data.records;
			},
			true,
			fetchFn
		);

		if (playRecords?.length) {
			const record = playRecords[0];
			const value = record.value as any;
			const artists = value.artists || [];
			const artistName = artists[0]?.artistName;

			let artworkUrl: string | undefined;
			if (value.releaseName && artistName) {
				artworkUrl = (await findArtwork(value.releaseName, artistName, value.releaseName, value.releaseMbId, fetchFn)) || undefined;
			}
			if (!artworkUrl && value.trackName && artistName) {
				artworkUrl = (await findArtwork(value.trackName, artistName, value.releaseName, value.releaseMbId, fetchFn)) || undefined;
			}
			if (!artworkUrl && value.artwork?.ref?.$link) {
				const identity = await resolveIdentity(did, fetchFn);
				artworkUrl = buildPdsBlobUrl(identity.pds, did, value.artwork.ref.$link);
			}

			const data: MusicStatusData = {
				trackName: value.trackName,
				artists,
				releaseName: value.releaseName,
				playedTime: value.playedTime,
				originUrl: value.originUrl,
				recordingMbId: value.recordingMbId,
				releaseMbId: value.releaseMbId,
				isrc: value.isrc,
				duration: value.duration,
				musicServiceBaseDomain: value.musicServiceBaseDomain,
				submissionClientAgent: value.submissionClientAgent,
				$type: 'fm.teal.alpha.feed.play',
				artwork: value.artwork,
				artworkUrl
			};
			cache.set(cacheKey, data);
			return data;
		}

		return null;
	} catch {
		return null;
	}
}

export async function fetchKibunStatus(
	did: string,
	fetchFn?: typeof fetch
): Promise<KibunStatusData | null> {
	const cacheKey = `kibun-status:${did}`;
	const cached = cache.get<KibunStatusData>(cacheKey);
	if (cached) return cached;

	try {
		const statusRecords = await withFallback(
			did,
			async (agent) => {
				const response = await agent.com.atproto.repo.listRecords({
					repo: did,
					collection: 'social.kibun.status',
					limit: 1
				});
				return response.data.records;
			},
			true,
			fetchFn
		);

		if (statusRecords?.length) {
			const value = statusRecords[0].value as any;
			const data: KibunStatusData = {
				text: value.text,
				emoji: value.emoji,
				createdAt: value.createdAt,
				$type: 'social.kibun.status'
			};
			cache.set(cacheKey, data);
			return data;
		}
		return null;
	} catch {
		return null;
	}
}

export async function fetchRecentPopfeedReviews(
	did: string,
	limit = 5,
	fetchFn?: typeof fetch
): Promise<PopfeedReview[]> {
	const cacheKey = `popfeed-reviews:${did}:${limit}`;
	const cached = cache.get<PopfeedReview[]>(cacheKey);
	if (cached) return cached;

	try {
		const records = await withFallback(
			did,
			async (agent) => {
				const response = await agent.com.atproto.repo.listRecords({
					repo: did,
					collection: 'social.popfeed.feed.review',
					limit
				});
				return response.data.records;
			},
			true,
			fetchFn
		);

		if (!records?.length) return [];

		const data: PopfeedReview[] = records.map((record) => {
			const value = record.value as any;
			const rkey = record.uri.split('/').pop() ?? record.uri;
			return {
				rkey,
				uri: record.uri,
				title: value.title,
				creativeWorkType: value.creativeWorkType as PopfeedCreativeWorkType,
				rating: value.rating,
				text: value.text,
				posterUrl: value.posterUrl,
				mainCredit: value.mainCredit,
				mainCreditRole: value.mainCreditRole as PopfeedMainCreditRole | undefined,
				genres: value.genres,
				tags: value.tags,
				createdAt: value.createdAt,
				containsSpoilers: value.containsSpoilers,
				isRevisit: value.isRevisit
			};
		});

		cache.set(cacheKey, data);
		return data;
	} catch {
		return [];
	}
}

export async function fetchTangledRepos(
	did: string,
	fetchFn?: typeof fetch
): Promise<TangledReposData | null> {
	const cacheKey = `tangled:${did}`;
	const cached = cache.get<TangledReposData>(cacheKey);
	if (cached) return cached;

	try {
		const records = await withFallback(
			did,
			async (agent) => {
				const response = await agent.com.atproto.repo.listRecords({
					repo: did,
					collection: 'sh.tangled.repo',
					limit: 100
				});
				return response.data.records;
			},
			true,
			fetchFn
		);

		if (!records.length) return null;

		const repos: TangledRepo[] = records.map((record) => {
			const value = record.value as any;
			return {
				uri: record.uri,
				name: value.name,
				description: value.description,
				knot: value.knot,
				createdAt: value.createdAt,
				labels: value.labels,
				source: value.source,
				spindle: value.spindle
			};
		});

		repos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		const data: TangledReposData = { repos };
		cache.set(cacheKey, data);
		return data;
	} catch {
		return null;
	}
}

// Sifa Professional Profile fetch functions

export async function fetchSifaProfile(
	did: string,
	fetchFn?: typeof fetch
): Promise<SifaProfileData | null> {
	const cacheKey = `sifa:profile:${did}`;
	const cached = cache.get<SifaProfileData>(cacheKey);
	if (cached) return cached;

	try {
		const result = await withFallback(
			did,
			async (agent) => {
				const response = await agent.com.atproto.repo.getRecord({
					repo: did,
					collection: 'id.sifa.profile.self',
					rkey: 'self'
				});
				return response.data;
			},
			true,
			fetchFn
		);

		if (!result?.value) return null;
		const value = result.value as any;
		const data: SifaProfileData = {
			headline: value.headline,
			about: value.about,
			industry: value.industry,
			location: value.location,
			openTo: value.openTo || [],
			preferredWorkplace: value.preferredWorkplace || [],
			langs: value.langs || [],
			createdAt: value.createdAt
		};
		cache.set(cacheKey, data);
		return data;
	} catch {
		return null;
	}
}

export async function fetchSifaSkills(
	did: string,
	fetchFn?: typeof fetch
): Promise<SifaSkill[]> {
	const cacheKey = `sifa:skills:${did}`;
	const cached = cache.get<SifaSkill[]>(cacheKey);
	if (cached) return cached;

	try {
		const records = await withFallback(
			did,
			async (agent) => {
				const response = await agent.com.atproto.repo.listRecords({
					repo: did,
					collection: 'id.sifa.profile.skill',
					limit: 100
				});
				return response.data.records;
			},
			true,
			fetchFn
		);

		const data: SifaSkill[] = records.map((record) => {
			const value = record.value as any;
			return {
				name: value.name,
				category: value.category,
				uri: record.uri
			};
		});

		cache.set(cacheKey, data);
		return data;
	} catch {
		return [];
	}
}

export async function fetchSifaProjects(
	did: string,
	fetchFn?: typeof fetch
): Promise<SifaProject[]> {
	const cacheKey = `sifa:projects:${did}`;
	const cached = cache.get<SifaProject[]>(cacheKey);
	if (cached) return cached;

	try {
		const records = await withFallback(
			did,
			async (agent) => {
				const response = await agent.com.atproto.repo.listRecords({
					repo: did,
					collection: 'id.sifa.profile.project',
					limit: 100
				});
				return response.data.records;
			},
			true,
			fetchFn
		);

		const data: SifaProject[] = records.map((record) => {
			const value = record.value as any;
			return {
				name: value.name,
				description: value.description,
				url: value.url,
				startedAt: value.startedAt,
				uri: record.uri
			};
		});

		data.sort((a, b) => {
			if (!a.startedAt) return 1;
			if (!b.startedAt) return -1;
			return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
		});

		cache.set(cacheKey, data);
		return data;
	} catch {
		return [];
	}
}

export async function fetchSifaLanguages(
	did: string,
	fetchFn?: typeof fetch
): Promise<SifaLanguage[]> {
	const cacheKey = `sifa:languages:${did}`;
	const cached = cache.get<SifaLanguage[]>(cacheKey);
	if (cached) return cached;

	try {
		const records = await withFallback(
			did,
			async (agent) => {
				const response = await agent.com.atproto.repo.listRecords({
					repo: did,
					collection: 'id.sifa.profile.language',
					limit: 100
				});
				return response.data.records;
			},
			true,
			fetchFn
		);

		const data: SifaLanguage[] = records.map((record) => {
			const value = record.value as any;
			return {
				name: value.name,
				proficiency: value.proficiency,
				uri: record.uri
			};
		});

		cache.set(cacheKey, data);
		return data;
	} catch {
		return [];
	}
}

export async function fetchSifaCertifications(
	did: string,
	fetchFn?: typeof fetch
): Promise<SifaCertification[]> {
	const cacheKey = `sifa:certifications:${did}`;
	const cached = cache.get<SifaCertification[]>(cacheKey);
	if (cached) return cached;

	try {
		const records = await withFallback(
			did,
			async (agent) => {
				const response = await agent.com.atproto.repo.listRecords({
					repo: did,
					collection: 'id.sifa.profile.certification',
					limit: 100
				});
				return response.data.records;
			},
			true,
			fetchFn
		);

		const data: SifaCertification[] = records.map((record) => {
			const value = record.value as any;
			return {
				name: value.name,
				authority: value.authority,
				issuedAt: value.issuedAt,
				uri: record.uri
			};
		});

		data.sort((a, b) => {
			if (!a.issuedAt) return 1;
			if (!b.issuedAt) return -1;
			return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
		});

		cache.set(cacheKey, data);
		return data;
	} catch {
		return [];
	}
}

export async function fetchSifaExternalAccounts(
	did: string,
	fetchFn?: typeof fetch
): Promise<SifaExternalAccount[]> {
	const cacheKey = `sifa:externalAccounts:${did}`;
	const cached = cache.get<SifaExternalAccount[]>(cacheKey);
	if (cached) return cached;

	try {
		const records = await withFallback(
			did,
			async (agent) => {
				const response = await agent.com.atproto.repo.listRecords({
					repo: did,
					collection: 'id.sifa.profile.externalAccount',
					limit: 100
				});
				return response.data.records;
			},
			true,
			fetchFn
		);

		const data: SifaExternalAccount[] = records.map((record) => {
			const value = record.value as any;
			return {
				platform: value.platform,
				url: value.url,
				label: value.label,
				feedUrl: value.feedUrl,
				isPrimary: value.isPrimary,
				uri: record.uri
			};
		});

		cache.set(cacheKey, data);
		return data;
	} catch {
		return [];
	}
}
