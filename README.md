# foolishbuilder.dev

Pat Faint's personal portfolio. Bright, bubbly, fun.

Built with Vite + Cloudflare Workers.

## Quick Start

```bash
npm install
```

## Add GitHub PAT (server-side only)

```bash
wrangler secret put GITHUB_PAT
```

Paste your token when prompted. Recommended scope: `public_repo`.

The token is stored as a Cloudflare Worker secret and is NEVER exposed to the browser.

## Development

```bash
npm run dev
```

## Deploy

```bash
npm run deploy
```

## Architecture

- `index.html` — self-contained frontend (all CSS/JS inline)
- `src/worker.js` — Cloudflare Worker proxy for GitHub API (uses PAT for rate limits)
- Repos named `foolishbuilder-dev`, forks, archived, and private repos are filtered out client-side
