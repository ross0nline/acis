---
title: "Proposal Short Answers — Q2, Q5, Q6"
type: research
domain: personal
status: DRAFT
created: 2026-06-12
created_model: claude-sonnet-4-6
qoq_item_id: 625
---

# Short Required Answers

---

## Q2 — LLM API integration experience (Anthropic, OpenAI, or equivalent)

> I run four Claude agents in production today on ACIS (acis.rossonlineservices.com):
>
> - **Regulatory scraper** (Sonnet 4.6, ~20 calls/day): ingests CMS, HHS, and Federal Register sources, scores each document against HIPAA frameworks via structured JSON output — `risk_level`, `impacted_field`, `remediation_step`, `deadline`. Token budget: 512 output tokens.
> - **Playbook generator** (Opus 4.8): generates NIST SP 800-61 Rev 2 incident response playbooks on-demand, with HIPAA reportability determination, OCR deadline, and specific CFR citations. The output schema is enforced — malformed responses are caught and logged.
> - **Heartbeat agent** (Opus 4.8): runs a 13-query D1 batch daily, then produces a Green/Yellow/Red system health report with per-module action items.
> - **Vendor scanner** (Opus 4.8): combines live TLS + security-header scoring with a HIPAA Business Associate risk narrative.
>
> Every agent has bounded `max_tokens`, structured output parsing with error fallback, and routes through an AI Gateway that logs request metadata without capturing PHI payload content. This is the same architecture PreClear Intake and Scan need — rubric-based AI evaluation of clinical documentation against payer-specific criteria is the same mechanic as regulatory scoring, different domain.
>
> I also built a standalone prior authorization rubric scorer specifically for this engagement, deployed on AWS Lambda + API Gateway via Amazon Bedrock. It scores clinical notes against three payer criteria (medical necessity, ICD-10 specificity, conservative treatment documentation) and returns a structured JSON response with per-criterion status and fix language. PHI-safe CloudWatch logging is enforced at the function level — the note field is structurally excluded from all log calls. Live endpoint: `https://h3fv5e1t4k.execute-api.us-east-1.amazonaws.com/score`

---

## Q5 — Solo or small team?

> Solo. I'm the developer, architect, and point of contact — the person who responds to your message is the person writing the code. No PM overhead, no handoff lag, no "let me check with the team." For a 10–14 week engagement where communication and clinical domain trust matter, that's a feature. I've built ACIS end-to-end alone — four modules, six AI agents, live in production — and I can move fast without coordination overhead.

---

## Q6 — Preferred PM/workflow tool

> Linear. It's fast, keyboard-driven, and has solid GitHub integration so every ticket links to a commit. You have no setup — I'll provision the workspace, invite you with whatever access level you want (view-only observer or active collaborator), and structure it so you see exactly where every feature is in the pipeline. Standups happen in the ticket comments or async in whatever channel you prefer; I don't need a meeting to give a status update.
