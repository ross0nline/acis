# 009 — NIST 800-61 Incident Playbook Agent

**Date:** 2026-04-25  
**Status:** Decided & Implemented

---

## Decision

On incident creation, ACIS auto-generates a structured NIST SP 800-61 Rev 2 incident response playbook via Claude. The playbook is stored as JSON in the `incidents.playbook` column and rendered in the Executive Hub as a full-detail compliance view.

A separate `POST /api/incidents/:id/playbook` endpoint allows on-demand regeneration for existing records.

---

## Context

ADR 008 identified the incident playbook generator as the next build priority after the regulatory scraper. The business case: a compliance administrator opening an incident in a real system should not have to look up the NIST framework and HIPAA Breach Notification Rule from scratch — the system should produce that scaffold instantly and accurately.

The key design questions were:

1. **When to generate** — synchronously on POST (blocking the response) vs. asynchronously (return the ID immediately, generate in background)
2. **What structure** — free-form narrative vs. strict JSON schema
3. **Whose framework** — NIST 800-61 only, or also ISO 27035, SANS, etc.

---

## Decision Details

### Synchronous generation, await in POST handler

The POST handler awaits `generatePlaybook()` before returning. This means the `201` response is delayed by ~2–4 seconds while Claude generates, but the incident record is complete the moment it's created — no polling, no webhooks, no eventual consistency.

For a compliance demo, synchronous is correct: the hiring manager sees a fully populated record immediately after opening an incident. Async would require the UI to poll and show a "generating…" state, which adds complexity and obscures the AI capability.

If volume scaled to hundreds of incidents per minute this would need to become a queue-backed background job, but that's not the scenario this system is built for.

### Strict JSON schema returned by Claude

The `IncidentPlaybook` interface enforces:

```typescript
{
  incident_class: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  hipaa_reportable: boolean;
  notification_deadline: string | null;  // 60-day OCR deadline if reportable
  phases: {
    detection: string;
    containment: string;
    eradication: string;
    recovery: string;
    post_incident: string;
  };
  hipaa_obligations: string;
  regulatory_citations: string[];
  escalation_contacts: string[];
}
```

A schema-first approach rather than narrative output means the frontend can render each phase with semantic color-coding (cyan for detection, amber for containment, orange for eradication, etc.) and surface HIPAA reportability as a distinct badge — not just buried in text.

The `PlaybookView` component in `IncidentTracker.tsx` renders this structure with HIPAA reportable/not-reportable badges, an OCR deadline callout, phase-by-phase guidance columns, regulatory citations, and escalation contact list.

### NIST 800-61 + HIPAA Breach Notification Rule only

The system prompt grounds Claude in two specific frameworks:
- **NIST SP 800-61 Rev 2** — the federal standard for incident response phases
- **45 CFR Parts 160 and 164** — HIPAA Security Rule and Breach Notification Rule

This is deliberate scope. Adding ISO 27035 or SANS would dilute the HIPAA specificity that makes ACIS credible as a healthcare compliance tool. A hiring manager at BRMS (health insurance administrator) expects to see CFR citations, not generic security framework references.

---

## Tested Result

PHI Data Exposure incident (847 members, 72-hour exposure window):

- Severity: **High**
- HIPAA Reportable: **true**
- OCR Notification Deadline: 60 days from creation
- Citations: `45 CFR § 164.312(a)(1)`, `45 CFR § 164.404`, `NIST SP 800-61 Rev 2 §3.2`
- Escalation: Privacy Officer, CISO, Legal Counsel, Affected Individual Notification Team

---

## Alternatives Considered

**Async via Cloudflare Queue** — cleaner at scale, but adds a Queue binding, a consumer Worker, and a polling loop in the frontend. Unnecessary complexity for this use case.

**Durable Object for stateful generation** — would allow streaming the playbook token-by-token. Impressive, but the schema-based output needs to be complete before it can be parsed and stored — streaming doesn't help here.

**Pre-canned playbooks per incident type** — lookup table of static NIST playbook templates. Zero AI cost, but defeats the entire purpose: the demo needs to show Claude reasoning about the specific incident description, not returning a canned template.
