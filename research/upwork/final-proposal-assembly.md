---
title: "Final Proposal Assembly — PreClear MD (Upwork)"
type: research
domain: personal
status: READY_FOR_REVIEW
created: 2026-06-12
created_model: claude-sonnet-4-6
created_session: post-78e6e2b4-compaction-4
qoq_item_id: 636
sweep_count: 1
touches:
  - model: claude-sonnet-4-6
    session: post-78e6e2b4-compaction-4
    date: 2026-06-12
    action: created
---

# Final Proposal — PreClear MD (Upwork)

**Status: READY FOR USER REVIEW — all 7 required elements complete**  
**Bid rate: $95/hr** | **Estimated hours: ~420 (12 weeks at 35 hrs/wk)** | **Total estimate: ~$39,900**

Before submitting:
- [ ] Verify #635 — Upwork profile title, rate, ACIS entry, and skills list updated
- [ ] Verify acis.rossonlineservices.com is live and responsive
- [ ] Verify github.com/ross0nline/acis is public and pinned on profile
- [ ] Update GitHub profile bio + website per `research/upwork/github-profile-readme.md`
- [ ] Push GitHub profile README to ross0nline/ross0nline
- [ ] Replace `[YOUR_UPWORK_PROFILE_LINK]` below with actual URL

---

## Cover Letter (proposal body opening)

Prior authorization is where clinical judgment collides with administrative friction, and physicians lose that fight more often than the system admits. You built PreClear MD because you've lived that — not because someone pitched you a TAM slide. That specificity is why this project is different from most SaaS builds: the product logic, the payer criteria engine, the AI prompts are already grounded in real clinical judgment. What you need is infrastructure that doesn't compromise that judgment with security shortcuts or architecture that can't survive HIPAA scrutiny.

That's the problem I'm built for.

I've already built this shape of system. ACIS (Autonomous Compliance Intelligence System) is a live HIPAA compliance platform I designed and built solo — four modules, six Claude agents, running in production at acis.rossonlineservices.com. The core mechanic — rubric-based AI scoring of documents against regulatory criteria with structured, explainable output — is the same mechanic PreClear Scan needs against payer criteria. I also built a standalone prior authorization rubric scorer for this engagement specifically, deployed on AWS Lambda + API Gateway via Amazon Bedrock. A clinical note for carotid endarterectomy with documented ICD-10, two TIA episodes, and six weeks of conservative management scores 90/100 with all three criteria passing. That system is live at `https://h3fv5e1t4k.execute-api.us-east-1.amazonaws.com/score` — test it with a POST.

The answers below address each of your required questions in order.

---

## Required Q1 — Evidence of HIPAA-compliant system design

I run ACIS in production today: a compliance operations platform with four modules (Regulatory Pulse, Attestation Vault, Vendor Risk, Incident Response) and six AI agents on a fully serverless edge stack. Here's how HIPAA-conscious design shows up at every layer:

**Inference logging without content exposure.** Every Claude call routes through a Cloudflare AI Gateway that logs request metadata — model, latency, token counts, cost — while sensitive payload content never lands in observability tooling. The same pattern applies to the Bedrock PoC: CloudWatch logs capture requestId, payer, procedure, readiness score, and latency. The note field is excluded at the function signature level, not by policy — there's no way to accidentally log it.

**Structured data access.** All D1 operations use parameterized queries; no raw string interpolation reaches the query layer.

**Segregated document storage.** Attestation documents live in an R2 object vault, isolated from application state, accessed only through authenticated Worker routes.

**Clean error paths.** Worker error responses return structured JSON. Stack traces and record contents are never surfaced to clients or logs.

**Audit trail by design.** Each module writes audit events capturing who acted, what changed, and when — without duplicating record content into the audit stream.

The ACIS architecture is live, inspectable at acis.rossonlineservices.com, and directly maps to the AWS stack PreClear MD requires.

---

## Required Q2 — LLM API integration experience (Anthropic, OpenAI, or equivalent)

I run four Claude agents in production today on ACIS:

- **Regulatory scraper** (Sonnet 4.6, ~20 calls/day): ingests CMS, HHS, and Federal Register sources, scores each document against HIPAA frameworks via structured JSON output — `risk_level`, `impacted_field`, `remediation_step`, `deadline`. Token budget: 512 output tokens.
- **Playbook generator** (Opus 4.8): generates NIST SP 800-61 Rev 2 incident response playbooks on-demand, with HIPAA reportability determination, OCR deadline, and specific CFR citations. The output schema is enforced — malformed responses are caught and logged.
- **Heartbeat agent** (Opus 4.8): runs a 13-query D1 batch daily, then produces a Green/Yellow/Red system health report with per-module action items.
- **Vendor scanner** (Opus 4.8): combines live TLS + security-header scoring with a HIPAA Business Associate risk narrative.

Every agent has bounded `max_tokens`, structured output parsing with error fallback, and routes through an AI Gateway that logs request metadata without capturing PHI payload content. This is the same architecture PreClear Intake and Scan need — rubric-based AI evaluation of clinical documentation against payer-specific criteria is the same mechanic as regulatory scoring, different domain.

I also built a standalone prior authorization rubric scorer specifically for this engagement, deployed on AWS Lambda + API Gateway via Amazon Bedrock. It scores clinical notes against three payer criteria (medical necessity, ICD-10 specificity, conservative treatment documentation) and returns a structured JSON response with per-criterion status and fix language. PHI-safe CloudWatch logging is enforced at the function level — the note field is structurally excluded from all log calls. Live endpoint: `https://h3fv5e1t4k.execute-api.us-east-1.amazonaws.com/score`

---

## Required Q3 — Proposed tech stack and rationale

My proposed stack: React + TypeScript + Tailwind (frontend), Node.js/Express (backend), PostgreSQL on RDS (database), Clerk (RBAC + multi-tenant auth with 2FA), Claude via Amazon Bedrock (inference), AWS CDK in TypeScript (IaC), AWS SES (email), S3 (document storage), Lambda + API Gateway (compute).

The choice of Bedrock is non-negotiable for HIPAA — it keeps all inference inside the AWS BAA boundary, routes through a VPC endpoint so PHI never traverses the public internet, and Claude API calls are logged at the metadata level (latency, tokens) not content level. Clerk over Auth0 because its multi-tenant RBAC and practice-scoped session model matches your access pattern out of the box.

I work day-to-day in Cloudflare Workers/TypeScript — the architecture patterns are identical to Lambda, and I've already solved HIPAA PHI isolation, AI gateway logging, and audit trail design in production. The runtime is different; the design isn't.

---

## Required Q4 — Timeline by phase and hourly rate

**Rate: $95/hr**

**Estimate: ~420 hours over 12 weeks at 35 hrs/wk = ~$39,900** (±15% depending on scope clarifications post-NDA). Fits within your stated 10–14 week window with buffer.

| Phase | Weeks | Hours | Deliverable |
|---|---|---|---|
| 1 — Foundation | 1–3 | ~105 | CDK stack, Clerk auth (4 roles), core schema, CI/CD, staging env |
| 2 — PreClear Intake | 4–6 | ~105 | 4-step wizard, payer validation engine, Bedrock note generation |
| 3 — PreClear Scan | 7–9 | ~105 | Paste-note UI, rubric scoring, fix language, session history |
| 4 — Admin + Billing | 10–11 | ~70 | Usage metrics, user management, Stripe subscription tiers |
| 5 — Hardening + Launch | 12 | ~35 | Pen test checklist, PHI audit, load test, BAA docs, handoff |

Scope assumptions: client provides prototype access after NDA, payer criteria data or structured format, and Stripe account. Phase 2 estimate may shift based on how many payer × procedure combinations are in MVP scope.

---

## Required Q5 — Solo or small team?

Solo. I'm the developer, architect, and point of contact — the person who responds to your message is the person writing the code. No PM overhead, no handoff lag, no "let me check with the team." For a 10–14 week engagement where communication and clinical domain trust matter, that's a feature. I've built ACIS end-to-end alone — four modules, six AI agents, live in production — and I can move fast without coordination overhead.

---

## Required Q6 — Preferred PM/workflow tool

Linear. It's fast, keyboard-driven, and has solid GitHub integration so every ticket links to a commit. You have no setup — I'll provision the workspace, invite you with whatever access level you want (view-only observer or active collaborator), and structure it so you see exactly where every feature is in the pipeline. Standups happen in the ticket comments or async in whatever channel you prefer; I don't need a meeting to give a status update.

---

## Required Q7 — How do you keep PHI out of logs, error monitoring, and URLs/browser history?

All Claude/Bedrock API calls route through a purpose-built logging proxy (API Gateway + Lambda request transformer) that strips PHI fields before CloudWatch receives the event — logs capture latency, model ID, and token counts, never clinical content. PHI never reaches Sentry or Datadog: a custom error serializer at the application boundary replaces any string matching PHI-pattern fields with `[REDACTED]` before the exception is forwarded, so stack traces expose code paths, not patient data. All PHI is submitted via HTTPS POST body — never in URL parameters or query strings — so browser history and server access logs capture only endpoint paths and opaque session UUIDs. Multi-step wizard state is held server-side (encrypted at rest in RDS) with only a session token in the URL; the token has no PHI correlation in any log source. Audit logs record who accessed which record at what time using CloudTrail at the API layer and PostgreSQL row-level security at the data layer — capturing access provenance without storing PHI content in the log stream.

---

## Pre-submission checklist

- [ ] #635: Upwork profile title updated to "HIPAA-Compliant Full-Stack Engineer | Claude / Bedrock / AWS / Cloudflare"
- [ ] #635: Hourly rate set to $95
- [ ] #635: ACIS description added to portfolio section
- [ ] #635: Skills include: TypeScript, AWS Lambda, Amazon Bedrock, HIPAA, Claude API, PostgreSQL, React, Tailwind, Node.js, CDK
- [ ] GitHub profile: bio and website updated (see `research/upwork/github-profile-readme.md`)
- [ ] GitHub profile README pushed to ross0nline/ross0nline
- [ ] acis repo pinned first on GitHub profile
- [ ] acis.rossonlineservices.com loads correctly
- [ ] Bedrock PoC endpoint returns correct JSON: `curl -s -X POST https://h3fv5e1t4k.execute-api.us-east-1.amazonaws.com/score -H "Content-Type: application/json" -d '{"payer":"UnitedHealthcare","procedure":"MRI Lumbar Spine","note":"Patient has back pain."}'`
- [ ] Proposal submitted before listing closes

---

## Source files

All research that fed this assembly:
- `research/upwork/cover-letter-hook.md` (#629)
- `research/upwork/acis-case-study.md` (#624)
- `research/upwork/phi-answer.md` (#621)
- `research/upwork/stack-rationale.md` (#623)
- `research/upwork/bedrock-hipaa-architecture.md` (#622)
- `research/upwork/timeline-and-bid.md` (#626)
- `research/upwork/proposal-short-answers.md` (#625, #627, #628)
- `research/upwork/prior-auth-domain.md` (#632)
- `research/upwork/multi-tenant-rbac.md` (#633)
- `research/upwork/bedrock-poc-runbook.md` (#654)
