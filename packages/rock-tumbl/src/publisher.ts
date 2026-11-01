/**
 * Standard.site document publisher.
 *
 * Publishes site.standard.document records to an AT Protocol PDS using
 * @atproto/lex. Record keys are TIDs derived from the document's publishedAt
 * timestamp, matching the standard.site lexicon requirements.
 *
 * Media (blob uploads) and idempotent re-imports (durable Tumblr-id → AT-URI
 * mapping) are intentionally out of scope for the initial version; see the
 * project issue for the proposed implementation sequence.
 */

import { Client } from '@atproto/lex'
import { com } from '@bsky/sdk/lexicons'
import { generateTID } from '@ewanc26/tid'
import type { StandardDocumentValue } from './types.js'

const DOCUMENT_COLLECTION = 'site.standard.document'

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

export class StandardSitePublisher {
  private client: Client | null = null
  private did: string | null = null

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
    this.did = (client as any).assertDid ?? null

    // Resolve the PDS from the DID document
    const did = this.did!
    let pdsUrl: string
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

    this.config.onLog?.('info', `Logged in as ${this.did} (${pdsUrl})`)
  }

  /**
   * Publish a single site.standard.document record.
   * Returns the record's AT URI and CID.
   */
  async publishDocument(doc: StandardDocumentValue, dryRun = false): Promise<PublishResult> {
    if (!this.client) throw new Error('Not logged in — call login() first')

    const rkey = generateTID(doc.publishedAt)

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
      this.config.onLog?.('info', `[DRY RUN] Would create ${DOCUMENT_COLLECTION}/${rkey}: ${doc.title}`)
      return { uri: `at://${this.did}/${DOCUMENT_COLLECTION}/${rkey}`, cid: 'dry-run' }
    }

    const response = await (this.client as any).call(com.atproto.repo.createRecord, {
      repo: this.did!,
      collection: DOCUMENT_COLLECTION,
      rkey,
      value,
    })

    const uri = (response as any)?.uri
    const cid = (response as any)?.cid
    if (!uri || !cid) throw new Error(`Publish returned no uri/cid for ${doc.title}`)

    this.config.onLog?.('info', `Published ${uri}`)
    return { uri, cid }
  }

  getDid(): string | null {
    return this.did
  }
}
