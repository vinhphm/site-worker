export function parsePublicUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port
    )
      return null
    return url
  } catch {
    return null
  }
}

function glob(value: string, pattern: string): boolean {
  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${escaped}$`).test(value)
}

export function sameSiteOrigin(origin: string, site: string): boolean {
  return glob(origin, site.replace(/\/$/, ''))
}

/** Only "*" is special in registry schemes; dots and other regex syntax are literal. */
export function findProvider(
  value: string,
  providers: OEmbedProvider[]
): ProviderInfo | null {
  const target = parsePublicUrl(value)
  if (!target) return null
  for (const provider of providers) {
    for (const endpoint of provider.endpoints) {
      if (!parsePublicUrl(endpoint.url.replace('{format}', 'json'))) continue
      const matches = endpoint.schemes
        ? endpoint.schemes.some((scheme) => {
            try {
              const pattern = new URL(scheme)
              // A hostname wildcard must not consume paths, queries, or credentials.
              return (
                target.protocol === pattern.protocol &&
                glob(target.hostname, pattern.hostname) &&
                glob(target.href, scheme)
              )
            } catch {
              return false
            }
          })
        : parsePublicUrl(provider.provider_url)?.origin === target.origin
      if (matches) {
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
