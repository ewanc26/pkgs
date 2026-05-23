/**
 * Type definitions for AT Protocol services
 * Identical to src/lib/services/atproto/types.ts — no SvelteKit dependencies.
 */

export interface ProfileData {
	did: string;
	handle: string;
	displayName?: string;
	description?: string;
	avatar?: string;
	banner?: string;
	followersCount?: number;
	followsCount?: number;
	postsCount?: number;
	pronouns?: string;
}

export interface StatusData {
	text: string;
	createdAt: string;
}

export interface Technology {
	name: string;
	url?: string;
	description?: string;
}

export interface License {
	name: string;
	url?: string;
}

export interface BasedOnItem {
	section?: string;
	name?: string;
	url?: string;
	description?: string;
	type?: string;
}

export interface RelatedService {
	section?: string;
	name?: string;
	url?: string;
	description?: string;
	relationship?: string;
}

export interface Repository {
	platform?: string;
	url: string;
	type?: string;
	description?: string;
}

export interface Credit {
	section?: string;
	name?: string;
	type: string;
	url?: string;
	author?: string;
	license?: License;
	description?: string;
}

export interface SectionLicense {
	section?: string;
	name?: string;
	url?: string;
}

export interface SiteInfoData {
	technologyStack?: Technology[];
	privacyStatement?: string;
	openSourceInfo?: {
		description?: string;
		license?: License;
		basedOn?: BasedOnItem[];
		relatedServices?: RelatedService[];
		repositories?: Repository[];
	};
	credits?: Credit[];
	additionalInfo?: {
		websiteBirthYear?: number;
		purpose?: string;
		sectionLicense?: SectionLicense[];
	};
}

export interface LinkCard {
	url: string;
	text: string;
	emoji: string;
}

export interface LinkData {
	cards: LinkCard[];
}

export interface BlogPost {
	title: string;
	url: string;
	createdAt: string;
	platform: 'standard.site';
	description?: string;
	rkey: string;
	publicationName?: string;
	publicationRkey?: string;
	tags?: string[];
	coverImage?: string;
	textContent?: string;
	updatedAt?: string;
}

export interface BlogPostsData {
	posts: BlogPost[];
}

export interface Facet {
	index: { byteStart: number; byteEnd: number };
	features: Array<{ $type: string; uri?: string; did?: string; tag?: string }>;
}

export interface ExternalLink {
	uri: string;
	title: string;
	description?: string;
	thumb?: string;
}

export interface PostAuthor {
	did: string;
	handle: string;
	displayName?: string;
	avatar?: string;
	pronouns?: string;
}

export interface BlueskyPost {
	text: string;
	createdAt: string;
	uri: string;
	author: PostAuthor;
	likeCount?: number;
	repostCount?: number;
	replyCount?: number;
	hasImages: boolean;
	imageUrls?: string[];
	imageAlts?: string[];
	hasVideo?: boolean;
	videoUrl?: string;
	videoThumbnail?: string;
	quotedPostUri?: string;
	quotedPost?: BlueskyPost;
	facets?: Facet[];
	externalLink?: ExternalLink;
	replyParent?: BlueskyPost;
	replyRoot?: BlueskyPost;
	isRepost?: boolean;
	repostAuthor?: PostAuthor;
	repostCreatedAt?: string;
	originalPost?: BlueskyPost;
}

export interface ResolvedIdentity {
	did: string;
	pds: string;
}

export interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

export interface MusicArtist {
	artistName: string;
	artistMbId?: string;
}

export interface MusicStatusData {
	trackName: string;
	artists: MusicArtist[];
	releaseName?: string;
	playedTime: string;
	originUrl?: string;
	recordingMbId?: string;
	releaseMbId?: string;
	isrc?: string;
	duration?: number;
	musicServiceBaseDomain?: string;
	submissionClientAgent?: string;
	$type: 'fm.teal.alpha.actor.status' | 'fm.teal.alpha.feed.play';
	expiry?: string;
	artwork?: { ref?: { $link: string }; mimeType?: string; size?: number };
	artworkUrl?: string;
}

export interface KibunStatusData {
	text: string;
	emoji: string;
	createdAt: string;
	$type: 'social.kibun.status';
}

export interface TangledRepo {
	uri: string;
	name: string;
	description?: string;
	knot: string;
	createdAt: string;
	labels?: string[];
	source?: string;
	spindle?: string;
}

export interface TangledReposData {
	repos: TangledRepo[];
}

export interface StandardSiteThemeColor {
	r: number;
	g: number;
	b: number;
	a?: number;
}

export interface StandardSiteBasicTheme {
	background: StandardSiteThemeColor;
	foreground: StandardSiteThemeColor;
	accent: StandardSiteThemeColor;
	accentForeground: StandardSiteThemeColor;
}

export interface StandardSitePreferences {
	showInDiscover?: boolean;
	showComments?: boolean;
	showMentions?: boolean;
	showPrevNext?: boolean;
	showRecommends?: boolean;
}

export interface StandardSitePublication {
	name: string;
	rkey: string;
	uri: string;
	url: string;
	description?: string;
	icon?: string;
	basicTheme?: StandardSiteBasicTheme;
	preferences?: StandardSitePreferences;
}

export interface StandardSitePublicationsData {
	publications: StandardSitePublication[];
}

export interface StandardSiteDocument {
	title: string;
	rkey: string;
	uri: string;
	url: string;
	site: string;
	path?: string;
	description?: string;
	coverImage?: string;
	content?: any;
	textContent?: string;
	bskyPostRef?: { uri: string; cid: string };
	tags?: string[];
	publishedAt: string;
	updatedAt?: string;
	publicationName?: string;
	publicationRkey?: string;
	preferences?: StandardSitePreferences;
}

export interface StandardSiteDocumentsData {
	documents: StandardSiteDocument[];
}

export type PopfeedCreativeWorkType =
	| 'movie'
	| 'tv_show'
	| 'video_game'
	| 'album'
	| 'book'
	| 'book_series'
	| 'episode'
	| 'ep'
	| 'tv_season'
	| 'tv_episode'
	| 'track';

export type PopfeedMainCreditRole =
	| 'director'
	| 'author'
	| 'artist'
	| 'showrunner'
	| 'lead_actor'
	| 'creator'
	| 'studio'
	| 'publisher'
	| 'developer'
	| 'performer'
	| 'network';

export interface PopfeedReview {
	rkey: string;
	uri: string;
	title?: string;
	creativeWorkType: PopfeedCreativeWorkType;
	rating: number;
	text?: string;
	posterUrl?: string;
	mainCredit?: string;
	mainCreditRole?: PopfeedMainCreditRole;
	genres?: string[];
	tags?: string[];
	createdAt: string;
	containsSpoilers?: boolean;
	isRevisit?: boolean;
}

// Sifa Professional Profile Types

export interface SifaLocation {
	countryCode: string;
	region?: string;
	city?: string;
}

export interface SifaProfileData {
	headline: string;
	about: string;
	industry?: string;
	location?: SifaLocation;
	openTo: string[];
	preferredWorkplace: string[];
	langs: string[];
	createdAt: string;
}

export interface SifaSkill {
	name: string;
	category: string;
	uri: string;
}

export interface SifaProject {
	name: string;
	description?: string;
	url?: string;
	startedAt?: string;
	uri: string;
}

export interface SifaLanguage {
	name: string;
	proficiency: string;
	uri: string;
}

export interface SifaCertification {
	name: string;
	authority?: string;
	issuedAt?: string;
	uri: string;
}

export interface SifaExternalAccount {
	platform: string;
	url: string;
	label?: string;
	feedUrl?: string;
	isPrimary?: boolean;
	uri: string;
}

export interface SifaPosition {
	company: string;
	companyDid?: string;
	title: string;
	description?: string;
	employmentType?: string;
	workplaceType?: string;
	location?: SifaLocation;
	startedAt: string;
	endedAt?: string;
	skills?: string[];
	isPrimary?: boolean;
	uri: string;
}

export interface SifaEducation {
	institution: string;
	institutionDid?: string;
	degree?: string;
	fieldOfStudy?: string;
	grade?: string;
	activities?: string;
	description?: string;
	location?: SifaLocation;
	startedAt?: string;
	endedAt?: string;
	uri: string;
}

export interface SifaVolunteering {
	organization: string;
	organizationDid?: string;
	role?: string;
	cause?: string;
	description?: string;
	startedAt?: string;
	endedAt?: string;
	uri: string;
}

export interface SifaHonor {
	title: string;
	issuer?: string;
	issuerDid?: string;
	description?: string;
	awardedAt?: string;
	uri: string;
}

export interface SifaCourse {
	name: string;
	number?: string;
	institution?: string;
	education?: string;
	uri: string;
}

export interface SifaPublicationAuthor {
	name: string;
	did?: string;
}

export interface SifaPublication {
	title: string;
	publisher?: string;
	url?: string;
	description?: string;
	authors?: SifaPublicationAuthor[];
	publishedAt?: string;
	uri: string;
}

// Croft Click Toolkit Use Types

export interface ToolkitUseMalachite {
	$type: 'click.croft.tools.malachite';
	recordsImported?: number;
	mode?: string;
}

export interface ToolkitUseJasper {
	$type: 'click.croft.tools.jasper';
	recordsImported?: number;
}

export interface ToolkitUseBismuth {
	$type: 'click.croft.tools.bismuth';
	documentsConverted?: number;
}

export interface ToolkitUseOpal {
	$type: 'click.croft.tools.opal';
	postsImported?: number;
}

export interface ToolkitUseTourmaline {
	$type: 'click.croft.tools.tourmaline';
	scrobblesAnalyzed?: number;
	sharedToBluesky?: boolean;
}

export type ToolkitUseTool =
	| ToolkitUseMalachite
	| ToolkitUseJasper
	| ToolkitUseBismuth
	| ToolkitUseOpal
	| ToolkitUseTourmaline;

export interface ToolkitUseRecord {
	$type: 'click.croft.toolkit.use';
	tool: ToolkitUseTool;
	createdAt: string;
	context?: string;
}
