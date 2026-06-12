---
title: "PHI Out-of-Logs Answer — PreClear MD Proposal (Required Q7)"
type: research
domain: personal
status: DRAFT
created: 2026-06-12
created_model: claude-sonnet-4-6
qoq_item_id: 621
created_session: post-78e6e2b4-compaction-3
sweep_count: 1
touches:
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-3, date: 2026-06-12, action: created }
---

# Required Q7 — How do you keep PHI out of application logs, error monitoring, and URLs/browser history?

## Proposal-ready answer (3–5 sentences)

All Claude/Bedrock API calls route through a purpose-built logging proxy (API Gateway + Lambda request transformer) that strips PHI fields before CloudWatch receives the event — logs capture latency, model ID, and token counts, never clinical content. PHI never reaches Sentry or Datadog: a custom error serializer at the application boundary replaces any string matching PHI-pattern fields with `[REDACTED]` before the exception is forwarded, so stack traces expose code paths, not patient data. All PHI is submitted via HTTPS POST body — never in URL parameters or query strings — so browser history and server access logs capture only endpoint paths and opaque session UUIDs. Multi-step wizard state is held server-side (encrypted at rest in RDS) with only a session token in the URL; the token has no PHI correlation in any log source. Audit logs record who accessed which record at what time using CloudTrail at the API layer and PostgreSQL row-level security at the data layer — capturing access provenance without storing PHI content in the log stream.

---

## Notes

- This is the gatekeeper question — proposals that skip it are not reviewed
- Drawn from ACIS patterns translated to AWS/Bedrock equivalents:
  - AI Gateway (Cloudflare) → API Gateway + Lambda transformer (AWS)
  - D1 parameterized queries → PostgreSQL prepared statements
  - Worker structured error responses → Lambda error serializer
  - D1 audit events (who/what/when) → CloudTrail + RDS row-level audit
- The answer covers all three surfaces the client called out: logs, error monitoring (Sentry/Datadog), URLs/browser history
- Audit logging section is a bonus signal — demonstrates HIPAA audit control awareness beyond what was asked
