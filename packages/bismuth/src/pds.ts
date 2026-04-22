/**
 * PDS resolution and ATProto record fetching.
 *
 * Resolve a DID to its PDS endpoint, then fetch records
 * (site.standard.publication, site.standard.document) from that PDS.
 */

import type { StandardDocument } from './types.js'

// ─── PDS resolution ──────────────────────────────────────────────────────────

/**
 * Resolve a DID to its PDS endpoint via the PLC directory.
 *
 * Fetches the DID document from `https://plc.directory/{did}` and
 * extracts the `#atproto_pds` service endpoint.
 */
export async function resolvePdsEndpoint(did: string): Promise<string> {
  const res = await fetch(`https://plc.directory/${encodeURIComponent(did)}`)
  if (!res.ok) {
    throw new Error(`Failed to resolve DID "${did}": ${res.status} ${res.statusText}`)
  }

  const doc = await res.json() as {
    service?: Array<{ id: string; type: string; serviceEndpoint: string }>
  }

  const pds = doc.service?.find(
    (s) => s.id === '#atproto_pds' || s.id === 'atproto_pds',
  )

  if (!pds) {
    throw new Error(`No ATProto PDS service found in DID document for "${did}"`)
  }

  return pds.serviceEndpoint.replace(/\/$/, '')
}

// ─── Record fetching ─────────────────────────────────────────────────────────

interface ListRecordsResponse {
  cursor?: string
  records: Array<{
    uri: string
    cid: string
    value: Record<string, unknown>
  }>
}

/**
 * Fetch a single record from a PDS.
 */
export async function fetchRecord<T>(
  pdsEndpoint: string,
  did: string,
  collection: string,
  rkey: string,
): Promise<T> {
  const url = `${pdsEndpoint}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=${encodeURIComponent(collection)}&rkey=${encodeURIComponent(rkey)}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${collection}/${rkey}: ${res.status} ${res.statusText}`,
    )
  }
  const data = await res.json() as { uri: string; cid: string; value: T }
  return data.value
}

/**
 * List all records of a given collection from a repo, with pagination.
 */
export async function listRecords(
  pdsEndpoint: string,
  did: string,
  collection: string,
): Promise<ListRecordsResponse['records']> {
  const all: ListRecordsResponse['records'] = []
  let cursor: string | undefined

  do {
    const params = new URLSearchParams({
      repo: did,
      collection,
      limit: '100',
    })
    if (cursor) params.set('cursor', cursor)

    const url = `${pdsEndpoint}/xrpc/com.atproto.repo.listRecords?${params}`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(
        `Failed to list ${collection}: ${res.status} ${res.statusText}`,
      )
    }

    const data = await res.json() as ListRecordsResponse
    all.push(...data.records)
    cursor = data.cursor
  } while (cursor)

  return all
}

/**
 * Extract the rkey from an AT URI.
 *
 * `at://did:plc:abc/site.standard.document/3mk2ehtxzqc2u` → `3mk2ehtxzqc2u`
 */
export function rkeyFromUri(uri: string): string {
  const parts = uri.split('/')
  return parts[parts.length - 1] ?? ''
}

/**
 * List all site.standard.document records belonging to a publication.
 *
 * Fetches the publication record, then lists all documents in the repo
 * and filters to those whose `site` field references the publication.
 */
export async function listDocuments(
  pdsEndpoint: string,
  did: string,
  publicationRkey: string,
): Promise<Array<{ rkey: string; doc: StandardDocument }>> {
  // The publication's AT URI
  const pubUri = `at://${did}/site.standard.publication/${publicationRkey}`

  // List all documents
  const records = await listRecords(pdsEndpoint, did, 'site.standard.document')

  // Filter to documents belonging to this publication
  const results: Array<{ rkey: string; doc: StandardDocument }> = []

  for (const record of records) {
    const value = record.value as Record<string, unknown>
    if (value.site === pubUri || value.site === pubUri.replace(did, did)) {
      results.push({
        rkey: rkeyFromUri(record.uri),
        doc: value as unknown as StandardDocument,
      })
    }
  }

  return results
}
