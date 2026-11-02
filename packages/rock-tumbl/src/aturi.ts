/**
 * Minimal AT URI parsing for the `site` fields used by Standard.site.
 *
 * A document's `site` may be either a publication URL (`https://…`) or an AT
 * URI pointing at a `site.standard.publication` record:
 *
 *   at://did:plc:abc123/site.standard.publication/3lwafzkjqm25s
 *
 * This module deliberately does not depend on a full AT Protocol client just
 * to validate that shape.
 */

export interface AtUriParts {
  did: string
  collection: string
  rkey: string
}

const DID_RE = /^did:[a-z0-9]+:[^/?#\s]+$/
const COLLECTION_RE = /^[A-Za-z0-9._~-]+$/
const RKEY_RE = /^[A-Za-z0-9._~:-]+$/

export function parseAtUri(uri: string): AtUriParts | undefined {
  if (!uri.startsWith('at://')) return undefined
  const parts = uri.slice('at://'.length).split('/')
  if (parts.length !== 3) return undefined

  const [did, collection, rkey] = parts
  if (!DID_RE.test(did) || !COLLECTION_RE.test(collection) || !RKEY_RE.test(rkey)) {
    return undefined
  }

  return { did, collection, rkey }
}

export function isAtUri(uri: string): boolean {
  return parseAtUri(uri) !== undefined
}

/** Whether `uri` names a `site.standard.publication` record. */
export function isPublicationAtUri(uri: string): boolean {
  return parseAtUri(uri)?.collection === 'site.standard.publication'
}
