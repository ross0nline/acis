---
title: "GitHub Profile README — ross0nline"
type: research
domain: personal
status: DRAFT
created: 2026-06-12
created_model: claude-sonnet-4-6
created_session: post-78e6e2b4-compaction-4
qoq_item_id: 649
sweep_count: 1
touches:
  - model: claude-sonnet-4-6
    session: post-78e6e2b4-compaction-4
    date: 2026-06-12
    action: created
---

# GitHub Profile README — Draft

This file contains the README.md content for the `ross0nline/ross0nline` repo (GitHub profile README).

To deploy: create or update `ross0nline/ross0nline/README.md` with the content below.

Profile settings to update (`github.com/settings/profile`):
- **Bio:** Full-stack engineer specializing in HIPAA-compliant AI systems | Cloudflare Workers + Claude + AWS Bedrock
- **Website:** https://acis.rossonlineservices.com
- **Company:** (leave blank or "Solo / Consulting")
- **Pinned repos:** Pin `acis` first, then any others visible in the profile

---

## README.md content (paste into ross0nline/ross0nline/README.md)

```markdown
## Hey, I'm Ross

Full-stack engineer focused on HIPAA-compliant AI systems — the kind of problems where "move fast" and "don't expose PHI" have to coexist.

### What I'm building

**ACIS — Autonomous Compliance Intelligence System** ([live at acis.rossonlineservices.com](https://acis.rossonlineservices.com))  
A production compliance operations platform: regulatory change monitoring, attestation tracking, vendor risk scoring, and AI-generated incident playbooks. Four modules, six Claude agents, daily cron jobs, edge-native on Cloudflare Workers + D1.

**Bedrock Prior Auth Scorer** (private PoC)  
AWS Lambda + API Gateway + Amazon Bedrock — scores clinical notes against payer-specific prior authorization rubrics. PHI-safe CloudWatch logging enforced structurally (note field excluded at the function signature level, not by policy). Live endpoint currently running `amazon.nova-pro-v1:0`; migrates to `anthropic.claude-opus-4-8` when Bedrock enrollment clears.

### Stack I reach for

- **Edge compute:** Cloudflare Workers (TypeScript), CDK, Lambda
- **AI:** Claude (Anthropic API + Bedrock), structured output, agent orchestration
- **Storage:** D1 (SQLite at edge), R2, DynamoDB, Postgres (RLS-based multi-tenant isolation)
- **Compliance:** HIPAA, NIST SP 800-61, RxDC, Gag Clause (33 CFR § 201)
- **Infrastructure:** Wrangler, CDK, GitHub Actions

### In production today

| System | What it does |
|---|---|
| Regulatory Pulse | 5-source scraper (Federal Register, Regulations.gov, Firecrawl) → Claude sonnet-4-6 scoring |
| Attestation Vault | RxDC + Gag Clause lifecycle management with daily email reminders |
| Vendor Risk | Live TLS + header scoring → claude-opus-4-8 HIPAA narrative |
| Incident Response | NIST 800-61 playbooks auto-generated on incident creation |
| Heartbeat Agent | Daily self-audit across all four modules → Green/Yellow/Red |
| GitHub PR Automation | High-risk regulatory events (≥8/10) → auto-PR in compliance repo |
```

---

## Notes on what to pin

Repos to pin on the profile (in order):
1. `ross0nline/acis` — the compliance platform (if public, or make public before submitting proposal)
2. Any other repos that show production-quality work

Note: acis repo is currently public at github.com/ross0nline/acis — verify this before submitting the proposal.
