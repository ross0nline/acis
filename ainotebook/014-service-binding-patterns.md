# 014 — Service Binding Patterns: Two Calling Conventions

**Date:** 2026-04-25  
**Status:** Reference — applies to all future agents that report to CCC Admin

---

## The Two Patterns

Two distinct patterns now exist in the codebase for reaching the `CCC_ADMIN` Service Binding. They serve different contexts and future agents should choose deliberately.

### Pattern A — Direct binding call (use this in scheduled/cron contexts)

```typescript
// Used in: src/agents/heartbeat.ts
await env.CCC_ADMIN.fetch(new Request('http://internal/internal/report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.ADMIN_TOKEN}` },
  body: JSON.stringify({ event_type, project_slug, description, triggered_by }),
}));
```

Called directly from agent code. Never leaves Cloudflare's infrastructure — no DNS, no TLS, no egress. This is the right pattern when:
- The call originates from a `scheduled` handler (cron)
- The call originates from agent logic that already has `env` in scope
- Latency and reliability matter (no external network dependency)

### Pattern B — HTTP proxy route (use this for frontend or external callers)

```typescript
// Defined in: src/index.ts — POST /internal/event
app.post('/internal/event', async (c) => {
  // ...auth check...
  await c.env.CCC_ADMIN.fetch(new Request('http://internal/internal/report', {
    method: 'POST',
    // ...
  }));
  return c.json({ ok: true });
});
```

The ACIS Worker exposes an HTTP endpoint that forwards payloads to CCC Admin. Use this when:
- The caller is a frontend component (can't hold a service binding directly)
- The caller is an external system that knows the ACIS API but not CCC Admin's shape
- You want the event to be loggable at the ACIS HTTP layer before forwarding

---

## Why This Matters

From within a `scheduled` handler, calling your own Worker's HTTP routes via `fetch('https://acis...')` is a full round-trip to the internet and back — DNS resolution, TLS handshake, Cloudflare ingress, egress cost. The Service Binding bypasses all of it: the invoked Worker runs in the same Cloudflare PoP, treated as a local function call.

This is the property the CCC Admin architecture was designed around (see the CCC meta brainstorm: "Option C — Service Bindings: a zero-latency, zero-network, in-edge RPC mechanism"). The heartbeat agent demonstrates it correctly: Pattern A from the cron context, no HTTP round-trip.

---

## Rule for Future Agents

| Context | Pattern |
|---|---|
| `scheduled` handler or agent running from cron | **A** — direct `env.CCC_ADMIN.fetch()` |
| Module route handler triggered by HTTP request | Either — but **A** is still preferred if `env` is in scope |
| Frontend component needs to trigger a CCC Admin event | **B** — POST to `/internal/event`, let the Worker proxy it |
| External integration (webhook, etc.) | **B** — same as frontend |
