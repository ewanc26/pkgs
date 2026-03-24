/**
 * Apply pub.leaflet.richtext.facet annotations to a plaintext string,
 * producing Markdown-formatted output.
 *
 * Facets use UTF-8 byte offsets (byteStart inclusive, byteEnd exclusive).
 * Spans are sorted by length (descending) so that outer spans emit their
 * markers before inner spans at the same position.
 */

import type { Facet, FacetFeature } from './types.js'

// ─── Public types ────────────────────────────────────────────────────────────

export interface FootnoteDef {
  index: number
  id: string
  content: string
}

export interface ApplyFacetsResult {
  text: string
  footnotes: FootnoteDef[]
}

// ─── Core ────────────────────────────────────────────────────────────────────

export function applyFacets(
  plaintext: string,
  facets: Facet[] | undefined,
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
      applyFeature(feature, byteStart, byteEnd, footnotes, addBefore, addAfter)
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

// ─── Feature handler ─────────────────────────────────────────────────────────

function applyFeature(
  feature: FacetFeature,
  byteStart: number,
  byteEnd: number,
  footnotes: FootnoteDef[],
  addBefore: (pos: number, s: string) => void,
  addAfter: (pos: number, s: string) => void,
): void {
  switch (feature.$type) {
    case 'pub.leaflet.richtext.facet#bold':
      addBefore(byteStart, '**')
      addAfter(byteEnd, '**')
      break

    case 'pub.leaflet.richtext.facet#italic':
      addBefore(byteStart, '*')
      addAfter(byteEnd, '*')
      break

    case 'pub.leaflet.richtext.facet#code':
      addBefore(byteStart, '`')
      addAfter(byteEnd, '`')
      break

    case 'pub.leaflet.richtext.facet#strikethrough':
      addBefore(byteStart, '~~')
      addAfter(byteEnd, '~~')
      break

    case 'pub.leaflet.richtext.facet#underline':
      // No CommonMark equivalent — fall back to HTML.
      addBefore(byteStart, '<u>')
      addAfter(byteEnd, '</u>')
      break

    case 'pub.leaflet.richtext.facet#highlight':
      // Extended Markdown (e.g. Obsidian, Pandoc extended).
      addBefore(byteStart, '==')
      addAfter(byteEnd, '==')
      break

    case 'pub.leaflet.richtext.facet#link':
      addBefore(byteStart, '[')
      addAfter(byteEnd, `](${feature.uri})`)
      break

    case 'pub.leaflet.richtext.facet#footnote': {
      const fnIdx = footnotes.length + 1
      footnotes.push({
        index: fnIdx,
        id: feature.footnoteId,
        content: feature.contentPlaintext,
      })
      // Append the reference marker after the anchor span.
      addAfter(byteEnd, `[^${fnIdx}]`)
      break
    }

    // Mention and id facets have no Markdown equivalent — leave text as-is.
    case 'pub.leaflet.richtext.facet#didMention':
    case 'pub.leaflet.richtext.facet#atMention':
    case 'pub.leaflet.richtext.facet#id':
      break

    default:
      break
  }
}
