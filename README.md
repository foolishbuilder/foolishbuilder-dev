# foolishbuilder.dev

Pat Faint's personal portfolio. Bright, bubbly, fun.

Built with Vite + Cloudflare Workers.

## Quick Start

```bash
npm install
```

## Add GitHub PAT (server-side only — never exposed to browser)

```bash
wrangler secret put GITHUB_PAT
```

Paste your token when prompted. Recommended scope: `public_repo`.

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
- `src/worker.js` — Cloudflare Worker that proxies GitHub API requests
  using your PAT for higher rate limits. The token never reaches the browser.
- Repos named `foolishbuilder-dev`, forks, archived, and private repos
  are filtered out client-side.
