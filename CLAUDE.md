# CompSec Architect — Claude Code Project Instructions

## Role & Mission

This project builds ACIS (Autonomous Compliance Intelligence System) — a production-deployed, serverless compliance operations platform targeting the **Security Compliance Administrator II** role at BRMS (William Hardison, Director of IT). The system is live at **https://acis.rossonlineservices.com**.

## Job Requirement Alignment

| Requirement | Priority |
|---|---|
| HIPAA compliance — RxDC, Gag Clause, CMS | MANDATORY |
| Regulatory change monitoring | Core |
| Incident response documentation & reporting | Core |
| Remediation tracking | Core |
| Vendor management | Core |
| Executive reporting | Core |
| Frameworks: NIST, ISO 27001, SOC 2, PCI-DSS, SOX | Supporting |

## Technical Stack

- **Compute:** Cloudflare Workers (TypeScript via Wrangler) — `acis` worker at `acis.rossonlineservices.workers.dev`
- **Frontend:** Cloudflare Pages — React + Tailwind, deployed as `acis-executive-hub`
- **Database:** Cloudflare D1 — `acis-db` (SQLite at the edge)
- **File Storage:** Cloudflare R2 — `acis-vault`
- **AI:** Anthropic Claude — `claude-opus-4-7` (vendor scanner, heartbeat, playbook); `claude-sonnet-4-6` (regulatory scraper)
- **AI Observability:** Cloudflare AI Gateway (`acis-gateway`) — all inference logged; visible in Operations tab
- **Scraping:** Firecrawl API — bypasses CMS/HHS bot protection
- **Regulatory Data:** Federal Register API, Regulations.gov API
- **Email:** Resend API (ADR 015) — key in `.dev.vars`; `RESEND_API_KEY` Worker secret not yet set
- **Portfolio Admin:** CCC Admin — separate Worker + D1, connected via Cloudflare Service Binding
- **CI/CD:** GitHub → Wrangler deploy (manual; `acis-deploy` script handles full deploy sequence)

## Current System State (Updated: 2026-04-25)

All four compliance modules and all five AI agents are live. The original 4-project structure merged into a single integrated system — ACIS — with modules as sub-systems of one Worker.

| Module / Agent | Status | Notes |
|---|---|---|
| Regulatory Pulse | **Live** | 5-source scraper, Claude sonnet-4-6 scoring, 64 events, daily 08:00 UTC cron |
| Attestation Vault | **Live** | RxDC + Gag Clause lifecycle, 8 client plans |
| Vendor Risk | **Live** | Real TLS + 6-header scoring, claude-opus-4-7 HIPAA assessment, 6 vendors |
| Incident Response | **Live** | NIST 800-61 playbooks auto-generated on creation, claude-opus-4-7 |
| Heartbeat Agent | **Live** | Daily self-audit (13-query D1 batch), Green/Yellow/Red, reports to CCC Admin |
| Executive Hub | **Live** | 5 tabs: Live Pulse, Attestation, Vendor Risk, Incidents, Operations |
| Operations Tab | **Live** | System Health first, Agent Logs (AI Gateway streaming), Admin Controls collapsed |
| Agent Logs | **Live** | CF_API_TOKEN set — `ccc-admin-regenerated` token with AI Gateway:Edit |

## Active Worker Secrets

| Secret | Status |
|---|---|
| `ANTHROPIC_API_KEY` | ✅ Set |
| `CF_API_TOKEN` | ✅ Set |
| `ADMIN_TOKEN` | ✅ Set |
| `FIRECRAWL_API_KEY` | ✅ Set |
| `REGULATIONS_GOV_API_KEY` | ✅ Set |
| `RESEND_API_KEY` | ❌ Not set — required before attestation email reminders |

## Scripts (C:\Scripts, on PATH, .PS1 in PATHEXT)

- `acis-deploy` — build frontend → deploy Pages (acis-executive-hub) → deploy Worker
- `acis-trigger <scraper|heartbeat|vendors>` — manual API trigger; reads `$env:ACIS_ADMIN_TOKEN`
- `acis-secrets-check` — compare `.dev.vars` keys vs deployed Wrangler secrets

## Next Build Queue

1. **Vendor scanner in daily cron** — wire `scanVendor()` for stale vendors in `scheduled()` handler (~10 lines in `src/index.ts`)
2. **Attestation email reminders** — Resend; set `RESEND_API_KEY` secret first; new `src/services/email.ts` abstraction
3. **Incident escalation notifications** — reuses Resend; heartbeat already detects `stale_open_7d > 0`
4. **Portfolio viewer** — `portfolio.rossonlineservices.com`; curated doc viewer with KV-backed toggle controls
5. **GitHub PR automation** — high-risk regulatory event → auto PR via GitHub MCP

## ADR Notebook

`ainotebook/` is the source of truth for all architectural decisions. 15 entries (001–015). CHARTER.md files in `projects/` are historical planning artifacts — do not treat as current state.

## Working Conventions

- Prefer editing existing files over creating new ones.
- All compliance content must be accurate to real regulatory sources (CMS.gov, HHS OCR, NIST).
- Update `ainotebook/008-build-state-and-roadmap.md` when module status changes.
- Update `memory/post_compaction_review.md` at the end of significant sessions.
- Git commits: `Co-Authored-By: AIBuddy <aibuddy@rossonlineservices.com>`
- Deployments: use `acis-deploy` script rather than manual multi-step commands.
- Recommend script creation for any repetitive or multi-step terminal workflow.
- Speak as a peer Lead Architect: explain *why* each design choice demonstrates competence.
