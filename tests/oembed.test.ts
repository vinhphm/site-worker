import { expect, test } from 'bun:test'
import { findProvider, sameSiteOrigin } from '../src/providers'
import { embedDocument } from '../src/embed-document'
import oembed from '../src/oembed'

const providers: OEmbedProvider[] = [
  {
    provider_name: 'Fixture',
    provider_url: 'https://provider.example/',
    endpoints: [
      {
        url: 'https://provider.example/oembed',
        schemes: [
          'https://*.provider.example/post/*',
          'https://provider.example/post/*',
        ],
      },
    ],
  },
]

test('provider patterns only wildcard explicitly and validate the hostname separately', () => {
  expect(findProvider('https://provider.example/post/1', providers)?.name).toBe(
    'Fixture'
  )
  expect(
    findProvider('https://www.provider.example/post/1', providers)?.name
  ).toBe('Fixture')
  for (const url of [
    'https://providerXexample/post/1',
    'https://provider.example.evil.test/post/1',
    'https://provider.example@evil.test/post/1',
    'https://evil.test/?foo=.provider.example/post/1',
    'javascript:alert(1)',
  ])
    expect(findProvider(url, providers)).toBeNull()
  const fallback = [
    {
      ...providers[0]!,
      endpoints: [{ url: 'https://provider.example/oembed' }],
    },
  ]
  expect(
    findProvider('https://provider.example/post/1', fallback)
  ).not.toBeNull()
  expect(
    findProvider('https://provider.example.evil.test/', fallback)
  ).toBeNull()
  expect(
    sameSiteOrigin(
      'https://preview.site.workers.dev',
      'https://*.site.workers.dev'
    )
  ).toBe(true)
})

test('renderer preserves provider scripts in its own document and escapes the source link', () => {
  const html = embedDocument(
    '<script src="https://provider.example/embed.js"></script>',
    'https://example.com/"<',
    true
  )
  expect(html).toContain(
    '<script src="https://provider.example/embed.js"></script>'
  )
  expect(html).toContain('background:#1c1c1c')
  expect(html).not.toContain('color-scheme')
  expect(html).toContain('https://example.com/&quot;&lt;')
  expect(html).toContain("type:'vinh:embed-size'")
})

test('renderer paints an opaque background matching the theme, without setting color-scheme', () => {
  expect(embedDocument('<p></p>', 'https://example.com', true)).toContain(
    'background:#1c1c1c'
  )
  expect(embedDocument('<p></p>', 'https://example.com', false)).toContain(
    'background:#ffffff'
  )
  expect(
    embedDocument('<p></p>', 'https://example.com', true, '#0a0a0a')
  ).toContain('background:#0a0a0a')
  expect(
    embedDocument('<p></p>', 'https://example.com', true, 'javascript:alert(1)')
  ).toContain('background:#1c1c1c')
  expect(embedDocument('<p></p>', 'https://example.com', true)).not.toContain(
    'color-scheme'
  )
  expect(
    embedDocument('<p></p>', 'https://example.com', false)
  ).not.toContain('color-scheme')
})

test('renderer tags Bluesky embeds with a color mode, since Bluesky ignores the theme query param', () => {
  const blueskyHtml =
    '<blockquote class="bluesky-embed" data-bluesky-uri="at://did/app.bsky.feed.post/1" data-bluesky-cid="abc"><p>hello</p></blockquote><script async src="https://embed.bsky.app/static/embed.js"></script>'

  const dark = embedDocument(blueskyHtml, 'https://example.com', true)
  expect(dark).toContain('data-bluesky-embed-color-mode="dark"')

  const light = embedDocument(blueskyHtml, 'https://example.com', false)
  expect(light).toContain('data-bluesky-embed-color-mode="light"')

  const alreadyTagged = embedDocument(
    '<blockquote class="bluesky-embed" data-bluesky-embed-color-mode="light"><p>hi</p></blockquote>',
    'https://example.com',
    true
  )
  expect(alreadyTagged).toContain('data-bluesky-embed-color-mode="light"')
  expect(alreadyTagged).not.toContain('data-bluesky-embed-color-mode="dark"')
})

test('JSON and renderer routes share provider results and reject same-origin rendering', async () => {
  const originalFetch = globalThis.fetch
  const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')
  const store = new Map<string, Response>()
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: {
      default: {
        match: async (key: string) => store.get(key)?.clone(),
        put: async (key: string, value: Response) => {
          store.set(key, value.clone())
        },
      },
    },
  })
  let providerCalls = 0
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input) === 'https://oembed.com/providers.json')
      return Response.json(providers)
    providerCalls++
    return Response.json({
      type: 'rich',
      html: '<script src="https://provider.example/embed.js"></script>',
    })
  }) as typeof fetch
  const env = {
    SITE_URL: 'https://site.example',
    SITE_PREVIEW_URL: 'https://*.preview.example',
  }
  try {
    const query = '?url=https://provider.example/post/1&theme=dark'
    const json = await oembed.request(
      `https://worker.example/${query}`,
      {},
      env
    )
    expect(json.status).toBe(200)
    const rendered = await oembed.request(
      `https://worker.example/render${query}`,
      {},
      env
    )
    expect(rendered.status).toBe(200)
    expect(rendered.headers.get('Content-Type')).toContain('text/html')
    expect(rendered.headers.get('Content-Security-Policy')).toContain(
      'frame-ancestors https://site.example'
    )
    expect(await rendered.text()).toContain('https://provider.example/embed.js')
    expect(providerCalls).toBe(1)
    expect(
      (await oembed.request(`https://site.example/render${query}`, {}, env))
        .status
    ).toBe(403)
    expect(
      (
        await oembed.request(
          `https://branch.preview.example/render${query}`,
          {},
          env
        )
      ).status
    ).toBe(403)
    expect(
      (
        await oembed.request(
          'https://worker.example/render?url=javascript:alert(1)',
          {},
          env
        )
      ).status
    ).toBe(400)
  } finally {
    globalThis.fetch = originalFetch
    if (originalCaches)
      Object.defineProperty(globalThis, 'caches', originalCaches)
    else Reflect.deleteProperty(globalThis, 'caches')
  }
})
