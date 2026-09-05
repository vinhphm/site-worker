# vinh.dev Workers

Used for OG and OEmbed in [vinh.dev](https://vinh.dev)

## Embed rendering

`GET /oembed?url=...` returns provider JSON.
`GET /oembed/render?url=...` returns a complete HTML document for rich/video
responses, including the provider's scripts. Both routes share a one-hour provider
response cache and accept `theme`, `lang`, `maxwidth`, and `maxheight`.

**Host this worker on a separate public origin such as `worker.vinh.dev`, never
on the site's origin or an origin containing authenticated pages, secrets in browser
storage, or sensitive cookies.** Provider HTML executes with the worker origin's
browser privileges. Do not set sensitive cookies with `Domain=vinh.dev`, which would
also expose them to subdomains. This renderer is not a sanitization service.

The renderer rejects the configured site and preview origins and restricts framing
to those sites and the local development server. It reports content height via
`postMessage`; the site must verify both `event.origin` and `event.source` and bound
the accepted height. Do not sandbox this document to an opaque origin: that also
forces nested provider frames to origin `null` and breaks provider CORS.

Deploy this worker before the corresponding site change. A provider being listed
in the oEmbed registry does not guarantee working credentials, available posts,
or browser compatibility. Original-post fallback links belong in the parent site.

Validation: `bun test`, `bun run lint`, `bun run format:check`.

## License

MIT
