# 012 — Heartbeat Agent: Daily Self-Audit Loop

**Date:** 2026-04-25  
**Status:** Decided & Implemented

---

## Decision

ACIS runs a daily self-audit after the regulatory scraper completes. The Heartbeat agent queries all four compliance modules in a single D1 batch, passes the metrics to `claude-opus-4-7` for a structured Green/Yellow/Red health assessment, persists the report to `agent_memory`, and forwards a summary to CCC Admin via Service Binding. This is the "autonomous" in ACIS — the system monitors itself and reports up without human initiation.

---

## Context

ADR 008 listed the Heartbeat agent as the second remaining build item after the vendor scanner, describing it as: "daily self-audit loop, reports system health to CCC Admin via Service Binding; this is the 'autonomous' in ACIS."

The key design questions were:

1. **What to measure** — which metrics per module signal genuine health vs. noise?
2. **How to collect** — individual queries vs. batch vs. a single aggregating SELECT
3. **Where Claude fits** — rule-based thresholds vs. model-generated narrative assessment
4. **How to report** — what shape does the CCC Admin payload take?

---

## Decision Details

### 13-query D1 batch — one round trip for all four modules

```typescript
const results = await db.batch<{ v: number }>([
  // Regulatory Pulse (3 queries)
  db.prepare('SELECT COUNT(*) as v FROM regulatory_events'),
  db.prepare("SELECT COUNT(*) as v FROM regulatory_events WHERE ingested_at >= datetime('now', '-1 day')"),
  db.prepare('SELECT COUNT(*) as v FROM regulatory_events WHERE risk_score >= 8'),

  // Attestation Vault (3 queries)
  db.prepare('SELECT COUNT(*) as v FROM attestation_vault'),
  db.prepare("SELECT COUNT(*) as v FROM attestation_vault WHERE rxdc_status = 'Overdue' OR gag_clause_status = 'Overdue'"),
  db.prepare("SELECT COUNT(*) as v FROM attestation_vault WHERE rxdc_status = 'Confirmed' AND gag_clause_status = 'Attested'"),

  // Vendor Risk (4 queries)
  db.prepare('SELECT COUNT(*) as v FROM vendor_risk'),
  db.prepare("SELECT COUNT(*) as v FROM vendor_risk WHERE overall_status = 'High Risk'"),
  db.prepare("SELECT COUNT(*) as v FROM vendor_risk WHERE scanned_at < datetime('now', '-30 days') OR scanned_at IS NULL"),
  db.prepare('SELECT ROUND(AVG(headers_score)) as v FROM vendor_risk'),

  // Incident Response (3 queries)
  db.prepare('SELECT COUNT(*) as v FROM incidents'),
  db.prepare("SELECT COUNT(*) as v FROM incidents WHERE status = 'Open'"),
  db.prepare("SELECT COUNT(*) as v FROM incidents WHERE status = 'Open' AND opened_at < datetime('now', '-7 days')"),
]);
```

D1's `.batch()` executes all statements in a single HTTP round trip to the database. Running 13 individual `.first()` calls would be 13 sequential D1 requests — unacceptable latency in a cron job that already awaits the scraper before running. The batch approach keeps the entire audit collection under ~50ms.

### Claude produces narrative + classification, not just thresholds

A pure rule-based approach (`if overdue > 0 → Yellow`) would work for the classification, but it produces mechanical, unhelpful summaries. The prompt gives Claude the raw numbers and asks it to:

- Classify each module Green / Yellow / Red
- Write a single-sentence module summary that names the *specific* condition (e.g., "3 of 8 attestation clients are overdue for RxDC submission")
- Produce 0–3 `action_items` that a compliance administrator can act on today
- Produce an `overall_status` that synthesizes across all four modules

Using `claude-opus-4-7` here (rather than Sonnet) is deliberate: the summary text may be read directly by a hiring manager viewing the CCC Admin dashboard. The regulatory framing ("RxDC submission", "HIPAA breach notification window") should be accurate and specific, not generic.

### HeartbeatReport schema

```typescript
interface HeartbeatReport {
  timestamp: string;
  overall_status: 'Green' | 'Yellow' | 'Red';
  summary: string;
  modules: {
    regulatory_pulse:  { status: 'Green' | 'Yellow' | 'Red'; summary: string };
    attestation_vault: { status: 'Green' | 'Yellow' | 'Red'; summary: string };
    vendor_risk:       { status: 'Green' | 'Yellow' | 'Red'; summary: string };
    incident_response: { status: 'Green' | 'Yellow' | 'Red'; summary: string };
  };
  action_items: string[];
}
```

The `timestamp` field is added by the Worker (not Claude) so it reflects actual execution time, not model hallucination.

### Runs after the scraper in the daily cron

```typescript
const scheduled: ExportedHandlerScheduledHandler<Env> = async (_event, env) => {
  await runScraper(env);   // 08:00 UTC — ingest today's regulatory events
  await runHeartbeat(env); // immediately after — audit includes today's ingested count
};
```

Sequential execution is intentional: the heartbeat's `recent_24h` metric for Regulatory Pulse reflects events ingested by today's scraper run. Running them in parallel would race — the heartbeat might read 0 new events if the scraper hasn't written them yet.

### Persisted to agent_memory, reported via Service Binding

The report is stored under `context_key = 'last_heartbeat'` in D1's `agent_memory` table. This makes it queryable via `GET /api/heartbeat/last` without re-running the audit, and gives the Agent Logs panel (next phase) something concrete to render.

The CCC Admin Service Binding call follows the existing `http://internal/internal/report` pattern established in ADR 008's `/internal/event` endpoint. The `description` field concatenates the overall status badge, the summary sentence, and any action items — making the payload readable in whatever notification surface CCC Admin uses.

CCC Admin failures are caught and logged rather than thrown, so a Service Binding outage (common in local `wrangler dev`) doesn't break the audit or lose the persisted report.

---

## Endpoints Added

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/heartbeat/last` | None | Returns the last stored `HeartbeatReport` from `agent_memory` |
| `POST` | `/api/heartbeat/run` | Admin token | Triggers an immediate audit — same logic as the cron |

---

## Alternatives Considered

**Rule-based threshold engine (no Claude)** — deterministic and cheaper. Rejected because the output is machine text, not the HIPAA-specific narrative that makes the demo credible to a compliance-focused hiring manager.

**Parallel scraper + heartbeat** — saves ~10–30s of cron wall time. Rejected because the heartbeat's `recent_24h` metric would race against the scraper's writes and potentially report 0 new events on a day the scraper ran successfully.

**Separate cron schedule for heartbeat** — e.g., run the audit at 09:00 after the scraper finishes at 08:00. Avoids the race without sequential await. Adds a second cron trigger entry but otherwise clean — worth reconsidering if the scraper ever becomes long-running enough to approach Workers' CPU limits.
