import { Hono } from 'hono'

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

  const response = await fetch('https://oembed.com/providers.json')
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

function findProvider(url: string, providers: OEmbedProvider[]) {
  for (const provider of providers) {
    for (const endpoint of provider.endpoints) {
      for (const scheme of endpoint.schemes || []) {
        const pattern = new RegExp(
          `^${scheme.replace(/\*/g, '.*').replace(/\?/g, '\\?')}$`
        )
        if (pattern.test(url)) {
          return {
            name: provider.provider_name,
            endpoint: endpoint.url,
            formats: endpoint.formats || ['json'],
          }
        }
      }

      // If no schemes defined but url matches provider url
      if (!endpoint.schemes && url.startsWith(provider.provider_url)) {
        return {
          name: provider.provider_name,
          endpoint: endpoint.url,
          formats: endpoint.formats || ['json'],
        }
      }
    }
  }
  return null
}

async function fetchOembedData(
  provider: ProviderInfo,
  targetUrl: string,
  options: OEmbedOptions = {}
) {
  const embedUrl = new URL(provider.endpoint)
  embedUrl.searchParams.set('url', targetUrl)

  // Set format preference (prefer json if available)
  const format = provider.formats.includes('json')
    ? 'json'
    : provider.formats[0]
  embedUrl.searchParams.set('format', format)

  // Add additional parameters if provided
  for (const [key, value] of Object.entries(options)) {
    if (value) {
      embedUrl.searchParams.set(key, value.toString())
    }
  }

  const response = await fetch(embedUrl, {
    signal: AbortSignal.timeout(PROVIDER_FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch oEmbed data: ${response.status}`)
  }

  return response.json()
}

const app = new Hono<{ Bindings: Env }>()

export default app.get('/', async (c) => {
  // Parse URL and get parameters
  const targetUrl = c.req.query('url')

  if (!targetUrl) {
    return c.json({ error: 'Missing URL parameter' }, HTTP_BAD_REQUEST)
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
    const validOptions = ['maxwidth', 'maxheight', 'theme', 'format', 'lang']

    for (const option of validOptions) {
      const value = c.req.query(option)
      if (value) {
        options[option] = value
      }
    }

    const data = await fetchOembedData(provider, targetUrl, options)

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
