/**
 * Apply richtext facet annotations to a plaintext string,
 * producing Markdown-formatted output.
 *
 * Supports facets from:
 * - pub.leaflet.richtext.facet
 * - blog.pckt.richtext.facet
 * - app.offprint.richtext.facet
 *
 * Facets use UTF-8 byte offsets (byteStart inclusive, byteEnd exclusive).
 * Spans are sorted by length (descending) so that outer spans emit their
 * markers before inner spans at the same position.
 */

import type {
  Facet,
  FacetFeature,
  PcktFacet,
  PcktFacetFeature,
  OffprintFacet,
  OffprintFacetFeature,
} from './types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface FootnoteDef {
  index: number
  id: string
  content: string
}

export interface ApplyFacetsResult {
  text: string
  footnotes: FootnoteDef[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalized feature type (platform-agnostic)
// ─────────────────────────────────────────────────────────────────────────────

type NormalizedFeature =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'code' }
  | { type: 'strikethrough' }
  | { type: 'underline' }
  | { type: 'highlight'; color?: string }
  | { type: 'link'; uri: string }
  | { type: 'footnote'; id: string; content: string }
  | { type: 'mention'; did: string; handle?: string }
  | { type: 'webMention'; uri: string; title: string; siteName?: string }
  | { type: 'atMention'; atURI: string }
  | { type: 'id'; id?: string }

/**
 * Normalize a facet feature from any platform to a platform-agnostic format.
 */
function normalizeFeature(
  feature: FacetFeature | PcktFacetFeature | OffprintFacetFeature,
): NormalizedFeature | null {
  const type = feature.$type

  // Extract base type without namespace (e.g., "pub.leaflet.richtext.facet#bold" → "bold")
  const hashIndex = type.indexOf('#')
  const baseType = hashIndex >= 0 ? type.slice(hashIndex + 1) : ''

  switch (baseType) {
    case 'bold':
      return { type: 'bold' }
    case 'italic':
      return { type: 'italic' }
    case 'code':
      return { type: 'code' }
    case 'strikethrough':
      return { type: 'strikethrough' }
    case 'underline':
      return { type: 'underline' }
    case 'highlight': {
      // Offprint highlight can have a color property
      const f = feature as { color?: string }
      return { type: 'highlight', color: f.color }
    }
    case 'link':
      return { type: 'link', uri: (feature as { uri: string }).uri }
    case 'footnote': {
      const f = feature as { footnoteId: string; contentPlaintext: string }
      return { type: 'footnote', id: f.footnoteId, content: f.contentPlaintext }
    }
    case 'didMention':
    case 'mention': {
      // didMention (Leaflet/Pckt) and mention (Offprint) both have did
      // Offprint mention can optionally have handle
      const f = feature as { did: string; handle?: string }
      return { type: 'mention', did: f.did, handle: f.handle }
    }
    case 'atMention':
      return { type: 'atMention', atURI: (feature as { atURI: string }).atURI }
    case 'webMention': {
      // Offprint-specific: webMention with title and optional siteName
      const f = feature as { uri: string; title: string; siteName?: string }
      return { type: 'webMention', uri: f.uri, title: f.title, siteName: f.siteName }
    }
    case 'id':
      return { type: 'id', id: (feature as { id?: string }).id }
    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core
// ─────────────────────────────────────────────────────────────────────────────

type AnyFacet = Facet | PcktFacet | OffprintFacet

export function applyFacets(
  plaintext: string,
  facets: AnyFacet[] | undefined,
): ApplyFacetsResult {
  if (!facets || facets.length === 0) {
    return { text: plaintext, footnotes: [] }
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const bytes = encoder.encode(plaintext)

  // Marker maps: keyed by byte position.
  // "before" markers are emitted just before the character at that byte offset.
  // "after" markers are emitted just after advancing past the character whose
  // sequence ends at that byte offset (i.e. after[byteEnd]).
  const before = new Map<number, string[]>()
  const after = new Map<number, string[]>()
  const footnotes: FootnoteDef[] = []

  const addBefore = (pos: number, s: string): void => {
    if (!before.has(pos)) before.set(pos, [])
    before.get(pos)!.push(s)
  }
  const addAfter = (pos: number, s: string): void => {
    if (!after.has(pos)) after.set(pos, [])
    after.get(pos)!.push(s)
  }

  // Process facets sorted by span length descending — wider spans go outer.
  const sorted = [...facets].sort(
    (a, b) =>
      b.index.byteEnd - b.index.byteStart - (a.index.byteEnd - a.index.byteStart),
  )

  for (const facet of sorted) {
    const { byteStart, byteEnd } = facet.index
    for (const feature of facet.features) {
      const normalized = normalizeFeature(feature)
      if (normalized) {
        applyFeature(normalized, byteStart, byteEnd, footnotes, addBefore, addAfter)
      }
    }
  }

  // Build the output string, walking through the UTF-8 bytes.
  let result = ''
  let bytePos = 0

  while (bytePos <= bytes.length) {
    // Emit "before" markers at this position (outer-first, as stored).
    for (const s of before.get(bytePos) ?? []) result += s

    // End of string: nothing more to emit.
    if (bytePos >= bytes.length) break

    // Decode the next Unicode scalar (variable-width UTF-8).
    const byte = bytes[bytePos]!
    const charLen = byte >= 0xf0 ? 4 : byte >= 0xe0 ? 3 : byte >= 0xc0 ? 2 : 1
    result += decoder.decode(bytes.slice(bytePos, bytePos + charLen))
    bytePos += charLen

    // Emit "after" markers for spans closing at the new bytePos.
    // Reverse so that inner spans close before outer spans.
    const afters = after.get(bytePos)
    if (afters) {
      for (const s of [...afters].reverse()) result += s
    }
  }

  return { text: result, footnotes }
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature handler
// ─────────────────────────────────────────────────────────────────────────────

function applyFeature(
  feature: NormalizedFeature,
  byteStart: number,
  byteEnd: number,
  footnotes: FootnoteDef[],
  addBefore: (pos: number, s: string) => void,
  addAfter: (pos: number, s: string) => void,
): void {
  switch (feature.type) {
    case 'bold':
      addBefore(byteStart, '**')
      addAfter(byteEnd, '**')
      break

    case 'italic':
      addBefore(byteStart, '*')
      addAfter(byteEnd, '*')
      break

    case 'code':
      addBefore(byteStart, '`')
      addAfter(byteEnd, '`')
      break

    case 'strikethrough':
      addBefore(byteStart, '~~')
      addAfter(byteEnd, '~~')
      break

    case 'underline':
      // No CommonMark equivalent — fall back to HTML.
      addBefore(byteStart, '<u>')
      addAfter(byteEnd, '</u>')
      break

    case 'highlight':
      if (feature.color) {
        // Offprint highlight with color: use HTML mark with style
        addBefore(byteStart, `<mark style="background-color:${feature.color}">`)
        addAfter(byteEnd, '</mark>')
      } else {
        // Extended Markdown (e.g. Obsidian, Pandoc extended).
        addBefore(byteStart, '==')
        addAfter(byteEnd, '==')
      }
      break

    case 'link':
      addBefore(byteStart, '[')
      addAfter(byteEnd, `](${feature.uri})`)
      break

    case 'footnote': {
      const fnIdx = footnotes.length + 1
      footnotes.push({
        index: fnIdx,
        id: feature.id,
        content: feature.content,
      })
      // Append the reference marker after the anchor span.
      addAfter(byteEnd, `[^${fnIdx}]`)
      break
    }

    case 'mention':
      // Offprint mention can have a handle; append as a link after the text
      if (feature.handle) {
        addAfter(
          byteEnd,
          ` ([@${feature.handle}](https://bsky.app/profile/${feature.did}))`,
        )
      }
      // If no handle, leave text as-is (didMention without handle)
      break

    case 'webMention': {
      // Offprint webMention: link with title in the reference
      addBefore(byteStart, '[')
      const siteSuffix = feature.siteName ? ` — ${feature.siteName}` : ''
      addAfter(byteEnd, `](${feature.uri} "${feature.title}${siteSuffix}")`)
      break
    }

    // atMention and id have no Markdown equivalent — leave text as-is.
    case 'atMention':
    case 'id':
      break
  }
}
