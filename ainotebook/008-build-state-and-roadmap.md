# 008 — Current Build State & Remaining Roadmap

**Date:** 2026-04-25 (updated 2026-04-25 — email agents live, full cron sequence complete)  
**Status:** Reference — updated as phases complete

---

## What Is Actually Built vs. Pending

```mermaid
flowchart LR
    subgraph LIVE ["✅ Fully Live"]
        RP["Regulatory Pulse\nReal scraper + Claude scoring\n5 sources, daily cron\n64 events in DB"]
        AV["Attestation Vault\nFull CRUD + status lifecycle\nRxDC + Gag Clause tracking\n8 client records seeded"]
        IR["Incident Response\nDB + API + status lifecycle: done\nNIST 800-61 playbook agent: LIVE\nAuto-generates on every new incident"]
        VR["Vendor Risk\nDB + API + scanner agent: LIVE\nReal TLS + 6-header scoring (0–100)\nclaude-opus-4-7 risk summary\nDaily cron rescans stale vendors"]
        HB["Heartbeat Agent\nDaily cron after all agents\n13-query D1 batch, claude-opus-4-7\nGreen/Yellow/Red per module\nPOST /api/heartbeat/run"]
        OT["Operations Tab\nSystem Health (Green/Yellow/Red)\nAgent Logs (AI Gateway streaming)\nAdmin Controls (token-gated triggers)"]
        AR["Attestation Reminders\nDaily cron — Resend email\nFires when rxdc or gag_clause = Overdue"]
        IE["Incident Escalation\nDaily cron — Resend email\n7-day stale trigger\nHIPAA OCR countdown in subject line"]
    end
```

---

## Regulatory Pulse — Complete

- Cron scraper runs daily at 08:00 UTC
- Five source pipelines: Federal Register (CMS, EBSA, HHS), Regulations.gov (CMS, HHS, EBSA, OCR), Firecrawl (CMS Newsroom, HHS Press Room)
- Claude scores every document: risk level, impacted field, summary, remediation step, deadline
- Deduplication by URL — idempotent runs
- Open comment periods enforce minimum Medium (5) risk score
- Manual trigger: `POST /api/scraper/run` (admin auth)

## Attestation Vault — Complete

- Full CRUD for client plan records
- Two compliance dimensions tracked per client: `rxdc_status`, `gag_clause_status`
- `GET /api/attestation` returns completion percentages
- R2 folder path stored per record for future document upload integration

## Incident Response — Complete (see ADR 009)

- Full CRUD + status lifecycle (Open → Contained → Remediated → Closed)
- `POST /api/incidents` auto-generates a NIST 800-61 playbook via Claude before returning
- `POST /api/incidents/:id/playbook` regenerates playbook on demand
- Playbook structure: severity, HIPAA reportability, 60-day OCR deadline, 5 NIST phases, CFR citations, escalation contacts
- Executive Hub renders full `PlaybookView` with semantic color-coding per phase

## Vendor Risk — Complete (see ADR 010)

- `POST /api/vendors/scan-all` — scans all 6 vendors in parallel (admin auth)
- `POST /api/vendors/:id/scan` — on-demand single-vendor scan (admin auth)
- **Daily cron:** `runVendorScan(env)` queries `getStaleVendors()` — vendors where `scanned_at IS NULL OR scanned_at < datetime('now', '-30 days')`
- Scanner: HEAD-fetches vendor URL with 10s timeout, inspects 6 security headers, computes 0–100 `headers_score`
- Headers scored: HSTS (20), CSP (20), X-Frame-Options (15), X-Content-Type-Options (15), Referrer-Policy (15), Permissions-Policy (15)
- `claude-opus-4-7` produces HIPAA-framed `ai_risk_summary` and `overall_status` (Approved / Requires Review / High Risk / Pending Review)
- `updateVendorScan()` writes computed results + refreshes `scanned_at`

## Email Agents — Complete

**Attestation Reminders** (`src/agents/attestation-reminder.ts`)
- Fires daily when any record has `rxdc_status = 'Overdue'` OR `gag_clause_status = 'Overdue'`
- Sends HTML table of affected clients to `rossonlineservices@gmail.com` via Resend
- No-op on clean days — no spam

**Incident Escalation** (`src/agents/incident-escalation.ts`)
- Fires daily when any incident has `status = 'Open' AND opened_at < datetime('now', '-7 days')`
- Email includes days-open count and HIPAA OCR window countdown per incident
- Subject line escalates to `⚠️ URGENT` when any incident hits 45+ days
- Cites 45 CFR § 164.404 (60-day Breach Notification Rule)

**Email service** (`src/services/email.ts`) — Resend raw fetch abstraction; `from: acis@rossonlineservices.com`; domain verified for sending.

## Daily Cron Sequence (08:00 UTC)

```
runScraper → runVendorScan → runAttestationReminders → runIncidentEscalation → runHeartbeat
```

---

## Seeded Demo Data (current)

| Module | Records | Notes |
|---|---|---|
| Regulatory Events | 64 | Real federal data, Claude-scored, 5 sources |
| Attestation | 8 clients | Realistic mix of statuses |
| Vendor Risk | 6 vendors | Change Healthcare correctly flagged High Risk |
| Incidents | 7 incidents | Full status range + AI playbooks on new records |

---

## Remaining Build Queue

1. **Portfolio viewer** — `portfolio.rossonlineservices.com`; curated doc viewer; KV-backed toggle controls; GitHub API for private repo content retrieval
2. **GitHub PR automation** — high-risk regulatory event → auto PR via GitHub MCP; references ADR 003 roadmap item
3. **CCC Admin `/api/status` endpoint** — ACIS exposes structural state (modules, agents, cron sequence); CCC Admin polls it for dynamic build tracking
