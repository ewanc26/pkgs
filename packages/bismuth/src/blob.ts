/**
 * Resolve Pckt content blob references.
 *
 * When blog.pckt.content uses extended mode (blob field instead of items),
 * we need to fetch the blob from the PDS to get the actual content blocks.
 */

import type { AnyBlock, BlobRef, PcktContent } from './types.js'

// ─────────────────────────────────────────────────────────────────────────────

export interface BlobResolver {
  resolveBlob(did: string, blob: BlobRef): Promise<AnyBlock[]>
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default blob resolver using ATProto PDS endpoint.
 * Requires the source DID to construct the blob URL.
 */
export function createPdsBlobResolver(pdsEndpoint?: string): BlobResolver {
  return {
    async resolveBlob(did: string, blob: BlobRef): Promise<AnyBlock[]> {
      // Construct blob URL: https://{pds}/xrpc/com.atproto.sync.getBlob?did={did}&cid={cid}
      const endpoint = pdsEndpoint ?? 'https://bsky.network'
      const cid = blob.ref?.cid ?? blob.cid

      if (!cid) {
        throw new Error('Blob has no CID reference')
      }

      const url = `${endpoint}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(
          `Failed to resolve blob: ${response.status} ${response.statusText}`,
        )
      }

      const data = await response.json()
      if (!Array.isArray(data)) {
        throw new Error('Blob content is not an array of blocks')
      }

      return data as AnyBlock[]
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve Pckt content, handling both inline and extended modes.
 *
 * @param content - The Pckt content object
 * @param sourceDid - DID of the content source (required for blob resolution)
 * @param resolver - Optional custom blob resolver (for testing)
 * @returns Array of content blocks
 */
export async function resolvePcktContent(
  content: PcktContent,
  sourceDid: string,
  resolver?: BlobResolver,
): Promise<AnyBlock[]> {
  // Inline mode: items array is present
  if (content.items) {
    return content.items
  }

  // Extended mode: blob reference
  if (content.blob) {
    const blobResolver = resolver ?? createPdsBlobResolver()
    return blobResolver.resolveBlob(sourceDid, content.blob)
  }

  // Empty content
  return []
}
