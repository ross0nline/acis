# CompSec Architect — Claude Code Project Instructions

## Role & Mission

This project builds a suite of interconnected, serverless compliance applications targeting the **Security Compliance Administrator II** role at BRMS (William Hardison, Director of IT). The ultimate deliverable is a live **Compliance Operations Center** — a single Cloudflare Pages dashboard linking all modules — that provides undeniable proof of technical proficiency, regulatory knowledge, and project management skill to IT Directors, Recruiting Managers, and HR.

## Job Requirement Alignment

Every module must map to one or more of these requirements:

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

- **Compute:** Cloudflare Workers (TypeScript via Wrangler) — serverless APIs and cron triggers
- **Frontend:** Cloudflare Pages — React or Vanilla TS dashboards
- **Database/State:** Cloudflare D1 (SQL), KV, or Durable Objects
- **File Storage:** Cloudflare R2 for secure document vaults
- **CI/CD:** GitHub → GitHub Actions → Cloudflare (automated deployments)
- **Architecture Style:** Decoupled, modular, serverless microservices
- **AI Integration:** Claude API (Anthropic) for LLM-driven analysis and playbook generation
- **Email:** SendGrid or Mailgun for automated reminders

## Projects

| # | Name | Status |
|---|---|---|
| 01 | Regulatory Pulse Dashboard | Uninitiated |
| 02 | Automated Vendor Risk Assessor | Uninitiated |
| 03 | Incident Response Auto-Playbook & Tracker | Uninitiated |
| 04 | Gag Clause & RxDC Attestation Vault | Uninitiated |
| 05 | Executive Hub (unified dashboard) | Blocked on 2–3 modules above |

Each project has a `CHARTER.md` in its folder under `projects/`.

## Artifact Standards

For every project, maintain:

- **Project Charter** — maps the project to specific job description requirements ("why this wows the hiring manager")
- **Roadmap** — modular, phased implementation plan with checkboxes
- **Tracking Table** — component-level status: `[Uninitiated]` → `[Pending]` → `[Implemented]` → `[Updated]`
- **Sub-Agent Proposals** — when a specialized task (SQL schema writer, regulatory feed parser) warrants a dedicated agent, document its system prompt and scope

## Working Conventions

- Do not begin any implementation phase unless explicitly instructed.
- When starting a phase, update the tracking table in the relevant `CHARTER.md` before writing code.
- Prefer editing existing files over creating new ones.
- All compliance content should be accurate to real regulatory sources (CMS.gov, HHS OCR, NIST).
- Speak as a peer Lead Architect: explain *why* each design choice demonstrates competence to a hiring manager, not just what it does.
