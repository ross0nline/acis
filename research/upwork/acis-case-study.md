---
title: "ACIS Case Study — PreClear MD Proposal"
type: research
domain: personal
status: DRAFT
created: 2026-06-12
created_model: claude-sonnet-4-6
qoq_item_id: 624
created_session: post-78e6e2b4-compaction-3
sweep_count: 1
touches:
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-3, date: 2026-06-12, action: created }
---

# ACIS: A Live HIPAA Compliance Platform with Production LLM Orchestration

ACIS (Autonomous Compliance Intelligence System) is a HIPAA compliance operations platform I designed, built, and operate solo — live today at https://acis.rossonlineservices.com, running four compliance modules and six AI agents on a fully serverless edge stack.

## HIPAA-Conscious Architecture

ACIS handles regulated compliance data the way PHI must be handled: with deliberate boundaries at every layer.

- **Inference logging without content exposure.** Every Claude call routes through a Cloudflare AI Gateway (`acis-gateway`), which logs request metadata — model, latency, token counts, cost — while sensitive payload content never lands in observability tooling.
- **Structured data access.** All database operations use parameterized D1 (edge SQLite) queries. No raw string interpolation reaches the query layer.
- **Segregated document storage.** Attestation documents live in an R2 object vault, isolated from application state and accessed only through authenticated Worker routes.
- **Clean error paths.** Worker error responses return structured JSON; stack traces and record contents are never surfaced to clients or logs.
- **Audit trail by design.** Each module writes audit events to D1 capturing who acted, what changed, and when — without duplicating record content into the audit stream.

## LLM Integration in Production — Not a Demo

Four Claude agents run in production, each scoped to a task-appropriate model:

- **Regulatory scraper** (Sonnet 4.6) — ingests CMS, HHS, and Federal Register sources daily via cron, then scores each document against HIPAA frameworks, returning structured risk level, impacted field, remediation step, and deadline.
- **Heartbeat agent** (Opus 4.8) — runs a 13-metric D1 batch across all modules daily and produces a Green/Yellow/Red health report with per-module action items.
- **Playbook generator** (Opus 4.8) — generates NIST SP 800-61 Rev 2 incident response playbooks on incident creation, including HIPAA reportability determination, OCR deadline, and CFR citations.
- **Vendor scanner** (Opus 4.8) — combines live TLS and security-header scoring with an AI-written HIPAA Business Associate risk assessment.

Every agent has bounded token budgets, malformed-output handling, and idempotent cron logic. High-risk findings (score ≥ 8) automatically open GitHub pull requests for remediation tracking.

## Designed and Built the UI Too

The ACIS Executive Hub is a five-tab React + Tailwind dashboard — Live Pulse, Attestation Vault, Vendor Risk, Incident Response, and Operations — solo-designed and solo-built, deployed on Cloudflare Pages, and consuming the Worker API in production.

## Why This Maps to PreClear MD

The scraper's core mechanic — rubric-based AI scoring of documents against regulatory criteria with structured, explainable output — is the same mechanic PreClear Scan needs against payer criteria. And ACIS's multi-agent pipeline with per-module isolation, shared audit infrastructure, and gateway-logged inference is the same architecture pattern a multi-module healthcare SaaS requires. I've already built this shape of system, end to end, and it's running right now.
