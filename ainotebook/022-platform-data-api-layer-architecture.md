---
name: 022-platform-data-api-layer-architecture
description: "Platform architecture principle: data layer → API layer → consumer layer. Workers are the API surface; data sources and execution engines are implementation details behind them."
metadata:
  type: adr
  status: APPROVED
  session: 78e6e2b4-34df-4c73-852c-d71397a90c55
  date: 2026-11-08
  sweep_count: 1
  touches:
    - model: claude-sonnet-4-6
      session: 78e6e2b4-34df-4c73-852c-d71397a90c55
      date: 2026-11-08
      action: created
      notes: "Articulated from user direction: platform must have distinct data/API/consumer layers for scalability across system applications"
---

# ADR 022 — Platform Data / API Layer Architecture

*November 8, 2026*

---

## Decision

The CCC platform treats every project Worker as a **complete, stable API layer**. Data sources and execution engines are implementation details behind that layer. All consumers — UI, mobile, MCP tools, other Workers, future hardware — talk only to the API layer. No consumer calls a data source or execution engine directly.

---

## Three-Layer Model

```
┌─────────────────────────────────────────────────────┐
│  CONSUMER LAYER                                      │
│  Cockpit UI · Future mobile · MCP tools · ESP32 ·   │
│  Other Workers via Service Binding                  │
└────────────────────┬────────────────────────────────┘
                     │  API layer only — no direct data access
┌────────────────────▼────────────────────────────────┐
│  API LAYER  (Cloudflare Worker)                      │
│  Clean, stable routes. Abstracts everything below.  │
│  Auth, CORS, error handling owned here.             │
│  ccc-bars.rossonlineservices.workers.dev            │
│  ccc-qoq.rossonlineservices.workers.dev             │
└────────────────────┬────────────────────────────────┘
                     │  internal — not consumer-visible
┌────────────────────▼────────────────────────────────┐
│  DATA LAYER                                          │
│  Sources:  Databento · Alpaca · Federal Register    │
│  Storage:  KV (hot cache) · D1 (structured) ·      │
│            R2 (blobs) · Durable Objects (live state)│
│  Engines:  PineTS container · Claude AI agents      │
└─────────────────────────────────────────────────────┘
```

---

## Why This Matters for Scalability

If a consumer calls a data source or execution engine directly:
- The consumer breaks when the source changes (Databento URL, container host, engine version)
- Two consumers serving the same data means two independent failure surfaces
- A mobile app, ESP32 device, or second cockpit each need separate auth and error handling
- Adding a cache, rate limiter, or circuit breaker requires changing every consumer

When the Worker is the only entry point:
- Data source changes are invisible to consumers — only the Worker changes
- Auth, CORS, rate limiting, and caching are centralized
- A new consumer (mobile, wearable) gets full capability at zero marginal infrastructure cost
- The API layer becomes the documented, versioned contract for the whole system

---

## Per-Project Status

### ccc-trading (`ccc-bars` Worker)

**Current gaps** — engine container routes not proxied through Worker:

| Route | Location today | Should be |
|---|---|---|
| `POST /run` | engine container only | Worker proxies to container |
| `POST /run-source` | engine container only | Worker proxies to container |
| `GET /scripts` | engine container only | Worker proxies to container |
| `GET /inputs` | engine container only | Worker proxies to container |
| `GET /script-source` | engine container only | Worker proxies to container |

The cockpit (`ENGINE_API = ccc-bars...workers.dev`) already points at the Worker — but calls routes that don't exist there. Those calls return 404 silently. The fix is Worker proxy routes for all engine container endpoints.

**Already correct:**
- `/bars`, `/seed`, `/coverage` — data layer routes, properly on Worker
- `/engine` — AOT strategy run, properly on Worker (admin-gated)
- `/stream/*` — live stream via Durable Object, properly on Worker

### ccc-qoq (`ccc-qoq` Worker)

Correct by design. All consumers call the Worker. D1 is never accessed directly by any consumer.

### ACIS (`acis` Worker)

Correct by design. Executive Hub and CCC Admin both use the Worker as the only entry point.

---

## Implementation Rule

> **A route that a consumer calls must exist on the Worker.** An engine container or data source endpoint is not a substitute. When adding a consumer capability, the question is not "what does the engine expose?" but "what route should the Worker expose?"

For ccc-trading specifically: when the engine container gains a new route, the Worker gains a corresponding proxy route in the same PR. Consumer-facing API and engine implementation travel together.

---

## Proxy Pattern for Engine Container Routes

```typescript
// Worker index.ts — proxy any unhandled path to engine container
if (url.pathname.startsWith('/run') || 
    url.pathname.startsWith('/scripts') || 
    url.pathname.startsWith('/inputs') ||
    url.pathname.startsWith('/script-source')) {
  const stub = env.ENGINE.get(env.ENGINE.idFromName('engine'));
  return stub.fetch(request);
}
```

Auth on proxied routes: public routes pass through; write/admin routes require `Bearer ${env.ADMIN_TOKEN}`.

---

## Relationship to Other ADRs

- **ADR 002** — unified Worker architecture (each project = one Worker): this ADR extends that by clarifying the Worker's role as the *only* API surface, not just the compute unit.
- **ADR 019** — multi-agent development architecture: agents (Claude, Ricci, etc.) are consumers too; they should call Worker routes, not data sources.

---

*AIBuddy — session 78e6e2b4*
