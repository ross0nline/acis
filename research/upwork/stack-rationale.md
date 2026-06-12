---
title: "Stack Decision + Cloudflare→AWS Translation Rationale"
type: research
domain: personal
status: DRAFT
created: 2026-06-12
created_model: claude-sonnet-4-6
qoq_item_id: 623
---

# Stack Decision — PreClear MD Proposal (Required Q3)

## Committed stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React + TypeScript + Tailwind | Already production-built (ACIS Executive Hub). Clean component library approach, responsive by default. |
| Backend | Node.js + Express (TypeScript) | TypeScript is native — same language as ACIS Worker logic. Express is standard and readable for a client reviewing the code. |
| Database | PostgreSQL on RDS | Row-level security for multi-tenant PHI isolation. HIPAA-eligible. Proper relational constraints for RBAC. D1 is SQLite — not the right choice at SaaS scale. |
| Auth | Clerk | HIPAA-eligible, built-in multi-tenant RBAC, practice onboarding flows, 2FA included. Better DX than Auth0 for this use case; pricing is predictable for a per-practice billing model. |
| AI | Claude via Amazon Bedrock (us-east-1) | Client requirement. HIPAA BAA with AWS covers Bedrock. All inference stays inside the AWS trust boundary. No direct Anthropic API calls. |
| IaC | AWS CDK (TypeScript) | TypeScript developer writing TypeScript infrastructure — same language, same toolchain, no context switch. CDK generates CloudFormation; client gets portable infrastructure artifacts. |
| Email | AWS SES | Client listed it as preferred. Integrates naturally with the AWS stack; no third-party dependency. |
| Storage | S3 (encrypted, private) | Document vault for any clinical notes or session exports. Server-side encryption, bucket policies, no public access. |
| Compute | Lambda + API Gateway | Maps directly to Cloudflare Workers conceptually — stateless, event-driven, scales to zero. Appropriate for a 10-14 week MVP where traffic is unpredictable. ECS Fargate is an upgrade path if warm-start latency matters at scale. |
| Billing | Stripe | Already integrated in ACIS. Subscription tiers (Intake only / Scan only / Full Suite) map cleanly to Stripe Products + Prices. |
| PM | Linear | Fast, keyboard-driven, good GitHub integration. Client has no setup — I'll provision the workspace and invite them. |

---

## Cloudflare → AWS translation

The architecture patterns in ACIS are direct analogues to the AWS stack. The runtime changes; the design doesn't.

| ACIS (Cloudflare) | PreClear MD (AWS) | Notes |
|---|---|---|
| Workers (TypeScript) | Lambda + API Gateway | Same model: stateless request handler, TypeScript, JSON in/out |
| D1 (edge SQLite) | RDS PostgreSQL | Scale-up: proper multi-tenant isolation with RLS, foreign keys, migrations via Flyway/Knex |
| R2 (object storage) | S3 | Same semantics: authenticated presigned URLs, server-side encryption |
| Pages (static hosting) | CloudFront + S3 | Same model: build artifact → CDN edge |
| AI Gateway (inference proxy) | API Gateway + Lambda transformer | Same function: strip PHI before CloudWatch receives the log event |
| Service Bindings (inter-Worker) | VPC + internal ALB or Lambda invocation | Same pattern: service-to-service calls inside a trust boundary |
| Wrangler (deploy CLI) | AWS CDK (TypeScript IaC) | Both are code-defined infrastructure; CDK generates CF templates |

The migration surface is narrower than it looks. Every pattern I've already solved in ACIS has a named AWS equivalent. The differences are operational (IAM roles instead of Cloudflare token scopes, VPC networking instead of zero-config edge routing) not architectural.

---

## Honest gaps and how I address them

**PostgreSQL hands-on depth** — D1 is SQLite. Row-level security, multi-tenant partitioning, and connection pooling (pgBouncer/RDS Proxy) are AWS/Postgres-specific. I'm fluent in SQL and relational design; the RLS implementation is learnable and well-documented. The schema design work is identical.

**Terraform/CDK production experience** — ACIS infrastructure is Wrangler-managed (Cloudflare's equivalent). AWS CDK with TypeScript is a natural extension — same language, declarative resource definitions, same "infrastructure as code" discipline. I'll provision the dev environment infrastructure as part of week 1 setup, not week 10.

**Auth0/Clerk integration** — Haven't shipped Auth0 in production. Clerk is the better choice for this use case anyway (see above), and it has the most straightforward RBAC + multi-tenant API of any auth provider right now.

---

## Why not Cloudflare for this engagement

The client has made a deliberate, well-reasoned decision: AWS Bedrock because the AWS Healthcare BAA explicitly covers Claude as a sub-processor. The Cloudflare AI Gateway also proxies Anthropic, but the legal path to a HIPAA BAA is more established on AWS. This is the right call for a medical SaaS going to market. I'm not proposing to change it.

---

## Proposal answer (Q3 — ~150 words)

> My proposed stack: React + TypeScript + Tailwind (frontend), Node.js/Express (backend), PostgreSQL on RDS (database), Clerk (RBAC + multi-tenant auth with 2FA), Claude via Amazon Bedrock (inference), AWS CDK in TypeScript (IaC), AWS SES (email), S3 (document storage), Lambda + API Gateway (compute).
>
> The choice of Bedrock is non-negotiable for HIPAA — it keeps all inference inside the AWS BAA boundary, routes through a VPC endpoint so PHI never traverses the public internet, and Claude API calls are logged at the metadata level (latency, tokens) not content level. Clerk over Auth0 because its multi-tenant RBAC and practice-scoped session model matches your access pattern out of the box.
>
> I work day-to-day in Cloudflare Workers/TypeScript — the architecture patterns are identical to Lambda, and I've already solved HIPAA PHI isolation, AI gateway logging, and audit trail design in production. The runtime is different; the design isn't.
