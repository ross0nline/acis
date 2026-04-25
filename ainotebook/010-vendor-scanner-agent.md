# 010 — Vendor Security Scanner Agent

**Date:** 2026-04-25  
**Status:** Decided & Implemented

---

## Decision

ACIS computes real vendor security posture on demand rather than storing static seed values. A scanner agent (`src/agents/vendor-scanner.ts`) HEAD-fetches each vendor URL, inspects HTTP security headers for a 0–100 score, then passes findings to `claude-opus-4-7` for a HIPAA-framed risk summary and `overall_status` classification. Results are written back to D1 with a refreshed `scanned_at` timestamp.

Two endpoints expose the scanner: `POST /api/vendors/:id/scan` (single vendor) and `POST /api/vendors/scan-all` (parallel batch), both admin-auth gated.

---

## Context

ADR 008 identified Vendor Risk as "Scaffolded — Agent Layer Pending": the DB schema, CRUD API, and six seeded vendor records existed, but `tls_valid`, `headers_score`, and `ai_risk_summary` were static values set at seed time. For the demo to be credible — especially with Change Healthcare correctly flagged as High Risk — those values needed to come from real computation, not hardcoded data.

The key design questions were:

1. **What to measure** — TLS only, or headers too? And which headers?
2. **How to call the vendor** — GET vs HEAD, timeout handling
3. **What Claude adds** — classification only, or narrative too?
4. **When to scan** — on registration, on cron, or on demand only?

---

## Decision Details

### HEAD request with 10-second AbortController timeout

HEAD avoids downloading the response body (important for large vendor homepages) while still returning all response headers. A 10-second `AbortController` timeout prevents a slow vendor from stalling the Worker. If the fetch throws for any reason (DNS failure, TLS error, timeout, 4xx/5xx), `tls_valid` stays 0 and header scoring is skipped — Claude still runs and returns `"Pending Review"` with an explanation that data was inconclusive.

### Six-header scoring at 100 points total

```
strict-transport-security   20 pts
content-security-policy     20 pts
x-frame-options             15 pts
x-content-type-options      15 pts
referrer-policy             15 pts
permissions-policy          15 pts
```

These are the six headers in OWASP's Secure Headers Project that consistently appear in HIPAA-adjacent vendor assessments. Point weights favor HSTS and CSP (the two headers that most directly prevent active attacks) over the remaining defensive headers. A vendor with all six earns 100; a vendor with none earns 0.

TLS is checked separately: if the URL protocol is `https:` and the fetch succeeds, `tls_valid = 1`. TLS failure counts heavily against the vendor in Claude's assessment logic regardless of `headers_score`.

### claude-opus-4-7 for narrative + classification

The Claude call receives TLS status, `headers_score`, and the explicit list of present/missing headers. It returns two fields:

- `ai_risk_summary` — 2–3 sentences framing the vendor's posture as a HIPAA Business Associate, naming the specific gaps that matter for a healthcare organization
- `overall_status` — one of `Approved`, `Requires Review`, `High Risk`, `Pending Review`

The prompt includes explicit status-determination logic so Claude applies consistent thresholds:

| Condition | Status |
|---|---|
| TLS valid AND score ≥ 70 | Approved |
| TLS valid AND score 40–69, OR no TLS AND score ≥ 60 | Requires Review |
| No TLS OR score < 40 | High Risk |
| Fetch failed entirely | Pending Review |

Using `claude-opus-4-7` (rather than Sonnet) here matters: the HIPAA-specific framing of risk — naming which missing header creates what attack surface for a covered entity — benefits from the stronger model's regulatory depth.

### On-demand scanning, not cron

The scanner does not run automatically on vendor registration or on the daily cron. This is deliberate:

- Vendor URLs may be internal systems behind VPNs that aren't reachable from Cloudflare's edge
- Running scan-all on every cron would incur Opus API costs for 6+ Claude calls daily
- The hiring manager demo scenario calls for triggering a scan live, watching real scores appear, and showing Change Healthcare's score drop — not having static results from yesterday's cron

When the Heartbeat agent is built (next phase), it can optionally trigger `scan-all` as part of its daily audit and log the results.

---

## Tested Expectations

Change Healthcare (`changehealthcare.com`) — the highest-profile healthcare data breach in US history — should score `High Risk` even with HTTPS valid, given the expectation that a compromised vendor's security headers may be incomplete post-incident. This provides the most demo-credible row in the Vendor Risk panel.

---

## Alternatives Considered

**Score on registration (POST /api/vendors)** — scans happen the moment a vendor is added. Adds ~5s latency to every registration POST and fails silently for vendors on private networks. Rejected.

**Cron-scheduled daily scan** — runs automatically alongside the regulatory scraper. Desirable long-term but costs 6+ Opus calls/day and doesn't allow the "live scan" demo moment. Deferred to Heartbeat agent phase.

**TLS certificate validation** — checking cert expiry, chain validity, and cipher suites via a third-party API (SSL Labs, etc.). Would add meaningful signal but introduces an external dependency and a second API key. The binary `tls_valid` flag (HTTPS succeeds = 1) is sufficient for the demo tier.
