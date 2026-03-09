// Re-export types and functions from the AT Protocol service layer.
// Key API difference from the app's src/lib/services/atproto:
//   All functions that previously read PUBLIC_ATPROTO_DID from the environment
//   now accept `did: string` as their first argument.

export type {
	ProfileData,
	SiteInfoData,
	LinkData,
	LinkCard,
	BlueskyPost,
	BlogPost,
	PostAuthor,
	ExternalLink,
	Facet,
	Technology,
	License,
	BasedOnItem,
	RelatedService,
	Repository,
	Credit,
	SectionLicense,
	ResolvedIdentity,
	CacheEntry,
	MusicStatusData,
	MusicArtist,
	KibunStatusData,
	TangledRepo,
	TangledReposData,
	StandardSitePublication,
	StandardSitePublicationsData,
	StandardSiteDocument,
	StandardSiteDocumentsData,
	StandardSiteBasicTheme,
	StandardSiteThemeColor
} from './types.js';

export {
	fetchProfile,
	fetchSiteInfo,
	fetchLinks,
	fetchMusicStatus,
	fetchKibunStatus,
	fetchTangledRepos
} from './fetch.js';

export {
	fetchPublications,
	fetchDocuments,
	fetchRecentDocuments,
	fetchBlogPosts
} from './documents.js';

export { fetchLatestBlueskyPost, fetchPostFromUri } from './posts.js';

export { buildPdsBlobUrl, extractCidFromImageObject, extractImageUrlsFromValue } from './media.js';

export { createAgent, constellationAgent, defaultAgent, resolveIdentity, getPublicAgent, getPDSAgent, withFallback, resetAgents } from './agents.js';

export {
	searchMusicBrainzRelease,
	buildCoverArtUrl,
	searchiTunesArtwork,
	searchDeezerArtwork,
	searchLastFmArtwork,
	findArtwork
} from './musicbrainz.js';

export { fetchEngagementFromConstellation, fetchAllEngagement } from './engagement.js';

export { cache, ATProtoCache, CACHE_TTL } from './cache.js';

export { fetchAllRecords, fetchAllUserRecords } from './pagination/index.js';
export type { FetchRecordsConfig, AtProtoRecord } from './pagination/index.js';
