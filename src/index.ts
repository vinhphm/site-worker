import { Hono } from "hono"
import { cache } from "hono/cache"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import oembed from "./oembed"
import og from "./og"

const app = new Hono<{ Bindings: Env }>()
  .use("*", logger())
  .use(
    "/oembed/*",
    cors({
      origin: (origin, c) => {
        const env = c.env
        const ALLOWED_ORIGINS = [
          env.SITE_URL,
          env.SITE_PREVIEW_URL,
          "http://localhost:4321",
          "http://127.0.0.1:4321",
        ]

        if (!origin) {
          return "*" // Allow requests without origin (like direct access)
        }

        const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
          if (!allowed) {
            return false
          }

          // If the allowed origin contains wildcards, use regex matching
          if (allowed.includes("*")) {
            // Escape all special regex characters except asterisks
            const escaped = allowed.replace(/[.+?^${}()|[\]-]/g, "\\$&")
            // Then replace asterisks with .*
            const pattern = new RegExp(`^${escaped.replace(/\*/g, ".*")}$`)
            return pattern.test(origin)
          }
          // Use exact matching instead of prefix matching
          return origin === allowed
        })

        return isAllowed ? origin : null
      },
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      exposeHeaders: ["X-Provider"],
      maxAge: 86_400,
      credentials: false,
    })
  )
  .use(
    "*",
    cache({
      cacheName: async (c) => {
        const url = new URL(c.req.url)
        const params = url.searchParams.toString()
        return `${c.req.method} ${url.pathname}${params}`
      },
      cacheControl: "max-age=86400", // 24 hour
    })
  )
  .get("/", (c) => {
    return c.redirect(c.env.SITE_URL)
  })
  .route("og", og)
  .route("oembed", oembed)

export default app
