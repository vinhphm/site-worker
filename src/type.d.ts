interface CacheStorage {
  default: Cache
}

interface Env {
  SITE_URL: string
}

interface OEmbedEndpoint {
  url: string
  schemes?: string[]
  formats?: string[]
}

interface OEmbedProvider {
  provider_name: string
  provider_url: string
  endpoints: OEmbedEndpoint[]
}

interface ProviderInfo {
  name: string
  endpoint: string
  formats: string[]
}

interface OEmbedOptions {
  maxwidth?: string
  maxheight?: string
  format?: string
  theme?: string
  lang?: string
}

declare module '@cloudflare/pages-plugin-vercel-og/api' {
  import type { ImageResponse as VercelImageResponse } from '@vercel/og'

  export declare class ImageResponse extends Response {
    constructor(...args: ConstructorParameters<typeof VercelImageResponse>)
  }
}
declare module '*.woff2' {
  const content: ArrayBuffer
  export default content
}

declare module '*.woff' {
  const content: ArrayBuffer
  export default content
}

declare module '*.ttf' {
  const content: ArrayBuffer
  export default content
}
