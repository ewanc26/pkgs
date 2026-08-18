/**
 * MusicBrainz identifier normalisation — environment-agnostic.
 *
 * The teal lexicons (fm.teal.feed.play, fm.teal.feed.defs#artist) declare every
 * MusicBrainz field as `format: uri` and document the expected shape as
 * `mbid:<uuid>`. Sources hand us bare UUIDs (ListenBrainz) or full
 * musicbrainz.org URLs (some CSV exporters), both of which the PDS rejects with
 * `invalid format: Uri`, so everything is funnelled through here first.
 */

const MBID_URI_RE = /^mbid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Coerce a MusicBrainz identifier into the `mbid:<uuid>` URI the lexicon wants.
 * Returns undefined when the input holds no recognisable UUID, so callers can
 * simply omit the field rather than publish something the PDS will reject.
 */
export function normalizeMusicBrainzId(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (MBID_URI_RE.test(trimmed)) return `mbid:${trimmed.slice(5).toLowerCase()}`;

  const withoutUrl = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
  if (withoutUrl && UUID_RE.test(withoutUrl)) return `mbid:${withoutUrl.toLowerCase()}`;

  return undefined;
}
