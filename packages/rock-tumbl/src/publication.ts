/**
 * Standard.site publication helpers.
 *
 * Creating a publication is a plain `com.atproto.repo.createRecord` call; the
 * value built here only contains the fields rock-tumbl can derive from a URL
 * and name. Domains are verified separately by serving the publication's AT
 * URI from `/.well-known/site.standard.publication`.
 */

import type { AtProtoBlobRef, StandardPublicationValue } from './types.js'

export const PUBLICATION_COLLECTION = 'site.standard.publication'

export interface PublicationInput {
  /** Base URL of the publication, e.g. https://myblog.example */
  url: string
  name: string
  description?: string
  /** Already-uploaded icon blob. */
  icon?: AtProtoBlobRef
  preferences?: StandardPublicationValue['preferences']
}

/**
 * Normalise a publication URL the way the lexicon recommends: no trailing
 * slashes, no query string, no fragment. Throws for non-HTTP(S) values.
 */
export function normalizePublicationUrl(input: string): string {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error(`Invalid publication URL: ${input}`)
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`Publication URL must use http(s): ${input}`)
  }

  url.hash = ''
  url.search = ''
  return url.toString().replace(/\/+$/, '')
}

/**
 * Where the publication's verification file belongs, e.g.
 * `/.well-known/site.standard.publication` for a root publication or
 * `/.well-known/site.standard.publication/blog` for a nested one.
 */
export function publicationWellKnownPath(input: string): string {
  const url = new URL(normalizePublicationUrl(input))
  const path = url.pathname.replace(/^\/+|\/+$/g, '')
  return `/.well-known/site.standard.publication${path ? `/${path}` : ''}`
}

/** Exact body to serve from the well-known endpoint. */
export function publicationWellKnownBody(atUri: string): string {
  return `${atUri}\n`
}

/** Build the record value for `site.standard.publication`. */
export function buildPublicationValue(input: PublicationInput): StandardPublicationValue {
  const name = input.name.trim()
  if (!name) throw new Error('Publication name is required')
  if (name.length > 5000) throw new Error('Publication name is too long (max 5000 characters)')

  const description = input.description?.trim()
  if (description && description.length > 30000) {
    throw new Error('Publication description is too long (max 30000 characters)')
  }

  const value: StandardPublicationValue = {
    $type: PUBLICATION_COLLECTION,
    url: normalizePublicationUrl(input.url),
    name,
  }

  if (description) value.description = description
  if (input.icon) value.icon = input.icon
  if (input.preferences) value.preferences = input.preferences

  return value
}
