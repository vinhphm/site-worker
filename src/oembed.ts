import { Hono } from 'hono'
import { findProvider, parsePublicUrl, sameSiteOrigin } from './providers'
import { embedDocument } from './embed-document'

const EXTRA_PROVIDERS: OEmbedProvider[] = [
  {
    provider_name: 'Threads',
    provider_url: 'https://www.threads.com/',
    endpoints: [
      {
        url: 'https://graph.threads.net/v1.0/oembed',
        schemes: [
          'https://www.threads.com/@*/post/*',
          'https://www.threads.com/t/*',
        ],
        formats: ['json'],
      },
    ],
  },
]

const PROVIDERS_CACHE_KEY = 'https://cache.internal/oembed-providers.json'
const PROVIDERS_CACHE_MAX_AGE = 24 * 60 * 60 // 24 hours, in seconds

// HTTP status codes
const HTTP_BAD_REQUEST = 400
const HTTP_INTERNAL_SERVER_ERROR = 500

// Timeout for outbound fetch to a provider's oEmbed endpoint
const PROVIDER_FETCH_TIMEOUT_MS = 8000

async function getProviders(): Promise<OEmbedProvider[]> {
  const cache = caches.default
  const cached = await cache.match(PROVIDERS_CACHE_KEY)
  if (cached) {
    return cached.json()
  }

  const response = await fetch('https://oembed.com/providers.json', {
    signal: AbortSignal.timeout(PROVIDER_FETCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch providers: ${response.status}`)
  }

  const data = (await response.json()) as OEmbedProvider[]

  await cache.put(
    PROVIDERS_CACHE_KEY,
    new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${PROVIDERS_CACHE_MAX_AGE}`,
      },
    })
  )

  return data
}

async function fetchOembedData(
  provider: ProviderInfo,
  targetUrl: string,
  options: OEmbedOptions = {}
) {
  const embedUrl = new URL(provider.endpoint.replace('{format}', 'json'))
  embedUrl.searchParams.set('url', targetUrl)

  // Set format preference (prefer json if available)
  if (!provider.formats.includes('json'))
    throw new Error('Provider does not support JSON')
  embedUrl.searchParams.set('format', 'json')

  // Add additional parameters if provided
  for (const [key, value] of Object.entries(options)) {
    if (value) {
      embedUrl.searchParams.set(key, value.toString())
    }
  }

  // JSON and HTML routes share a provider cache, avoiding duplicate provider calls.
  const cached = await caches.default.match(embedUrl.href)
  if (cached) return cached.json()
  const response = await fetch(embedUrl, {
    signal: AbortSignal.timeout(PROVIDER_FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch oEmbed data: ${response.status}`)
  }

  const data = await response.json()
  await caches.default.put(
    embedUrl.href,
    new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  )
  return data
}

const app = new Hono<{ Bindings: Env }>()

export default app.on('GET', ['/', '/render'], async (c) => {
  // Parse URL and get parameters
  const targetUrl = c.req.query('url')

  if (!targetUrl || !parsePublicUrl(targetUrl)) {
    return c.json(
      { error: 'A valid HTTP(S) URL is required' },
      HTTP_BAD_REQUEST
    )
  }
  const render = c.req.path.endsWith('/render')
  if (
    render &&
    [c.env.SITE_URL, c.env.SITE_PREVIEW_URL].some((site) =>
      sameSiteOrigin(new URL(c.req.url).origin, site)
    )
  ) {
    return c.text('Embed renderer must use a separate origin', 403)
  }

  try {
    // Get providers list
    const providers = [...EXTRA_PROVIDERS, ...(await getProviders())]

    // Find the appropriate provider
    const provider = findProvider(targetUrl, providers)

    if (!provider) {
      return c.json(
        {
          error: 'Unsupported URL format',
          message: 'No oEmbed provider found for this URL',
        },
        HTTP_BAD_REQUEST
      )
    }

    // Get additional options from query parameters
    const options: Record<string, string> = {}
    const validOptions = ['maxwidth', 'maxheight', 'theme', 'lang']

    for (const option of validOptions) {
      const value = c.req.query(option)
      if (value) {
        options[option] = value
      }
    }

    const data = (await fetchOembedData(
      provider,
      targetUrl,
      options
    )) as Record<string, unknown>

    if (render) {
      if (
        !['rich', 'video'].includes(String(data.type)) ||
        typeof data.html !== 'string'
      ) {
        return c.text('This provider did not return a rich embed', 422)
      }
      return new Response(
        embedDocument(
          data.html,
          targetUrl,
          options.theme === 'dark',
          c.req.query('bg')
        ),
        {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer',
            'Content-Security-Policy': `frame-ancestors ${c.env.SITE_URL} ${c.env.SITE_PREVIEW_URL} http://localhost:4321 http://127.0.0.1:4321`,
          },
        }
      )
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'X-Provider': provider.name,
    }

    return new Response(JSON.stringify(data), {
      headers: new Headers(headers),
    })
  } catch (error: any) {
    console.error('Error:', error)

    return c.json(
      {
        error: 'Error processing request',
        message: error.message,
      },
      HTTP_INTERNAL_SERVER_ERROR
    )
  }
})
