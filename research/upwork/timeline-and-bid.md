---
title: "Timeline by Phase + Bid Calculation"
type: research
domain: personal
status: DRAFT
created: 2026-06-12
created_model: claude-sonnet-4-6
qoq_item_id: 626
created_session: post-78e6e2b4-compaction-3
sweep_count: 1
---

# Timeline by Phase + Bid (Required Q4)

## Rate positioning

Bid range: $75–$125/hr. The field is competitive (50+ proposals, avg $48). Do not bid at the average — that's the commodity band. The ACIS portfolio + HIPAA depth justifies the upper half of their stated range.

**Recommended rate: $95/hr**

Rationale: Positions above the $48 average without hitting the $125 ceiling. Signals seniority without over-indexing on the rate. A surgeon hiring for a medical platform expects to pay for domain-competent work; $95 reads as serious without scaring off a bootstrapped founder.

---

## Phase breakdown (12-week estimate)

The client said 10–14 weeks. 12 weeks at 35 hrs/week = 420 hours = **~$39,900 at $95/hr**.

At 30 hrs/week: 360 hours = ~$34,200. At 40 hrs/week: 480 hours = ~$45,600.

Present the midpoint ($39,900) as the estimate with a ±15% band depending on scope clarifications after NDA + prototype review.

### Phase 1 — Foundation (Weeks 1–3) ~105 hrs
- AWS account setup + CDK scaffolding (VPC, subnets, NAT gateway, Bedrock VPC endpoint, RDS PostgreSQL, S3, KMS keys, CloudTrail)
- Clerk multi-tenant auth: Practice Admin, Provider, MA, Insurance Specialist roles; practice onboarding; 2FA
- Core data model: practices, users, plans, sessions, audit_log
- CI/CD pipeline (GitHub Actions → ECR → Lambda/ECS)
- Local dev environment + staging environment parity
- **Deliverable:** Authenticated shell app, all roles functional, infrastructure deployed

### Phase 2 — PreClear Intake Module (Weeks 4–6) ~105 hrs
- 4-step form wizard (MA Intake + Full Note modes)
- Payer-specific validation engine (payer × procedure × criteria)
- Bedrock/Claude integration: payer-specific system prompts, structured note generation
- Copy-to-clipboard + session history
- PHI boundaries: POST-only, no PHI in URLs, no raw logging
- **Deliverable:** Intake module end-to-end, payer validation live, notes generating

### Phase 3 — PreClear Scan Module (Weeks 7–9) ~105 hrs
- Paste-note interface + payer/procedure selector
- Claude rubric scoring: Pass/Partial/Fail per criterion
- Fix language generation, readiness score calculation
- Session history + export
- **Deliverable:** Scan module end-to-end, scoring output matches prototype

### Phase 4 — Admin Dashboard + Billing (Weeks 10–11) ~70 hrs
- Per-practice usage metrics (API calls, notes generated, scan sessions)
- User management (CRUD within practice scope)
- Stripe subscription integration: Intake only / Scan only / Full Suite tiers
- Subscription status + upgrade/downgrade flows
- **Deliverable:** Admin dashboard live, billing functional in test mode

### Phase 5 — Hardening + Launch (Week 12) ~35 hrs
- Penetration testing checklist (OWASP Top 10 review)
- PHI audit: scan all logs/error paths for accidental exposure
- Load test (concurrent practice sessions)
- BAA documentation + AWS Artifact BAA self-service
- Staging → production cutover
- Handoff documentation
- **Deliverable:** Production-ready system, BAA in place, documentation complete

---

## Scope assumptions (flag in proposal)

- Client provides: access to working prototypes (post-NDA), payer criteria data or existing structured format, Stripe account
- Phase durations may shift after prototype review — I'll refine the estimate after the NDA call
- Phase 2 validation engine complexity depends on how many payers + procedures are in scope for MVP
- Admin dashboard metrics are read-only aggregates — no real-time streaming unless scoped separately

---

## Proposal answer (Q4 — condensed)

> **Rate: $95/hr. Estimated: 12 weeks × 35 hrs/week = ~$39,900 (±15% pending prototype review).**
>
> Phase 1 (Weeks 1–3): AWS infrastructure + CDK, Clerk multi-tenant RBAC, core schema, CI/CD.
> Phase 2 (Weeks 4–6): PreClear Intake — form wizard, payer validation engine, Bedrock note generation.
> Phase 3 (Weeks 7–9): PreClear Scan — paste interface, Claude rubric scoring, fix language, readiness score.
> Phase 4 (Weeks 10–11): Admin dashboard, usage metrics, Stripe subscription tiers.
> Phase 5 (Week 12): Security hardening, PHI audit, BAA documentation, production cutover.
>
> Happy to refine phase estimates after the NDA call and prototype review — the validation engine and payer criteria complexity are the main unknowns right now.

<!-- dna-touches
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-3, date: 2026-06-12, action: created }
-->