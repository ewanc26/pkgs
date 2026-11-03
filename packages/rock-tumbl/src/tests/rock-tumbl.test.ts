import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { TextReader, Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from '@zip.js/zip.js'
import {
  buildPublicationValue,
  convertArchive,
  detectLayout,
  documentRecordKey,
  htmlToMarkdown,
  htmlToText,
  isAtUri,
  isPublicationAtUri,
  normalizePublicationUrl,
  openMediaArchive,
  parseArchive,
  parseAtUri,
  parseExportTimestamp,
  publicationWellKnownBody,
  publicationWellKnownPath,
  rewriteMediaReferences,
  sanitizeHtml,
  uploadArchiveMedia,
  validateDocument,
  validateSite,
  type BlobUploader,
} from '../index.js'
import type { StandardDocumentValue, TumblrPost } from '../types.js'

// ─── Fixtures ───────────────────────────────────────────────────────────────

const tempRoots: string[] = []

after(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })))
})

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'rock-tumbl-test-'))
  tempRoots.push(root)
  return root
}

async function writeFiles(root: string, files: Record<string, string | Uint8Array>): Promise<void> {
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel)
    await mkdir(dirname(full), { recursive: true })
    await writeFile(full, content)
  }
}

async function makeTree(files: Record<string, string | Uint8Array>): Promise<string> {
  const root = await tempRoot()
  await writeFiles(root, files)
  return root
}

async function zipBytes(files: Record<string, string | Uint8Array>): Promise<Uint8Array> {
  const writer = new ZipWriter(new Uint8ArrayWriter())
  for (const [name, content] of Object.entries(files)) {
    await writer.add(
      name,
      typeof content === 'string'
        ? new TextReader(content)
        : new Uint8ArrayReader(content),
    )
  }
  return (await writer.close()) as Uint8Array
}

async function makeZip(files: Record<string, string | Uint8Array>): Promise<string> {
  const root = await tempRoot()
  const path = join(root, 'export.zip')
  await writeFile(path, await zipBytes(files))
  return path
}

interface CoverOptions {
  title?: string
  timestamp?: string
  tags?: string[]
}

const DEFAULT_TIMESTAMP = 'October 30th, 2024 7:03am'

/** Build a per-post HTML cover in the shape Tumblr's current export uses. */
function cover(body: string, options: CoverOptions = {}): string {
  const heading = options.title === undefined ? '<h1></h1>' : `<h1>${options.title}</h1>`
  const timestamp = options.timestamp ?? DEFAULT_TIMESTAMP
  const tags = (options.tags ?? [])
    .map((tag) => `\n<span class="tag">${tag}</span>`)
    .join('')
  return [
    '<!DOCTYPE html>',
    '<html><head><meta charset="utf-8"></head><body>',
    heading,
    body,
    `<div id="footer"><span id="timestamp"> ${timestamp} </span>${tags}</div>`,
    '</body></html>',
  ].join('\n')
}

function makePost(overrides: Partial<TumblrPost> = {}): TumblrPost {
  return {
    id: '1000',
    type: 'text',
    title: 'Hello',
    body: '<p>Hello <strong>world</strong></p>',
    tags: ['one', 'two'],
    date: '2024-01-02T03:04:05.000Z',
    media: [],
    ...overrides,
  }
}

// ─── Timestamps ─────────────────────────────────────────────────────────────

describe('parseExportTimestamp', () => {
  it('parses export timestamps as UTC', () => {
    const cases: Array<[string, string]> = [
      ['October 30th, 2024 7:03am', '2024-10-30T07:03:00.000Z'],
      ['January 1st, 2025 12:00am', '2025-01-01T00:00:00.000Z'],
      ['July 4th, 2026 12:05pm', '2026-07-04T12:05:00.000Z'],
      ['December 31st, 2024 11:59pm', '2024-12-31T23:59:00.000Z'],
      ['March 3rd, 2025 1:07PM', '2025-03-03T13:07:00.000Z'],
    ]
    for (const [input, expected] of cases) {
      assert.equal(parseExportTimestamp(input), expected, input)
    }
  })

  it('rejects malformed and impossible timestamps', () => {
    for (const input of [
      '',
      'yesterday',
      'Smarch 1st, 2024 1:00am',
      'February 31st, 2024 1:00am',
      'October 32nd, 2024 1:00am',
      'October 30th, 2024 25:00pm',
      'October 30th, 2024 1:70am',
    ]) {
      assert.equal(parseExportTimestamp(input), undefined, input)
    }
  })
})

// ─── Sanitisation ───────────────────────────────────────────────────────────

describe('sanitizeHtml', () => {
  it('allows known formatting elements and escapes text', () => {
    assert.equal(
      sanitizeHtml('<p>kleines <b>fett</b> und <em>kursiv</em></p>'),
      '<p>kleines <b>fett</b> und <em>kursiv</em></p>',
    )
    assert.equal(sanitizeHtml('<p>5 &lt; 6 &amp; 7</p>'), '<p>5 &lt; 6 &amp; 7</p>')
    assert.equal(sanitizeHtml('<p>a<br>b</p>'), '<p>a<br />b</p>')
  })

  it('drops script and style source entirely', () => {
    assert.equal(
      sanitizeHtml('<script>alert("x")</script><style>p{color:red}</style><p>ok</p>'),
      '<p>ok</p>',
    )
  })

  it('strips disallowed attributes while keeping the element', () => {
    assert.equal(sanitizeHtml('<p onclick="alert(1)" class="x">hi</p>'), '<p>hi</p>')
    assert.equal(
      sanitizeHtml('<img src="pic.png" onerror="alert(1)" data-foo="1">'),
      '<img src="pic.png" />',
    )
    assert.equal(
      sanitizeHtml('<a href="https://example.com" target="_blank" rel="nofollow">x</a>'),
      '<a href="https://example.com">x</a>',
    )
  })

  it('refuses dangerous URL schemes', () => {
    assert.equal(sanitizeHtml('<a href="javascript:alert(1)">x</a>'), '<a>x</a>')
    assert.equal(sanitizeHtml('<a href=" JaVaScRiPt:alert(1)">x</a>'), '<a>x</a>')
    assert.equal(sanitizeHtml('<img src="data:image/png;base64,AAAA">'), '<img />')
    assert.equal(
      sanitizeHtml('<a href="vbscript:msgbox(1)">x</a>'),
      '<a>x</a>',
    )
  })

  it('unwraps unknown elements but preserves their text', () => {
    assert.equal(sanitizeHtml('<article><p>x</p></article>'), '<p>x</p>')
    assert.equal(sanitizeHtml('<marquee>look</marquee>'), 'look')
  })

  it('keeps multiple top-level nodes from a fragment', () => {
    assert.equal(
      sanitizeHtml('<p>one</p><p>two</p><p>three</p>'),
      '<p>one</p><p>two</p><p>three</p>',
    )
  })
})

describe('htmlToText', () => {
  it('collapses block content into readable text', () => {
    assert.equal(htmlToText('<p>Hello</p><p>World</p>'), 'Hello World')
    assert.equal(htmlToText('<h1>Title</h1><p>Body</p>'), 'Title Body')
    assert.equal(htmlToText('<p>  spaced   out  </p>'), 'spaced out')
  })

  it('ignores script and style content and decodes entities', () => {
    assert.equal(
      htmlToText('<style>p{color:red}</style><script>alert(1)</script><p>a &amp; b</p>'),
      'a & b',
    )
  })

  it('returns an empty string for empty input', () => {
    assert.equal(htmlToText(''), '')
  })
})

describe('htmlToMarkdown', () => {
  it('converts headings, emphasis and paragraphs', () => {
    assert.equal(
      htmlToMarkdown('<h2>Title</h2><p>Hello <strong>world</strong></p>'),
      '## Title\n\nHello **world**',
    )
    assert.equal(htmlToMarkdown('<p>1 <em>em</em> <code>c</code></p>'), '1 *em* `c`')
  })

  it('converts lists', () => {
    assert.equal(htmlToMarkdown('<ul><li>a</li><li>b</li></ul>'), '- a\n- b')
    assert.equal(htmlToMarkdown('<ol><li>one</li><li>two</li></ol>'), '1. one\n2. two')
  })

  it('converts blockquotes without trailing empty quote lines', () => {
    assert.equal(htmlToMarkdown('<blockquote><p>Quoted</p></blockquote>'), '> Quoted')
  })

  it('converts links and images', () => {
    assert.equal(
      htmlToMarkdown('<p>see <a href="https://example.com">this</a></p>'),
      'see [this](https://example.com)',
    )
    assert.equal(
      htmlToMarkdown('<p>x</p><img src="pic.png" alt="alt text">'),
      'x\n\n![alt text](pic.png)',
    )
  })

  it('converts line breaks and preformatted text', () => {
    assert.equal(htmlToMarkdown('<p>a<br>b</p>'), 'a\nb')
    assert.equal(htmlToMarkdown('<pre>line one\nline two</pre>'), '```\nline one\nline two\n```')
  })

  it('does not emit dangerous links or images', () => {
    assert.equal(htmlToMarkdown('<p><a href="javascript:alert(1)">click</a></p>'), 'click')
    assert.equal(htmlToMarkdown('<p><img src="javascript:alert(1)" alt="pic"></p>'), 'pic')
  })

  it('drops script and style content', () => {
    assert.equal(htmlToMarkdown('<script>alert(1)</script><p>ok</p>'), 'ok')
  })
})

// ─── Conversion ─────────────────────────────────────────────────────────────

describe('convertArchive', () => {
  it('produces a site.standard.document with markdown content', () => {
    const result = convertArchive([makePost()], { site: 'https://blog.example' })
    assert.equal(result.skipped, 0)
    assert.deepEqual(result.errors, [])
    assert.equal(result.documents.length, 1)

    const doc = result.documents[0]
    assert.equal(doc.$type, 'site.standard.document')
    assert.equal(doc.site, 'https://blog.example')
    assert.equal(doc.title, 'Hello')
    assert.equal(doc.publishedAt, '2024-01-02T03:04:05.000Z')
    assert.equal(doc.path, '/posts/post/1000')
    assert.equal(doc.textContent, 'Hello world')
    assert.deepEqual(doc.content, {
      $type: 'site.standard.content.markdown',
      text: 'Hello **world**',
      version: '1.0',
    })
    assert.deepEqual(doc.tags, ['one', 'two'])
    assert.equal(doc.description, undefined)
  })

  it('falls back to the summary when there is no body', () => {
    const post = makePost({ body: undefined, title: undefined, summary: 'Plain summary' })
    const [doc] = convertArchive([post], { site: 'https://blog.example' }).documents
    assert.equal(doc.content?.text, 'Plain summary')
    assert.equal(doc.textContent, 'Plain summary')
    assert.equal(doc.description, 'Plain summary')
  })

  it('records the original Tumblr URL as provenance', () => {
    const post = makePost({
      summary: 'Excerpt',
      postUrl: 'https://myblog.tumblr.com/post/1000/hello',
    })
    const [doc] = convertArchive([post], { site: 'https://blog.example' }).documents
    assert.equal(
      doc.description,
      'Excerpt — Originally posted on Tumblr: https://myblog.tumblr.com/post/1000/hello',
    )
  })

  it('uses the slug for the path when present', () => {
    const post = makePost({ slug: 'hello-world' })
    const [doc] = convertArchive([post], { site: 'https://blog.example' }).documents
    assert.equal(doc.path, '/posts/hello-world')
  })

  it('honours a custom path prefix with or without a trailing slash', () => {
    for (const pathPrefix of ['/blog/', '/blog']) {
      const [doc] = convertArchive([makePost()], {
        site: 'https://blog.example',
        pathPrefix,
      }).documents
      assert.equal(doc.path, '/blog/post/1000', pathPrefix)
    }
  })

  it('disambiguates duplicate paths', () => {
    const first = makePost({ id: '111111', slug: 'dup' })
    const second = makePost({ id: '222222', slug: 'dup' })
    const result = convertArchive([first, second], { site: 'https://blog.example' })
    assert.deepEqual(
      result.documents.map((doc) => doc.path),
      ['/posts/dup', '/posts/dup-222222'],
    )
    assert.equal(result.warnings.length, 1)
    assert.match(result.warnings[0], /Duplicate path/)
  })

  it('skips private and draft posts unless asked to include them', () => {
    const posts = [
      makePost({ id: '1' }),
      makePost({ id: '2', isPrivate: true }),
      makePost({ id: '3', isDraft: true }),
    ]
    const hidden = convertArchive(posts, { site: 'https://blog.example' })
    assert.equal(hidden.documents.length, 1)
    assert.equal(hidden.skipped, 2)

    const included = convertArchive(posts, {
      site: 'https://blog.example',
      includePrivate: true,
    })
    assert.equal(included.documents.length, 3)
    assert.equal(included.skipped, 0)
  })

  it('reports a conversion error per post when the site URL is invalid', () => {
    const result = convertArchive([makePost()], { site: 'not a url' })
    assert.equal(result.documents.length, 0)
    assert.equal(result.skipped, 1)
    assert.equal(result.errors.length, 1)
    assert.equal(result.errors[0].postId, '1000')
    assert.equal(result.errors[0].type, 'convert')
    assert.match(result.errors[0].message, /invalid site URL/)
  })

  it('falls back to the post URL or id for a missing title', () => {
    const byUrl = makePost({ title: undefined, postUrl: 'https://a.tumblr.com/post/1' })
    const byId = makePost({ id: '999', title: undefined })
    const result = convertArchive([byUrl, byId], { site: 'https://blog.example' })
    assert.equal(result.documents[0].title, 'https://a.tumblr.com/post/1')
    assert.equal(result.documents[1].title, 'Tumblr post 999')
  })
})

describe('validateDocument', () => {
  const base = (overrides: Partial<StandardDocumentValue> = {}): StandardDocumentValue => ({
    $type: 'site.standard.document',
    site: 'https://blog.example',
    title: 'Title',
    publishedAt: '2024-01-02T03:04:05.000Z',
    ...overrides,
  })

  it('accepts a well-formed document', () => {
    assert.doesNotThrow(() => validateDocument(base(), '1'))
  })

  it('accepts a publication AT URI as the site', () => {
    assert.doesNotThrow(() =>
      validateDocument(
        base({ site: 'at://did:plc:abc123/site.standard.publication/3abc' }),
        '1',
      ),
    )
    assert.throws(
      () => validateDocument(base({ site: 'at://did:plc:abc123/site.standard.document/3abc' }), '1'),
      /not a site\.standard\.publication AT URI/,
    )
  })

  it('rejects missing or malformed required fields', () => {
    assert.throws(() => validateDocument(base({ site: '' }), '1'), /missing site/)
    assert.throws(() => validateDocument(base({ site: 'nope' }), '1'), /invalid site URL/)
    assert.throws(() => validateDocument(base({ title: '  ' }), '1'), /empty title/)
    assert.throws(
      () => validateDocument(base({ publishedAt: '' }), '1'),
      /missing publishedAt/,
    )
    assert.throws(
      () => validateDocument(base({ publishedAt: 'not a date' }), '1'),
      /invalid publishedAt/,
    )
  })

  it('rejects malformed tags and content', () => {
    assert.throws(
      () =>
        validateDocument(
          base({ tags: ['ok', 3 as unknown as string] }),
          '1',
        ),
      /tags must be an array of strings/,
    )
    assert.throws(
      () =>
        validateDocument(
          base({
            content: {
              $type: 'site.standard.content.html' as 'site.standard.content.markdown',
              text: '<p>x</p>',
              version: '1.0',
            },
          }),
          '1',
        ),
      /unsupported content type/,
    )
  })
})

describe('validateSite', () => {
  it('accepts valid URLs and rejects invalid ones', () => {
    assert.doesNotThrow(() => validateSite('https://blog.example'))
    assert.throws(() => validateSite(''), /site is required/)
    assert.throws(() => validateSite('blog.example'), /Invalid site URL/)
  })

  it('accepts a publication AT URI and rejects other collections', () => {
    assert.doesNotThrow(() =>
      validateSite('at://did:plc:abc123/site.standard.publication/3abc'),
    )
    assert.throws(
      () => validateSite('at://did:plc:abc123/site.standard.document/3abc'),
      /Invalid publication AT URI/,
    )
    assert.throws(() => validateSite('at://not-a-did/site.standard.publication/x'), /Invalid/)
  })
})

// ─── AT URIs ────────────────────────────────────────────────────────────────

describe('AT URI helpers', () => {
  it('parses publication AT URIs', () => {
    assert.deepEqual(
      parseAtUri('at://did:plc:abc123/site.standard.publication/3lwafzkjqm25s'),
      {
        did: 'did:plc:abc123',
        collection: 'site.standard.publication',
        rkey: '3lwafzkjqm25s',
      },
    )
    assert.equal(isAtUri('at://did:plc:abc123/site.standard.publication/x'), true)
    assert.equal(
      isPublicationAtUri('at://did:plc:abc123/site.standard.publication/x'),
      true,
    )
    assert.equal(isPublicationAtUri('at://did:plc:abc123/site.standard.document/x'), false)
  })

  it('rejects malformed AT URIs', () => {
    for (const uri of [
      '',
      'https://blog.example',
      'at://did:plc:abc123',
      'at://did:plc:abc123/site.standard.publication',
      'at://did:plc:abc123/site.standard.publication/a/b',
      'at:///site.standard.publication/x',
      'at://did:plc:abc123/site.standard.publication/',
    ]) {
      assert.equal(parseAtUri(uri), undefined, uri)
    }
  })
})

// ─── Publication helpers ────────────────────────────────────────────────────

describe('publication helpers', () => {
  it('normalises URLs and removes trailing slashes, query and fragment', () => {
    assert.equal(normalizePublicationUrl('https://blog.example/'), 'https://blog.example')
    assert.equal(normalizePublicationUrl('https://blog.example/blog/'), 'https://blog.example/blog')
    assert.equal(
      normalizePublicationUrl('https://blog.example/blog/?x=1#top'),
      'https://blog.example/blog',
    )
    assert.throws(() => normalizePublicationUrl('blog.example'), /Invalid publication URL/)
    assert.throws(() => normalizePublicationUrl('ftp://blog.example'), /must use http/)
  })

  it('builds well-known paths at the root and below a path', () => {
    assert.equal(
      publicationWellKnownPath('https://blog.example/'),
      '/.well-known/site.standard.publication',
    )
    assert.equal(
      publicationWellKnownPath('https://blog.example/blog/'),
      '/.well-known/site.standard.publication/blog',
    )
    assert.equal(
      publicationWellKnownBody('at://did:plc:abc123/site.standard.publication/x'),
      'at://did:plc:abc123/site.standard.publication/x\n',
    )
  })

  it('builds a publication record value with normalised required fields', () => {
    assert.deepEqual(
      buildPublicationValue({
        url: 'https://blog.example/',
        name: '  My archive  ',
        description: ' Posts from Tumblr ',
      }),
      {
        $type: 'site.standard.publication',
        url: 'https://blog.example',
        name: 'My archive',
        description: 'Posts from Tumblr',
      },
    )
  })

  it('rejects a missing name and preserves optional fields', () => {
    assert.throws(() => buildPublicationValue({ url: 'https://x.example', name: ' ' }), /name is required/)

    const icon = { $type: 'blob' as const, ref: { $link: 'bafy' }, mimeType: 'image/png', size: 3 }
    const value = buildPublicationValue({
      url: 'https://x.example',
      name: 'X',
      icon,
      preferences: { showInDiscover: true },
    })
    assert.deepEqual(value.icon, icon)
    assert.deepEqual(value.preferences, { showInDiscover: true })
  })
})

// ─── Document record keys (idempotency) ─────────────────────────────────────

describe('documentRecordKey', () => {
  const doc = (overrides: Partial<StandardDocumentValue> = {}): StandardDocumentValue => ({
    $type: 'site.standard.document',
    site: 'https://blog.example',
    title: 'Title',
    publishedAt: '2024-01-02T03:04:05.000Z',
    path: '/posts/post/1000',
    ...overrides,
  })

  it('is deterministic for the same document', () => {
    assert.equal(documentRecordKey(doc()), documentRecordKey(doc()))
  })

  it('produces a valid record key', () => {
    const key = documentRecordKey(doc())
    assert.equal(key.length, 13)
    assert.match(key, /^[234567abcdefghijklmnopqrstuvwxyz]{13}$/)
    assert.notEqual(key, '.')
    assert.notEqual(key, '..')
  })

  it('changes when the path changes', () => {
    assert.notEqual(
      documentRecordKey(doc({ path: '/posts/post/1000' })),
      documentRecordKey(doc({ path: '/posts/post/1001' })),
    )
  })

  it('ignores mutable fields when a path is present', () => {
    assert.equal(
      documentRecordKey(doc()),
      documentRecordKey(
        doc({
          title: 'Updated title',
          content: { $type: 'site.standard.content.markdown', text: 'new body', version: '1.0' },
        }),
      ),
    )
  })

  it('falls back to publishedAt and title without a path', () => {
    const withoutPath = doc({ path: undefined })
    assert.equal(documentRecordKey(withoutPath), documentRecordKey(doc({ path: undefined })))
    assert.notEqual(
      documentRecordKey(withoutPath),
      documentRecordKey(doc({ path: undefined, title: 'Another title' })),
    )
  })

  it('ignores surrounding whitespace in a path', () => {
    assert.equal(
      documentRecordKey(doc({ path: '  /posts/post/1000  ' })),
      documentRecordKey(doc()),
    )
  })
})

// ─── Media upload ───────────────────────────────────────────────────────────

describe('media upload', () => {
  function fakeUploader(): { uploader: BlobUploader; uploads: Array<{ bytes: number; mime: string }> } {
    const uploads: Array<{ bytes: number; mime: string }> = []
    const uploader: BlobUploader = {
      async uploadBlob(data, mimeType) {
        uploads.push({ bytes: data.byteLength, mime: mimeType })
        return {
          $type: 'blob',
          ref: { $link: `cid-${uploads.length}` },
          mimeType,
          size: data.byteLength,
        }
      },
      getBlobUrl(cid) {
        return `https://pds.example/xrpc/com.atproto.sync.getBlob?cid=${cid}`
      },
    }
    return { uploader, uploads }
  }

  it('reads media from an extracted directory', async () => {
    const root = await makeTree({ 'media/a.png': new Uint8Array([1, 2, 3]) })
    const media = await openMediaArchive(root)
    try {
      assert.deepEqual(Array.from((await media.read('media/a.png')) ?? []), [1, 2, 3])
      assert.equal(await media.read('media/missing.png'), undefined)
      assert.equal(await media.read('../../media/a.png'), undefined)
    } finally {
      await media.close()
    }
  })

  it('reads media from a ZIP and rejects unsafe entries', async () => {
    const archive = await makeZip({ 'media/a.png': new Uint8Array([4, 5]) })
    const media = await openMediaArchive(archive)
    try {
      assert.deepEqual(Array.from((await media.read('media/a.png')) ?? []), [4, 5])
    } finally {
      await media.close()
    }

    const unsafe = await makeZip({ '../evil.png': new Uint8Array([1]) })
    await assert.rejects(openMediaArchive(unsafe), /Unsafe archive entry path/)
  })

  it('uploads each referenced local file once and skips missing ones', async () => {
    const root = await makeTree({
      'media/a.png': new Uint8Array([1, 2, 3]),
      'media/b.jpg': new Uint8Array([4, 5, 6, 7]),
    })
    const posts: TumblrPost[] = [
      makePost({
        id: '1',
        media: [
          { type: 'photo', url: '../../media/a.png', localPath: 'media/a.png', mimeType: 'image/png' },
          { type: 'photo', url: '../../media/missing.png', localPath: 'media/missing.png' },
        ],
      }),
      makePost({
        id: '2',
        media: [
          { type: 'photo', url: '../../media/a.png', localPath: 'media/a.png' },
          { type: 'photo', url: '../../media/b.jpg', localPath: 'media/b.jpg' },
        ],
      }),
    ]

    const { uploader, uploads } = fakeUploader()
    const warnings: string[] = []
    const result = await uploadArchiveMedia(uploader, root, posts, {
      onLog: (level, msg) => {
        if (level === 'warn') warnings.push(msg)
      },
    })

    assert.equal(result.uploaded, 2)
    assert.equal(result.failed, 1)
    assert.equal(result.bytes, 7)
    assert.equal(uploads.length, 2)
    assert.deepEqual(uploads.map((u) => u.mime), ['image/png', 'image/jpeg'])
    assert.equal(result.urlByPath.get('media/a.png'), 'https://pds.example/xrpc/com.atproto.sync.getBlob?cid=cid-1')
    assert.equal(result.urlByPath.get('media/b.jpg'), 'https://pds.example/xrpc/com.atproto.sync.getBlob?cid=cid-2')
    assert.match(warnings.join('\n'), /missing from archive: media\/missing\.png/)
  })

  it('skips files above the configured blob limit', async () => {
    const root = await makeTree({ 'media/big.png': new Uint8Array([1, 2, 3]) })
    const posts = [
      makePost({ media: [{ type: 'photo', url: '../../media/big.png', localPath: 'media/big.png' }] }),
    ]
    const { uploader } = fakeUploader()
    const warnings: string[] = []
    const result = await uploadArchiveMedia(uploader, root, posts, {
      maxBytes: 2,
      onLog: (level, msg) => {
        if (level === 'warn') warnings.push(msg)
      },
    })

    assert.equal(result.uploaded, 0)
    assert.equal(result.skipped, 1)
    assert.match(warnings.join('\n'), /exceeds the 2-byte blob limit/)
  })

  it('rewrites relative media references but leaves remote URLs alone', () => {
    const url = 'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did:plc:x&cid=bafy'
    const html = [
      '<p><img src="../../media/a.png" alt="a"></p>',
      '<video src="../../media/clip.mp4"></video>',
      '<img src="https://64.media.tumblr.com/pic.jpg">',
      '<a href="../../media/a.png">download</a>',
    ].join('')
    const output = rewriteMediaReferences(
      html,
      new Map([
        ['media/a.png', url],
        ['media/clip.mp4', 'https://pds.example/clip'],
      ]),
    )

    assert.match(output, new RegExp(`src="${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`))
    assert.match(output, /src="https:\/\/pds\.example\/clip"/)
    assert.match(output, /https:\/\/64\.media\.tumblr\.com\/pic\.jpg/)
    assert.match(output, new RegExp(`href="${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`))
  })
})

// ─── Layout detection ───────────────────────────────────────────────────────

describe('detectLayout', () => {
  it('detects the per-post HTML directory layout', async () => {
    const root = await makeTree({
      'posts/html/200.html': cover('<p>hi</p>'),
      'media/200_0.png': new Uint8Array([1, 2, 3]),
    })
    const detection = await detectLayout(root)
    assert.equal(detection.layout, 'posts-html')
    assert.equal(detection.hasPostsHtml, true)
    assert.equal(detection.hasPostsXml, false)
    assert.equal(detection.hasMedia, true)
    assert.equal(detection.hasNestedPostsZip, false)
  })

  it('detects the older posts.xml layout', async () => {
    const root = await makeTree({
      'posts/posts.xml': '<posts><post id="1" type="regular"><regular-body>x</regular-body></post></posts>',
    })
    const detection = await detectLayout(root)
    assert.equal(detection.layout, 'posts-xml')
    assert.equal(detection.hasPostsXml, true)
  })

  it('detects an extracted directory that still contains posts.zip', async () => {
    const inner = await zipBytes({ 'html/1.html': cover('<p>x</p>') })
    const root = await makeTree({ 'posts.zip': inner })
    const detection = await detectLayout(root)
    assert.equal(detection.hasNestedPostsZip, true)
    assert.equal(detection.layout, 'posts-html')
  })

  it('reports an unknown layout for unrelated archives', async () => {
    const root = await makeTree({ 'readme.txt': 'nothing here' })
    const detection = await detectLayout(root)
    assert.equal(detection.layout, 'unknown')
  })

  it('rejects missing inputs and non-zip files', async () => {
    await assert.rejects(
      detectLayout(join(tmpdir(), 'rock-tumbl-does-not-exist')),
      /Input not found/,
    )
    const root = await makeTree({ 'export.txt': 'x' })
    await assert.rejects(detectLayout(join(root, 'export.txt')), /not a \.zip file/)
  })
})

// ─── Archive parsing: directories ───────────────────────────────────────────

describe('parseArchive (directory, HTML covers)', () => {
  it('parses titles, tags, timestamps, media and blog name', async () => {
    const root = await makeTree({
      'posts/html/200.html': cover(
        '<p>Hello <a href="https://example.com">link</a></p>' +
          '<img src="../../media/200_0.png" alt="alt text" data-orig-width="640" data-orig-height="480">',
        { title: 'A post title', tags: ['alpha', 'beta'], timestamp: 'October 30th, 2024 7:03am' },
      ),
      'media/200_0.png': new Uint8Array([1, 2, 3]),
      'comments.csv': [
        'post_blog,post_id,reply_id,date,content',
        'greenwerewolf745,200,201,2025-01-01T00:00:00Z,"a reply, with a comma"',
        'someone-else,999,998,2025-01-01T00:00:00Z,nope',
      ].join('\n'),
    })

    const archive = await parseArchive(root)
    assert.equal(archive.layout, 'posts-html')
    assert.equal(archive.blogName, 'greenwerewolf745')
    assert.deepEqual(archive.warnings, [])
    assert.equal(archive.posts.length, 1)

    const post = archive.posts[0]
    assert.equal(post.id, '200')
    assert.equal(post.title, 'A post title')
    assert.equal(post.date, '2024-10-30T07:03:00.000Z')
    assert.deepEqual(post.tags, ['alpha', 'beta'])
    assert.equal(post.blogName, 'greenwerewolf745')
    assert.equal(post.blogUrl, 'https://greenwerewolf745.tumblr.com')
    assert.equal(post.type, 'photo')
    assert.match(post.body ?? '', /<a href="https:\/\/example.com">link<\/a>/)
    assert.match(post.body ?? '', /<img src="..\/..\/media\/200_0.png"/)

    assert.deepEqual(post.media, [
      {
        type: 'photo',
        url: '../../media/200_0.png',
        localPath: 'media/200_0.png',
        altText: 'alt text',
        mimeType: 'image/png',
        width: 640,
        height: 480,
      },
    ])
  })

  it('strips the export footer, timestamp and empty placeholder heading from the body', async () => {
    const root = await makeTree({
      'posts/html/300.html': cover('<p>Body copy</p>', { tags: ['tagged'] }),
    })
    const [post] = (await parseArchive(root)).posts
    assert.doesNotMatch(post.body ?? '', /footer/)
    assert.doesNotMatch(post.body ?? '', /timestamp/)
    assert.doesNotMatch(post.body ?? '', /<h1>/)
    assert.equal(post.body, '<p>Body copy</p>')
    assert.equal(post.title, 'Body copy')
    assert.deepEqual(post.tags, ['tagged'])
  })

  it('derives a truncated title from the first line when no heading exists', async () => {
    const longLine = 'word '.repeat(40).trim()
    const root = await makeTree({
      'posts/html/301.html': cover(`<p>${longLine}</p>`),
    })
    const [post] = (await parseArchive(root)).posts
    assert.ok(post.title)
    assert.ok(post.title.length <= 81, post.title)
    assert.ok(post.title.endsWith('…'))
  })

  it('records a warning for unreadable timestamps', async () => {
    const root = await makeTree({
      'posts/html/400.html': cover('<p>x</p>', { timestamp: 'sometime last year' }),
    })
    const archive = await parseArchive(root)
    assert.equal(archive.posts.length, 1)
    assert.match(archive.warnings.join('\n'), /Post 400: unreadable export timestamp/)
    assert.ok(!Number.isNaN(Date.parse(archive.posts[0].date)))
  })

  it('sorts posts chronologically', async () => {
    const root = await makeTree({
      'posts/html/1.html': cover('<p>later</p>', { timestamp: 'November 2nd, 2024 9:00am' }),
      'posts/html/2.html': cover('<p>earlier</p>', { timestamp: 'October 1st, 2024 9:00am' }),
      'posts/html/3.html': cover('<p>middle</p>', { timestamp: 'October 15th, 2024 9:00am' }),
    })
    const archive = await parseArchive(root)
    assert.deepEqual(
      archive.posts.map((post) => post.body),
      ['<p>earlier</p>', '<p>middle</p>', '<p>later</p>'],
    )
  })

  it('extracts video and embedded-player media', async () => {
    const root = await makeTree({
      'posts/html/500.html': cover(
        '<video src="../../media/clip.mp4"></video>' +
          '<figure class="tmblr-embed" data-provider="youtube" data-url="https://youtu.be/abc"></figure>' +
          '<img src="https://64.media.tumblr.com/pic.jpg">',
      ),
      'media/clip.mp4': new Uint8Array([0]),
    })
    const [post] = (await parseArchive(root)).posts
    assert.deepEqual(
      post.media.map((item) => [item.type, item.url, item.localPath, item.mimeType]),
      [
        ['photo', 'https://64.media.tumblr.com/pic.jpg', undefined, 'image/jpeg'],
        ['video', '../../media/clip.mp4', 'media/clip.mp4', 'video/mp4'],
        ['video', 'https://youtu.be/abc', undefined, undefined],
      ],
    )
  })
})

describe('parseArchive (directory, posts.xml)', () => {
  const postsXml = `<?xml version="1.0" encoding="UTF-8"?>
<posts>
  <post id="100" url="https://myblog.tumblr.com/post/100/hello" type="regular" date="2020-01-02 03:04:05 GMT" slug="hello" state="published">
    <regular-title>Hello</regular-title>
    <regular-body>&lt;p&gt;First &lt;b&gt;post&lt;/b&gt;&lt;/p&gt;</regular-body>
    <tag>alpha</tag>
    <tag>beta</tag>
  </post>
  <post id="101" url="https://myblog.tumblr.com/post/101/photo" type="photo" date="2020-01-03 00:00:00 GMT" state="published">
    <photo-caption>Nice pic</photo-caption>
    <photo-url-1280>https://media.tumblr.com/x.jpg</photo-url-1280>
  </post>
  <post id="102" url="https://myblog.tumblr.com/post/102/draft" type="regular" date="2020-01-04 00:00:00 GMT" state="draft">
    <regular-body>draft body</regular-body>
  </post>
  <post id="103" url="https://myblog.tumblr.com/post/103/private" type="regular" date="2020-01-05 00:00:00 GMT" private="yes">
    <regular-body>private body</regular-body>
  </post>
</posts>`

  it('parses posts, tags, dates, media and filters private/draft posts', async () => {
    const root = await makeTree({ 'posts/posts.xml': postsXml })
    const archive = await parseArchive(root)
    assert.equal(archive.layout, 'posts-xml')
    assert.equal(archive.blogName, 'myblog')
    assert.deepEqual(archive.warnings, [])
    assert.deepEqual(
      archive.posts.map((post) => post.id),
      ['100', '101'],
    )

    const [text, photo] = archive.posts
    assert.equal(text.type, 'text')
    assert.equal(text.title, 'Hello')
    assert.equal(text.postUrl, 'https://myblog.tumblr.com/post/100/hello')
    assert.equal(text.slug, 'hello')
    assert.equal(text.date, '2020-01-02T03:04:05.000Z')
    assert.deepEqual(text.tags, ['alpha', 'beta'])
    assert.equal(text.body, '<p>First <b>post</b></p>')

    assert.equal(photo.type, 'photo')
    assert.equal(photo.title, 'Nice pic')
    assert.deepEqual(photo.media, [
      { type: 'photo', url: 'https://media.tumblr.com/x.jpg', altText: 'Nice pic' },
    ])
  })

  it('includes private and draft posts on request', async () => {
    const root = await makeTree({ 'posts/posts.xml': postsXml })
    const archive = await parseArchive(root, { includePrivate: true })
    assert.deepEqual(
      archive.posts.map((post) => post.id),
      ['100', '101', '102', '103'],
    )
  })

  it('merges per-post HTML bodies into posts.xml entries', async () => {
    const root = await makeTree({
      'posts/posts.xml': postsXml,
      'posts/html/100.html': cover('<p>From the HTML cover</p>', { tags: ['from-html'] }),
    })
    const archive = await parseArchive(root)
    const text = archive.posts.find((post) => post.id === '100')
    assert.ok(text)
    assert.equal(text.body, cover('<p>From the HTML cover</p>', { tags: ['from-html'] }))
    // posts.xml already supplied tags, so those win over the HTML footer.
    assert.deepEqual(text.tags, ['alpha', 'beta'])
  })

  it('falls back to HTML covers when posts.xml is malformed', async () => {
    const root = await makeTree({
      'posts/posts.xml': '<notposts><post></post></notposts>',
      'posts/html/600.html': cover('<p>still here</p>'),
    })
    const archive = await parseArchive(root)
    assert.equal(archive.posts.length, 1)
    assert.equal(archive.posts[0].id, '600')
    assert.match(archive.warnings.join('\n'), /Could not parse posts\/posts\.xml/)
  })

  it('accepts posts.xml without per-post HTML', async () => {
    const root = await makeTree({ 'posts/posts.xml': postsXml })
    const archive = await parseArchive(root)
    assert.equal(archive.posts[0].body, '<p>First <b>post</b></p>')
  })
})

// ─── Archive parsing: ZIPs ──────────────────────────────────────────────────

describe('parseArchive (ZIP)', () => {
  it('reads the current ZIP-of-a-ZIP export, including leading-slash entries', async () => {
    const inner = await zipBytes({
      '/posts_index.html': '<html><body>index</body></html>',
      '/style.css': 'body { color: black; }',
      '/html/700.html': cover('<p>Nested post</p>', {
        tags: ['nested'],
        timestamp: 'March 1st, 2025 5:30pm',
      }),
    })

    const outer = await makeZip({
      'posts.zip': inner,
      'media/700_0.png': new Uint8Array([9, 9, 9]),
      'comments.csv': 'post_blog,post_id,reply_id,date,content\ngreenwerewolf745,700,701,2025-03-01T00:00:00Z,hi',
      'conversations.zip': await zipBytes({ 'conversations/convo_1.html': '<html></html>' }),
    })

    const detection = await detectLayout(outer)
    assert.equal(detection.layout, 'posts-html')
    assert.equal(detection.hasNestedPostsZip, true)
    assert.equal(detection.hasMedia, true)

    const archive = await parseArchive(outer)
    assert.equal(archive.blogName, 'greenwerewolf745')
    assert.equal(archive.posts.length, 1)
    const [post] = archive.posts
    assert.equal(post.id, '700')
    assert.equal(post.date, '2025-03-01T17:30:00.000Z')
    assert.deepEqual(post.tags, ['nested'])
    assert.equal(post.body, '<p>Nested post</p>')
  })

  it('reads a ZIP with posts/html directly', async () => {
    const archiveZip = await makeZip({
      'posts/html/800.html': cover('<p>Direct</p>'),
      'media/800_0.png': new Uint8Array([1]),
    })
    const archive = await parseArchive(archiveZip)
    assert.equal(archive.layout, 'posts-html')
    assert.equal(archive.posts.length, 1)
    assert.equal(archive.posts[0].id, '800')
  })

  it('reads a ZIP containing posts.xml', async () => {
    const archiveZip = await makeZip({
      'posts/posts.xml':
        '<posts><post id="1" type="regular" date="2020-01-01 00:00:00 GMT" url="https://b.tumblr.com/post/1"><regular-body>hey</regular-body></post></posts>',
    })
    const archive = await parseArchive(archiveZip)
    assert.equal(archive.layout, 'posts-xml')
    assert.equal(archive.posts.length, 1)
    assert.equal(archive.posts[0].blogName, 'b')
  })

  it('rejects unsafe entry paths', async () => {
    const archiveZip = await makeZip({
      'posts/html/1.html': cover('<p>x</p>'),
      '../evil.txt': 'escaped',
    })
    await assert.rejects(detectLayout(archiveZip), /Unsafe archive entry path/)
    await assert.rejects(parseArchive(archiveZip), /Unsafe archive entry path/)
  })

  it('rejects unrecognised archives', async () => {
    const archiveZip = await makeZip({ 'readme.txt': 'nothing here' })
    assert.equal((await detectLayout(archiveZip)).layout, 'unknown')
    await assert.rejects(parseArchive(archiveZip), /Unrecognised Tumblr export layout/)
  })

  it('rejects archives that contain no post sources', async () => {
    const archiveZip = await makeZip({
      'posts.zip': await zipBytes({ 'style.css': 'x' }),
      'media/a.png': new Uint8Array([1]),
    })
    await assert.rejects(parseArchive(archiveZip), /no post HTML or posts\.xml/)
  })

  it('refuses archives nested too deeply', async () => {
    let inner = await zipBytes({ 'html/1.html': cover('<p>x</p>') })
    for (let i = 0; i < 3; i++) {
      inner = await zipBytes({ 'posts.zip': inner })
    }
    const archiveZip = await makeZip({ 'posts.zip': inner })
    await assert.rejects(parseArchive(archiveZip), /nested deeper than/)
  })
})

// ─── End to end ─────────────────────────────────────────────────────────────

describe('end to end', () => {
  it('converts a parsed archive into publishable documents', async () => {
    const inner = await zipBytes({
      'html/900.html': cover('<p>Hello <strong>there</strong></p>', {
        tags: ['alpha'],
        timestamp: 'October 30th, 2024 7:03am',
      }),
    })
    const archiveZip = await makeZip({
      'posts.zip': inner,
      'comments.csv': 'post_blog,post_id,reply_id,date,content\nmyblog,900,901,2024-10-30T00:00:00Z,hi',
    })

    const archive = await parseArchive(archiveZip)
    const result = convertArchive(archive.posts, { site: 'https://blog.example' })

    assert.equal(result.errors.length, 0)
    assert.equal(result.documents.length, 1)
    const [doc] = result.documents
    assert.equal(doc.path, '/posts/post/900')
    assert.equal(doc.publishedAt, '2024-10-30T07:03:00.000Z')
    assert.equal(doc.title, 'Hello there')
    assert.equal(doc.content?.text, 'Hello **there**')
    assert.deepEqual(doc.tags, ['alpha'])
  })
})
