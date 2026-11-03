/**
 * Standard.site publisher.
 *
 * Publishes `site.standard.publication` and `site.standard.document` records to
 * an AT Protocol PDS using @atproto/lex. Document record keys are derived
 * deterministically from the document path, so re-importing the same archive
 * updates existing records instead of creating duplicates. Publication keys use
 * the current time. Media blobs are uploaded with
 * `com.atproto.repo.uploadBlob` and served back through
 * `com.atproto.sync.getBlob`.
 */

import { Client } from '@atproto/lex'
import { com } from '@bsky/sdk/lexicons'
import { createHash } from 'node:crypto'
import { generateNextTID } from '@ewanc26/tid'
import { buildPublicationValue, PUBLICATION_COLLECTION, type PublicationInput } from './publication.js'
import type { AtProtoBlobRef, StandardDocumentValue } from './types.js'

const DOCUMENT_COLLECTION = 'site.standard.document'

// AT Protocol's base-32 alphabet, shared with TIDs. Using it keeps generated
// record keys the same shape and character set as the TIDs other clients use.
const S32 = '234567abcdefghijklmnopqrstuvwxyz'
const RECORD_KEY_LENGTH = 13

export interface PublisherConfig {
  handle: string
  password: string
  service?: string
  onLog?: (level: 'info' | 'warn' | 'error', msg: string) => void
}

export interface PublishResult {
  uri: string
  cid: string
}

export interface PublishProgress {
  onLog?: (level: 'info' | 'warn' | 'error', msg: string) => void
}

interface AccessSession {
  session: { accessJwt: string }
  /** Runs an authenticated request against the session's PDS, refreshing if needed. */
  fetchHandler(path: string, init: RequestInit): Promise<Response>
}

/**
 * Deterministic record key for a document.
 *
 * Re-importing an archive must not duplicate records, so the key is derived
 * from the document's stable path (which itself comes from the Tumblr post id
 * or slug). The result is 13 base-32 characters — the same shape as a TID — so
 * clients that assume TID-style keys keep working.
 */
export function documentRecordKey(doc: StandardDocumentValue): string {
  const identity = doc.path?.trim() || `${doc.publishedAt}\n${doc.title}`
  const digest = createHash('sha256').update(identity).digest()

  let key = ''
  let bits = 0
  let value = 0
  for (const byte of digest) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5 && key.length < RECORD_KEY_LENGTH) {
      bits -= 5
      key += S32[(value >>> bits) & 31]
    }
    if (key.length === RECORD_KEY_LENGTH) break
  }
  return key
}

export class StandardSitePublisher {
  private client: Client | null = null
  private session: AccessSession | null = null
  private did: string | null = null
  private pdsUrl: string | null = null

  constructor(private readonly config: PublisherConfig) {}

  async login(): Promise<void> {
    const { PasswordSession: PS } = await import('@atproto/lex-password-session')
    const session = await PS.login({
      service: this.config.service ?? 'https://bsky.social',
      identifier: this.config.handle,
      password: this.config.password,
    })

    const client = new Client(session, {
      service: (this.config.service ?? 'https://bsky.social') as any,
    })

    this.client = client
    this.session = session
    this.did = session.did

    // Resolve the PDS from the DID document
    const did = this.did!
    let pdsUrl: string | undefined
    if (did.startsWith('did:plc:')) {
      const res = await fetch(`https://plc.directory/${did}`)
      if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`)
      const didDoc = await res.json()
      pdsUrl = didDoc.service?.find(
        (s: any) => s.type === 'AtprotoPersonalDataServer' || s.id === '#atproto_pds',
      )?.serviceEndpoint
    } else if (did.startsWith('did:web:')) {
      const domain = did.slice('did:web:'.length)
      const res = await fetch(`https://${domain}/.well-known/did.json`)
      if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`)
      const didDoc = await res.json()
      pdsUrl = didDoc.service?.find(
        (s: any) => s.type === 'AtprotoPersonalDataServer' || s.id === '#atproto_pds',
      )?.serviceEndpoint
    } else {
      throw new Error(`Unsupported DID method: ${did}`)
    }
    if (!pdsUrl) throw new Error(`No PDS found for ${did}`)

    this.pdsUrl = pdsUrl.replace(/\/+$/, '')
    this.config.onLog?.('info', `Logged in as ${this.did} (${this.pdsUrl})`)
  }

  /**
   * Create a site.standard.publication record.
   * Returns the new record's AT URI and CID.
   */
  async createPublication(input: PublicationInput, dryRun = false): Promise<PublishResult> {
    if (!this.client || !this.did) throw new Error('Not logged in — call login() first')

    const value = buildPublicationValue(input)
    const rkey = generateNextTID()
    const uri = `at://${this.did}/${PUBLICATION_COLLECTION}/${rkey}`

    if (dryRun) {
      this.config.onLog?.(
        'info',
        `[DRY RUN] Would create ${PUBLICATION_COLLECTION}/${rkey}: ${value.name}`,
      )
      return { uri, cid: 'dry-run' }
    }

    const response = await (this.client as any).call(com.atproto.repo.createRecord, {
      repo: this.did,
      collection: PUBLICATION_COLLECTION,
      rkey,
      value,
    })

    const createdUri = (response as any)?.uri
    const cid = (response as any)?.cid
    if (!createdUri || !cid) throw new Error(`Publish returned no uri/cid for ${value.name}`)

    this.config.onLog?.('info', `Created publication ${createdUri}`)
    return { uri: createdUri, cid }
  }

  /**
   * Publish a single site.standard.document record.
   *
   * Uses `putRecord` with a deterministic key, so a re-import updates the
   * existing record rather than creating a duplicate. Returns the record's AT
   * URI and CID.
   */
  async publishDocument(doc: StandardDocumentValue, dryRun = false): Promise<PublishResult> {
    if (!this.client || !this.did) throw new Error('Not logged in — call login() first')

    const rkey = documentRecordKey(doc)

    const value: Record<string, unknown> = {
      $type: DOCUMENT_COLLECTION,
      site: doc.site,
      title: doc.title,
      publishedAt: doc.publishedAt,
    }
    if (doc.path) value.path = doc.path
    if (doc.description) value.description = doc.description
    if (doc.updatedAt) value.updatedAt = doc.updatedAt
    if (doc.tags) value.tags = doc.tags
    if (doc.textContent) value.textContent = doc.textContent
    if (doc.content) value.content = doc.content
    if (doc.bskyPostRef) value.bskyPostRef = doc.bskyPostRef
    if (doc.coverImage) value.coverImage = doc.coverImage
    if (doc.preferences) value.preferences = doc.preferences

    if (dryRun) {
      this.config.onLog?.(
        'info',
        `[DRY RUN] Would write ${DOCUMENT_COLLECTION}/${rkey}: ${doc.title}`,
      )
      return { uri: `at://${this.did}/${DOCUMENT_COLLECTION}/${rkey}`, cid: 'dry-run' }
    }

    const response = await (this.client as any).call(com.atproto.repo.putRecord, {
      repo: this.did,
      collection: DOCUMENT_COLLECTION,
      rkey,
      record: value,
    })

    const uri = (response as any)?.uri
    const cid = (response as any)?.cid
    if (!uri || !cid) throw new Error(`Publish returned no uri/cid for ${doc.title}`)

    this.config.onLog?.('info', `Wrote ${uri}`)
    return { uri, cid }
  }

  /**
   * Upload raw bytes to the PDS and return the blob reference used in records.
   * `com.atproto.repo.uploadBlob` takes the bytes directly, with the blob's
   * MIME type in Content-Type — not a multipart form.
   */
  async uploadBlob(data: Uint8Array, mimeType: string, dryRun = false): Promise<AtProtoBlobRef> {
    if (dryRun) {
      return { $type: 'blob', ref: { $link: 'dry-run' }, mimeType, size: data.byteLength }
    }
    if (!this.session || !this.pdsUrl) throw new Error('Not logged in — call login() first')

    const response = await this.session.fetchHandler('/xrpc/com.atproto.repo.uploadBlob', {
      method: 'POST',
      headers: { 'Content-Type': mimeType },
      body: data as unknown as BodyInit,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(
        `Blob upload failed: ${response.status}${detail ? ` ${detail.slice(0, 200)}` : ''}`,
      )
    }

    const body = (await response.json()) as { blob?: AtProtoBlobRef }
    if (!body.blob?.ref?.$link) throw new Error('Blob upload returned no CID')
    return body.blob
  }

  /** Public URL for an uploaded blob. */
  getBlobUrl(cid: string): string {
    if (!this.did || !this.pdsUrl) throw new Error('Not logged in — call login() first')
    return (
      `${this.pdsUrl}/xrpc/com.atproto.sync.getBlob` +
      `?did=${encodeURIComponent(this.did)}&cid=${encodeURIComponent(cid)}`
    )
  }

  getDid(): string | null {
    return this.did
  }

  getPdsUrl(): string | null {
    return this.pdsUrl
  }
}
