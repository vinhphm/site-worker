# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Cloudflare Worker project that provides OG image generation and oEmbed functionality for vinh.dev. The worker is built with Hono framework and TypeScript, deployed to `worker.vinh.dev/*`.

## Package Manager and Commands

This project uses **bun** as the package manager (specified in `packageManager: "bun@1.2.4"`).

### Development Commands
- `bun run dev` - Start development server with wrangler
- `bun run deploy` - Deploy to Cloudflare with minification
- `bun run lint` - Run linting with ultracite
- `bun run lint:fix` - Auto-fix formatting issues with ultracite

### Pre-commit Hook
The project has a pre-commit hook that runs `npx ultracite format` automatically before commits.

## Architecture

### Core Application Structure
The main entry point is `src/index.ts` which sets up a Hono app with:
- Logger middleware for all routes
- CORS middleware specifically for `/oembed/*` routes with dynamic origin validation
- Caching middleware (24 hour cache) for all routes
- Route handlers for OG image generation (`/og`) and oEmbed (`/oembed`)

### Key Modules

#### OG Image Generation (`src/og.tsx`)
- Generates social media preview images using React/JSX and Vercel OG Image API
- Uses local fonts (Inter-SemiBold.ttf) loaded from `/public/fonts/`
- Supports custom title parameter via query string
- Returns 1200x630px images with vinh.dev branding
- Image assets loaded from `/public/images/` (logo.png)

#### oEmbed Service (`src/oembed.ts`)
- Proxies oEmbed requests by fetching provider information from oembed.com
- Implements 24-hour provider cache to reduce external API calls
- Supports standard oEmbed parameters (maxwidth, maxheight, theme, format, lang)
- Returns JSON responses with proper CORS headers

#### Font Management (`src/getFonts.ts`)
- Multiple font loading strategies: Google Fonts API, GitHub fonts, direct URLs, local fonts
- Local font loading via Cloudflare Workers assets binding
- Caching support for all font sources
- Currently configured to use local Inter-SemiBold.ttf

#### Image Loading (`src/loadImage.ts`)
- Loads images from worker's assets and converts to base64 data URLs
- Used for embedding logos and graphics in OG images

### Environment Variables
Configured in `wrangler.jsonc`:
- `SITE_URL`: "https://vinh.dev"
- `SITE_PREVIEW_URL`: "https://vrelic.workers.dev"

### CORS Configuration
The oEmbed endpoint has specific CORS rules allowing:
- Origin domains: SITE_URL, SITE_PREVIEW_URL, localhost:4321, 127.0.0.1:4321
- Supports wildcard patterns in allowed origins
- Methods: GET, POST, OPTIONS
- 24-hour max age with credentials disabled

### Asset Handling
- Static assets served from `/public/` directory
- Fonts in `/public/fonts/`
- Images in `/public/images/`
- Assets bound to `ASSETS` binding in worker environment

### Deployment
- Routes to `worker.vinh.dev/*` on the `vinh.dev` zone
- Minification enabled for production builds
- Node.js compatibility v2 enabled
- Observability enabled with 100% head sampling rate

### Code Style
- Uses Biome for linting/formatting with ultracite configuration
- TypeScript strict mode enabled
- JSX configured for React
- Pre-commit hooks ensure code formatting consistency