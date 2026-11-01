/**
 * HTML sanitisation and HTML-to-markdown conversion.
 *
 * Tumblr export bodies are untrusted HTML. We sanitise them with an allow-list
 * before converting to markdown for the site.standard.content.markdown format.
 * Nothing is rendered in a browser here; this is purely string transformation.
 */

import { ELEMENT_NODE, TEXT_NODE, parseHtmlFragment } from './dom.js'

const ALLOWED_ELEMENTS = new Set([
  'p',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'ul',
  'ol',
  'li',
  'code',
  'pre',
  'a',
  'img',
  'hr',
  'div',
  'span',
  'sub',
  'sup',
])

const ALLOWED_ATTRS = new Set(['href', 'src', 'alt', 'title'])

const BLOCK_LEVEL = new Set([
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol',
  'pre', 'hr',
])

const SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i
const DANGEROUS_SCHEMES = new Set(['javascript', 'vbscript', 'data'])

function isDangerousUrl(url: string): boolean {
  const m = SCHEME_RE.exec(url.trim())
  return Boolean(m && DANGEROUS_SCHEMES.has(m[1].toLowerCase()))
}

function sanitizeAttr(name: string, value: string): string | null {
  if (!ALLOWED_ATTRS.has(name.toLowerCase())) return null
  if ((name.toLowerCase() === 'href' || name.toLowerCase() === 'src') && isDangerousUrl(value)) {
    return null
  }
  return value
}

// ─── Sanitisation ───────────────────────────────────────────────────────────

/**
 * Return a sanitised HTML string containing only allowed elements/attributes.
 * Unsafe nodes are dropped entirely; their text content is preserved.
 */
export function sanitizeHtml(html: string): string {
  const body = parseHtmlFragment(html)
  if (!body) return ''
  return renderNode(body, { inAnchor: false })
}

// ─── Plain text ─────────────────────────────────────────────────────────────

/**
 * Extract plain text from HTML for the document textContent field.
 */
export function htmlToText(html: string): string {
  return bodyText(parseHtmlFragment(html))
}

function bodyText(el: Element): string {
  const parts: string[] = []
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === TEXT_NODE) {
      parts.push(node.textContent ?? '')
    } else if (node.nodeType === ELEMENT_NODE) {
      const child = node as Element
      const tag = child.tagName.toLowerCase()
      if (tag === 'script' || tag === 'style') continue
      parts.push(bodyText(child))
      if (BLOCK_LEVEL.has(tag) || tag === 'br' || tag === 'p') parts.push('\n')
    }
  }
  return parts.join('').replace(/\s+/g, ' ').trim()
}

// ─── HTML → markdown ────────────────────────────────────────────────────────

/**
 * Convert sanitised HTML to markdown suitable for site.standard.content.markdown.
 */
export function htmlToMarkdown(html: string): string {
  const body = parseHtmlFragment(html)
  if (!body) return ''
  return toMarkdown(body).replace(/\n{3,}/g, '\n\n').trim()
}

interface RenderCtx {
  inAnchor: boolean
}

function renderNode(node: Node, ctx: RenderCtx): string {
  if (node.nodeType === TEXT_NODE) {
    return escapeHtml(node.textContent ?? '')
  }
  if (node.nodeType !== ELEMENT_NODE) return ''
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  // Script and style source is never post content.
  if (tag === 'script' || tag === 'style') return ''
  if (!ALLOWED_ELEMENTS.has(tag)) {
    // Drop unsafe element but keep its text content
    return Array.from(el.childNodes).map((n) => renderNode(n, ctx)).join('')
  }

  const attrs: string[] = []
  for (const attr of Array.from(el.attributes)) {
    const v = sanitizeAttr(attr.name, attr.value)
    if (v !== null) attrs.push(`${escapeAttr(attr.name)}="${escapeHtml(v)}"`)
  }
  const attrStr = attrs.length ? ' ' + attrs.join(' ') : ''
  const inner = Array.from(el.childNodes).map((n) => renderNode(n, ctx)).join('')

  switch (tag) {
    case 'a':
      return `<a${attrStr}>${inner}</a>`
    case 'img':
      return `<img${attrStr} />`
    case 'br':
      return '<br />'
    case 'hr':
      return '<hr />'
    default:
      return `<${tag}${attrStr}>${inner}</${tag}>`
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function toMarkdown(el: Element): string {
  const tag = el.tagName.toLowerCase()
  if (tag === 'script' || tag === 'style') return ''
  const children = Array.from(el.childNodes)
  const inner = children.map(toMarkdownNode).join('')

  switch (tag) {
    case 'p':
      return block(inner)
    case 'br':
      return '\n'
    case 'h1':
      return block('# ' + inline(inner))
    case 'h2':
      return block('## ' + inline(inner))
    case 'h3':
      return block('### ' + inline(inner))
    case 'h4':
      return block('#### ' + inline(inner))
    case 'h5':
      return block('##### ' + inline(inner))
    case 'h6':
      return block('###### ' + inline(inner))
    case 'blockquote': {
      const lines = inner.split('\n')
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
      return block(lines.map((l) => (l ? '> ' + l : '>')).join('\n'))
    }
    case 'ul':
      return block(
        children
          .filter((c) => c.nodeType === ELEMENT_NODE && (c as Element).tagName.toLowerCase() === 'li')
          .map((c) => '- ' + inline(toMarkdown(c as Element)))
          .join('\n'),
      )
    case 'ol': {
      let i = 1
      const items = children
        .filter((c) => c.nodeType === ELEMENT_NODE && (c as Element).tagName.toLowerCase() === 'li')
        .map((c) => `${i++}. ${inline(toMarkdown(c as Element))}`)
      return block(items.join('\n'))
    }
    case 'li':
      return inner
    case 'code':
      return '`' + inline(inner) + '`'
    case 'pre':
      return block('\n```\n' + inner + '\n```\n')
    case 'strong':
    case 'b':
      return '**' + inline(inner) + '**'
    case 'em':
    case 'i':
      return '*' + inline(inner) + '*'
    case 'u':
      return '__' + inline(inner) + '__'
    case 's':
    case 'strike':
      return '~~' + inline(inner) + '~~'
    case 'a': {
      const href = el.getAttribute('href') ?? ''
      const text = inline(inner)
      if (!href || isDangerousUrl(href)) return text
      return `[${text}](${href})`
    }
    case 'img': {
      const src = el.getAttribute('src') ?? ''
      const alt = el.getAttribute('alt') ?? ''
      if (!src || isDangerousUrl(src)) return alt
      return `![${alt}](${src})`
    }
    case 'hr':
      return block('\n---\n')
    case 'div':
    case 'span':
    case 'sub':
    case 'sup':
      return inner
    default:
      return inner
  }
}

function toMarkdownNode(node: Node): string {
  if (node.nodeType === TEXT_NODE) return node.textContent ?? ''
  if (node.nodeType !== ELEMENT_NODE) return ''
  return toMarkdown(node as Element)
}

function block(content: string): string {
  const trimmed = content.trim()
  return trimmed ? trimmed + '\n\n' : ''
}

function inline(content: string): string {
  return content.replace(/\n+/g, ' ').trim()
}
