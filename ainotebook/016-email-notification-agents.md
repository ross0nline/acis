# ADR 016 — Email Notification Agents: Attestation Reminders & Incident Escalation

**Status:** Decided & Implemented  
**Date:** 2026-04-25  
**Context:** Proactive compliance notifications for overdue attestations and stale open incidents

---

## Decision

Two autonomous email agents run in the daily cron, after the scraper and vendor scan, before the heartbeat. Both share a single `src/services/email.ts` abstraction. Both are **no-ops on clean days** — they send nothing if there are no actionable items — making them safe to run daily without creating noise.

---

## Context

Compliance operations without notification are compliance operations that depend on someone remembering to check a dashboard. Two conditions in ACIS signal a need for direct action by a human:

1. **Overdue attestations** — a client plan's RxDC or Gag Clause submission is past its deadline
2. **Stale open incidents** — an incident has been open for 7+ days, approaching the 60-day HIPAA OCR breach notification window (45 CFR § 164.404)

Both conditions are already tracked in D1. The email agents are the outbound notification layer that converts passive dashboard data into active compliance workflow.

---

## Email Service Abstraction

`src/services/email.ts` provides a thin wrapper over the Resend HTTP API (per ADR 015). No SDK dependency — raw `fetch()` only.

```typescript
interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(apiKey: string, payload: EmailPayload): Promise<boolean>
```

The `from` address is `ACIS Compliance <acis@rossonlineservices.com>`. The domain is verified for sending via SPF/DKIM without MX records — existing Gmail forwarding is unaffected. Delivery comes through Resend's infrastructure; replies route to Gmail via the wildcard `*@rossonlineservices.com` forwarder.

If `RESEND_API_KEY` is not set, both agents log a warning and return without throwing — the cron continues cleanly.

---

## Agent 1: Attestation Reminder (`src/agents/attestation-reminder.ts`)

**Trigger:** Any attestation record where `rxdc_status = 'Overdue'` OR `gag_clause_status = 'Overdue'`

**Query:** `getAttestationRecords()` (full vault), filtered in memory for overdue status on either field.

**Email content:**
- Subject: `[ACIS] Attestation Reminder — X client plan(s) require attention`
- Body: HTML table listing each overdue plan, plan name, plan ID, and which fields are overdue (cells highlighted in red for visual urgency)
- No per-client email sending — a single aggregate email to the admin (`rossonlineservices@gmail.com`) covering all overdue plans

**No-op condition:** Returns `{ sent: 0, skipped: N }` immediately if no records are overdue. Zero network calls to Resend on clean days.

---

## Agent 2: Incident Escalation (`src/agents/incident-escalation.ts`)

**Trigger:** Any incident with `status = 'Open'` and `opened_at < datetime('now', '-7 days')`

**Query:** `getStaleIncidents(7)` from `src/db/queries.ts`

**Email content:**
- Days open and HIPAA OCR window countdown calculated per incident:
  ```typescript
  function daysOpen(openedAt: string): number {
    return Math.floor((Date.now() - new Date(openedAt).getTime()) / 86_400_000);
  }
  // HIPAA 45 CFR § 164.404: 60 calendar days from discovery to breach notification
  const hipaaWindow = 60 - daysOpen(incident.opened_at);
  ```
- Subject escalates based on urgency:
  - `[ACIS] Incident Escalation — X open incident(s) require attention` (standard, < 45 days open)
  - `[ACIS] ⚠️ URGENT — X incident(s) approaching HIPAA notification deadline` (45+ days open)
- Body: HTML table with incident title, severity, days open, HIPAA window remaining, regulatory citation (45 CFR § 164.404)

**No-op condition:** Returns `{ escalated: 0 }` immediately if no stale incidents.

---

## Cron Sequence

```
08:00 UTC daily
  ↓ runScraper(env)           — ingest regulatory events
  ↓ runVendorScan(env)        — TLS + headers scan for stale vendors
  ↓ runAttestationReminders(env)  — email if overdue attestations exist
  ↓ runIncidentEscalation(env)    — email if stale open incidents exist
  ↓ runHeartbeat(env)         — self-audit; sees data from all steps above
```

The email agents run before the heartbeat so the heartbeat can include `sent_reminder` and `escalated_incidents` signals in its assessment when those are added to the heartbeat prompt in the future.

---

## Design Decisions

**Single admin email vs. per-client emails:** The system manages 8 client plans and all incidents are internal compliance items — the administrator is the primary actor. Per-client emails would require storing contact email addresses in D1, introducing data management overhead. Admin-only email keeps the loop tight: one person receives all compliance alerts and decides what downstream communication is needed.

**No SDK dependency:** `@resend/node` or similar would add a package that Workers would need to bundle. Raw `fetch()` keeps the Worker lean and avoids any Node.js compatibility shim concerns.

**Silent fail on missing secret:** If `RESEND_API_KEY` is absent (e.g., local dev without `.dev.vars`), both agents log a warning and return rather than throwing. This preserves cron continuity and avoids a missing secret from cascading into a failed heartbeat.

---

## Alternatives Considered

**Webhooks instead of email** — would require a receiving endpoint (Slack, PagerDuty, etc.). Email was chosen because it requires no third-party account beyond Resend, it's universally accessible, and it produces a compliance audit trail in the inbox.

**D1-backed send deduplication** — prevent re-sending the same reminder on consecutive days. Not implemented: the email content reflects the current state on each run, so re-sending on consecutive overdue days is intentional escalation behavior, not noise. If it becomes annoying in practice, a `last_reminded_at` column in `attestation_vault` is the right fix.
