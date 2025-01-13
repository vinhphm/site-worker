import { Hono } from 'hono'
import { cache } from 'hono/cache'
import { logger } from 'hono/logger'
import oembed from './oembed'
import og from './og'

const app = new Hono()
  .use('*', logger())
  .use(
    '*',
    cache({
      cacheName: async (c) => {
        const url = new URL(c.req.url)
        const params = url.searchParams.toString()
        return `${c.req.method} ${url.pathname}${params}`
      },
      cacheControl: 'max-age=86400', // 24 hour
    }),
  )
  .get('/', (c) => {
    return c.text('Hello from vinh.dev Workers!')
  })
  .route('og', og)
  .route('oembed', oembed)

export default app
