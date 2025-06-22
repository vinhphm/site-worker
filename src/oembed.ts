import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Cache for providers list
let providersCache: any = null
let providersCacheTime = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

async function getProviders() {
  // Return cached providers if available and not expired
  if (providersCache && (Date.now() - providersCacheTime < CACHE_DURATION)) {
    return providersCache
  }

  try {
    const response = await fetch('https://oembed.com/providers.json')
    if (!response.ok) {
      throw new Error(`Failed to fetch providers: ${response.status}`)
    }

    providersCache = await response.json()
    providersCacheTime = Date.now()
    return providersCache
  } catch (error) {
    // If we have a cached version, use it even if expired
    if (providersCache) {
      return providersCache
    }
    throw error
  }
}

function findProvider(url: string, providers: OEmbedProvider[]) {
  for (const provider of providers) {
    for (const endpoint of provider.endpoints) {
      for (const scheme of endpoint.schemes || []) {
        const pattern = new RegExp(
          `^${scheme.replace(/\*/g, '.*').replace(/\?/g, '\\?')}$`,
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
  options: OEmbedOptions = {},
) {
  const embedUrl = new URL(provider.endpoint)
  embedUrl.searchParams.set('url', targetUrl)

  // Set format preference (prefer json if available)
  const format = provider.formats.includes('json') ? 'json' : provider.formats[0]
  embedUrl.searchParams.set('format', format)

  // Add additional parameters if provided
  for (const [key, value] of Object.entries(options)) {
    if (value) {
      embedUrl.searchParams.set(key, value.toString())
    }
  }

  const response = await fetch(embedUrl)

  if (!response.ok) {
    throw new Error(`Failed to fetch oEmbed data: ${response.status}`)
  }

  return response.json()
}

const app = new Hono<{ Bindings: Env }>()

// Configure CORS middleware for the oembed endpoint
app.use('/*', cors({
  origin: (origin, c) => {
    const env = c.env
    const ALLOWED_ORIGINS = [
      env.SITE_URL,
      env.SITE_PREVIEW_URL,
      'http://localhost:4321',
      'http://127.0.0.1:4321',
    ]

    if (!origin)
      return null

    const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
      // If the allowed origin contains wildcards, use regex matching
      if (allowed.includes('*')) {
        // Escape all special regex characters except asterisks
        const escaped = allowed.replace(/[.+?^${}()|[\]\\-]/g, '\\$&')
        // Then replace asterisks with .*
        const pattern = new RegExp(`^${escaped.replace(/\*/g, '.*')}$`)
        return pattern.test(origin)
      }
      // Use exact matching instead of prefix matching
      return origin === allowed
    })

    return isAllowed ? origin : null
  },
  allowMethods: ['GET', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 86400,
}))

export default app.get('/', async (c) => {
  // Parse URL and get parameters
  const targetUrl = c.req.query('url')

  if (!targetUrl) {
    return c.json({ error: 'Missing URL parameter' }, 400)
  }

  try {
    // Get providers list
    const providers = await getProviders()

    // Find the appropriate provider
    const provider = findProvider(targetUrl, providers)

    if (!provider) {
      return c.json({
        error: 'Unsupported URL format',
        message: 'No oEmbed provider found for this URL',
      }, 400)
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

    return c.json({
      error: 'Error processing request',
      message: error.message,
    }, 500)
  }
})
