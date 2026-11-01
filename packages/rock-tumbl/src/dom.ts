/**
 * Minimal DOM boundary for the parser and sanitiser.
 *
 * Node has no global `DOMParser` or `Node`, and Tumblr export bodies are
 * untrusted HTML/XML. linkedom supplies both without a native or headless
 * browser dependency, so the package runs in plain Node and in CI.
 *
 * linkedom's `text/html` parsing keeps only the first top-level node of a
 * bare fragment, so fragments are wrapped in a full document before parsing.
 */

import { DOMParser } from 'linkedom'

/** DOM node type constants, matching the DOM spec (and linkedom). */
export const TEXT_NODE = 3
export const ELEMENT_NODE = 1

/**
 * Parse an HTML fragment and return the element that holds its nodes.
 *
 * A per-post Tumblr cover is a full document, while callers also pass bare
 * fragments such as `'<p>hi</p>'`. linkedom keeps only the first top-level
 * node of a bare fragment, so parse as a document first and re-wrap only when
 * the result has no body content.
 */
export function parseHtmlFragment(html: string): Element {
  if (html.trim()) {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      if (doc.documentElement) {
        const body = doc.body as unknown as Element | undefined
        if (body && body.childNodes.length > 0) return body
      }
    } catch {
      // Empty or unparseable input; fall through to the wrapped parse.
    }
  }

  const wrapped = new DOMParser().parseFromString(
    `<!DOCTYPE html><html><body>${html}</body></html>`,
    'text/html',
  )
  const wrappedBody = wrapped.body as unknown as Element | undefined
  if (wrappedBody) return wrappedBody
  // Some inputs normalise away <body>; fall back to the document root.
  return wrapped.documentElement as unknown as Element
}

/** Parse an XML document, returning the document root. */
export function parseXmlDocument(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'text/xml') as unknown as Document
}
