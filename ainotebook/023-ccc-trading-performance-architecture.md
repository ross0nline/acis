---
name: 023-ccc-trading-performance-architecture
description: "CCC Trading speed architecture: AOT strategy compilation, CF Containers warm-first pattern, KV bar cache, and how the three-layer platform model (ADR 022) enables scalability."
metadata:
  type: adr
  status: APPROVED
  session: current-session-2026-11-08
  date: 2026-11-08
  sweep_count: 1
  touches:
    - model: claude-sonnet-4-6
      session: current-session-2026-11-08
      date: 2026-11-08
      action: created
      notes: "Documenting performance architecture decisions and platform scalability model per user request"
---

# ADR 023 — CCC Trading Performance Architecture

*November 8, 2026*

---

## Decision

CCC Trading achieves sub-second backtest execution on the edge through three compounding techniques: AOT strategy compilation embedded in the Worker bundle, a warm-first CF Container for dynamic scripts, and KV-cached bar data at the edge. All consumers reach this performance through the Worker API layer (ADR 022) — the architecture is invisible to them.

---

## The Three Speed Layers

### Layer 1 — AOT (Ahead-of-Time) Strategy Compilation

**What it is:** The primary strategy (`sma200-first-cross-v040101`) is compiled from Pine Script to JavaScript *at deploy time*, not at request time. The compiled output (`compiled-sma200.js`, ~284KB) is bundled directly into the Worker.

**How it works:**
- `build-engine.cjs` runs as a custom Wrangler build step (pre-deploy)
- It executes `runScriptSource()` with the Pine Script source and captures the compiled JS from PineTS internals
- The compiled strategy is written to `src/compiled-sma200.js` and imported statically
- At request time, `POST /engine` runs the pre-compiled strategy against KV bar data entirely in the Worker — no container, no cold start

**Why it matters:** A Worker invocation that runs compiled JS inline has near-zero additional latency beyond the Worker startup itself (~16ms). No network hop to a container, no health polling, no Firecracker VM spin-up. This is the fastest possible path.

**Trade-off:** AOT only works for known strategies baked in at deploy time. User-submitted scripts (`/run-source`) and dynamic strategy exploration require the container path.

```
POST /engine (AOT path)
  Worker → compiled-sma200.js (inline)
  Latency: ~16ms Worker startup + strategy execution time
  Container: not involved
```

---

### Layer 2 — CF Container (Warm-First Pattern)

**What it is:** The PineTS engine runs in a Cloudflare Container (Firecracker VM) for all dynamic script execution. The container manages its own lifecycle via the `EngineGateway` Durable Object.

**How it works:**
- `EngineGateway` DO receives proxied requests from the Worker
- On first request: `container.start()` → polls `GET /health` up to 15 times (1s intervals)
- On health confirmed: proxies the request with a 20s timeout
- Inactivity timeout: container sleeps after 10 minutes idle (`setInactivityTimeout`)
- Subsequent requests within the warm window: no startup delay

**Container entry point:** `dist/index.js` (Fastify server compiled from `src/index.ts`)
- Listens on `0.0.0.0:4000` (must be `0.0.0.0`, not loopback — EngineGateway connects from outside)
- Full API surface: `GET /scripts`, `GET /inputs`, `GET /script-source`, `POST /run`, `POST /run-source`
- Port 4000 matches `EngineGateway.ENGINE_PORT` — no env var needed in production

**Proxy URL rewrite (critical):** The Worker receives HTTPS requests (`ccc-bars.workers.dev`). The `EngineGateway` must rewrite to `http://container/<path>` before calling `port.fetch()`. Passing the original HTTPS URL returns 503: "HTTPS not supported for containers."

```
POST /run-source (container path)
  Worker → EngineGateway DO → container.getTcpPort(4000) → Fastify /run-source
  Cold start: ~15s max (health poll)
  Warm: ~20-100ms (Firecracker VM already running)
```

**Warm-first strategy:** The `/engine` AOT route is called first on page load. This warms the container as a side effect. By the time a user submits a custom script via Monaco, the container is likely already warm.

---

### Layer 3 — KV Bar Cache (Edge-Hot Data)

**What it is:** Historical bar data (144-tick QQQ, 1-min MNQ, etc.) is seeded into Cloudflare KV daily via a cron job and served from the edge on every request.

**How it works:**
- Cron at 11:30 UTC weekdays: `seedHistoricalBars()` pulls from Databento API → stores in KV
- KV key format: `{SYMBOL}:{TICK_SIZE}:{RTH}` (e.g., `QQQ:144:1`)
- `GET /bars` reads from KV — sub-millisecond at CF edge, no Databento API call per request
- Bar data is passed to both the AOT Worker path and the container path

**Why this matters for performance:** Databento API calls add ~200-500ms latency and cost $0.09-0.15 per data window. KV reads are free and fast. The strategy engine receives bars from KV, not from an external API, on every backtest.

**Cost discipline:** Check `databento.com/portal` usage before any new seed/pull. The seeder is cron-gated — no manual seeding without explicit scope.

---

## How the Layers Compose

```
                    ┌─────────────────────────────┐
                    │  CONSUMER LAYER              │
                    │  Cockpit UI · MCP · ESP32    │
                    └──────────────┬──────────────┘
                                   │ single endpoint
                    ┌──────────────▼──────────────┐
                    │  API LAYER — ccc-bars Worker  │
                    │                              │
                    │  /bars      → KV read        │
                    │  /engine    → AOT inline     │◄── fastest
                    │  /run       → Container DO   │
                    │  /run-source→ Container DO   │◄── flexible
                    │  /scripts   → Container DO   │
                    └──────────────┬──────────────┘
                                   │ internal
                    ┌──────────────▼──────────────┐
                    │  DATA LAYER                  │
                    │  KV: bar cache (edge-hot)    │
                    │  Container: PineTS engine    │
                    │  Databento: data source      │
                    │  D1: strategy metadata       │
                    └─────────────────────────────┘
```

A consumer calling `/engine` gets AOT performance (compiled JS, KV bars, Worker-inline).
A consumer calling `/run-source` gets container performance (Fastify, PineTS, KV bars).
Both call the same domain. Neither knows which path they hit.

---

## Deploy Method (Preserving the Knowledge)

Full deploy (Worker + container rebuild):
```bash
wsl -d SovereignFactory -- bash -c "cd /mnt/c/Users/rossonline/ccc/ccc-trading/worker && wrangler deploy 2>&1"
```
Or via script: `ccc-trading-deploy` (default)

Worker-only (no Docker, no container rebuild):
```
ccc-trading-deploy -NoContainers
```

**Why WSL, not PowerShell:** Windows `node_modules/` contains `@cloudflare/workerd-windows-64`. Docker builds in WSL need `@cloudflare/workerd-linux-64`. The global `wrangler` in WSL (`/usr/bin/wrangler`, v4.158.0) is Linux-native and calls the Docker daemon directly.

**Docker cache rule:** A change to `engine/src/` invalidates `COPY src/` → forces `RUN npx tsc` rebuild → new image pushed. If only Dockerfile metadata changes (CMD, ENV), the cache may not bust — touch a source file to force a full rebuild.

---

## Scalability Through the Platform Model (ADR 022)

The three-layer model means adding a new consumer (mobile app, ESP32 wearable, second cockpit) costs zero infrastructure changes:

| New consumer | What it gets |
|---|---|
| Mobile app | Same `/bars`, `/engine`, `/run-source` via Worker |
| ESP32 wearable | Same `/engine` route — tiny JSON payload, no DOM |
| MCP tool | Same Worker routes — already MCP-aware |
| Second cockpit | Same Worker — no second container needed |

The Worker handles auth, CORS, rate limiting, and caching for all of them. The container and KV are implementation details. This is why the platform model matters: the first consumer is expensive to build; every subsequent consumer is nearly free.

---

## Relationship to Other ADRs

- **ADR 022** — Platform data/API/consumer layer model (the structure this performance sits inside)
- **ADR 019** — Multi-agent development architecture (Claude Code as orchestrator)
- **Commit `cb5604c`** — AOT implementation: `build-engine.cjs`, `compiled-sma200.js`, `/engine` route
- **Commit `eddcbf0`** — CF Containers initial implementation: `engine-gateway.ts`, `server.mjs`, `Dockerfile`
- **Commits `6a40fc0`, `8e99042`** — ADR 022 proxy routes + HTTPS URL rewrite fix

---

*AIBuddy — session 2026-11-08*

<!-- dna-touches
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-11-08, action: updated, notes: "auto-touch via Stop hook" }
-->