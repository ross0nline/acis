# ADR 017 — Portfolio Viewer: Worker-Rendered Markdown with KV Toggle Controls

**Status:** Decided & Implemented  
**Date:** 2026-04-26  
**Context:** Public-facing document viewer at `portfolio.rossonlineservices.com` for the BRMS hiring audience

---

## Decision

The portfolio viewer is a **separate Cloudflare Worker** (`portfolio/`) that fetches Markdown from GitHub at request time, renders it to HTML using `marked` v15, and serves a complete styled page. Document visibility is controlled via Cloudflare KV toggles managed through a password-protected admin panel. The viewer is architecturally independent from ACIS — no service binding, no shared database.

---

## Context

The BRMS job application requires demonstrating HIPAA compliance competency to a Director of IT. The `docs/brms/` documents (letter, overview, alignment matrix, roadmap) are the primary written artifacts. They need to be:

1. **Publicly accessible** at a professional URL without requiring account creation
2. **Selectively shown** — not all documents need to be visible at all times; the admin controls what the audience sees
3. **Maintained as Markdown** — keeping docs in the repo preserves version history and the ability to edit them in the IDE
4. **Separate from ACIS Operations** — the admin panel for document toggles must not be visible to the hiring audience viewing the ACIS Executive Hub

---

## Architecture

```
Browser → portfolio Worker (portfolio.rossonlineservices.com)
              ↓ fetch markdown (request time)
          raw.githubusercontent.com / GitHub API
              ↓ toggle state
          PORTFOLIO_KV (Cloudflare KV)
```

### GitHub Content Fetching

```typescript
// Public repo: raw CDN — no rate limits, no auth required
fetchUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

// Private repo (future): GitHub API with token
fetchUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`;
headers['Accept'] = 'application/vnd.github.v3.raw';
```

The `raw.githubusercontent.com` CDN is chosen over the GitHub API for public repos because:
- **No rate limit** — Workers IPs share the unauthenticated API quota (60 req/hr); CDN has none
- **Direct content delivery** — no base64 decoding step
- **Lower latency** — CDN edge is geographically closer than api.github.com

When the repo goes private, `GITHUB_TOKEN` is added as a Worker secret and the fetch path switches to the GitHub API automatically.

### KV Toggle Controls

Each document is stored in `PORTFOLIO_KV` under a key like `doc_visible_00` (`true`/`false`). The document list is defined in the Worker source — KV only stores the visibility state. On startup (or on each request), the Worker reads the toggle for each document and filters the list accordingly.

This approach was chosen over D1 because:
- Visibility state is flat key/value — no relational queries needed
- KV reads at the edge are faster than D1 queries for a simple boolean lookup
- No schema migration needed if documents are added or removed

### Admin Panel

- Route: `GET /admin?token=<PORTFOLIO_ADMIN_TOKEN>`
- Auth: query-parameter token comparison (constant-time via Web Crypto API)
- Function: toggle visibility per document, see current KV state
- Completely separate from ACIS `ADMIN_TOKEN` — independent secret, independent Worker
- The hiring audience never sees `/admin` — it is not linked from the public-facing document list

**Why query param instead of a login form?** The admin is a single user (the portfolio owner) accessing from known devices. A `?token=...` URL is bookmark-friendly, requires no session management, and keeps the Worker stateless. The token is never embedded in public HTML.

---

## Rendering Stack

**`marked` v15** renders Markdown to HTML server-side. Key decisions:

- `gfm: true` — GitHub Flavored Markdown (tables, strikethrough, task lists)
- No `html: true` option — removed from MarkedOptions in v15; HTML pass-through is default
- Return type is `string | Promise<string>` in v15; resolved with `await`
- **Mermaid diagrams** render correctly because the Worker outputs raw `<pre><code class="language-mermaid">` blocks and the page loads `mermaid.min.js` from CDN, which auto-initializes on `DOMContentLoaded`

---

## UI Design Decisions

**Dark mode toggle with no flash:**  
An inline `<script>` in `<head>` reads `localStorage.getItem('theme')` and applies the class to `<html>` before the browser paints. This prevents the flash-of-wrong-theme that occurs when the toggle script runs after render.

**CSS custom properties for theming:**  
All colors are declared as `--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent` on `:root` for light mode and overridden on `html.dark`. Component styles reference only variables — no hardcoded color values in component CSS.

**Per-document accent colors:**  
Each document has a unique accent color (violet, blue, green, amber) applied to headings, the active nav indicator, and the card border. This gives visual identity to each document without requiring separate stylesheets.

**No social media plugins:**  
Intentional. The portfolio owner is privacy-conscious and does not want tracking pixels, like buttons, or share widgets embedded in the page. The document content stands on its own.

**Prev/Next navigation:**  
`docIndex` is passed through the URL (`?doc=N`) and used to render previous/next buttons. This allows keyboard-friendly navigation without JavaScript state management.

---

## PWA Support (Pending)

The portfolio Worker will serve three additional routes to enable installability:

- `GET /manifest.json` — PWA manifest (standalone display, dark theme color)
- `GET /icon.svg` — shield + "P" SVG (or inline as data URL in the manifest)
- `GET /sw.js` — minimal cache-first service worker for offline shell

This mirrors the PWA implementation added to the ACIS Executive Hub (manifest.json + icon.svg in `frontend/public/`). The portfolio's service worker can cache the rendered HTML shell so the page loads offline — a credible signal that the portfolio itself is a production-quality artifact.

---

## Deployment

```
portfolio-deploy (C:\Scripts\portfolio-deploy.ps1)
  ↓ git push origin master    — content is fetched from GitHub at request time;
                                 unpushed commits are invisible until pushed
  ↓ npx wrangler deploy       — deploys the Worker from portfolio/
```

The push-first requirement is enforced in the deploy script to prevent a silent mismatch between deployed Worker code and unpushed document content.

---

## Alternatives Considered

**Cloudflare Pages with static site generation** — would pre-render Markdown at build time, eliminating the GitHub fetch latency. Rejected because it requires a build pipeline for the portfolio docs, which are plain Markdown with no npm dependencies. The Worker approach deploys in seconds and keeps the docs in the same repo without a build step.

**Storing document content in KV** — would eliminate the GitHub dependency entirely. Rejected because it would require a separate sync step to update KV whenever docs change. GitHub as the source of truth is already the workflow (edit → commit → push → visible).

**Embedding docs in the ACIS Executive Hub** — a "Portfolio" tab alongside Live Pulse, Attestation, etc. Rejected because the Operations tab (with admin controls) is meant to be shown to the hiring audience. Mixing the portfolio admin panel into ACIS Operations would expose admin controls in a demo context.
