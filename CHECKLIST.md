# ACIS Living Documents Checklist

All documents that carry current system state and their update triggers.
Open this alongside IMPACT.md before any significant change.

## Core System Docs

| Document | Update When |
|---|---|
| `CLAUDE.md` | Module status changes, new secrets, new scripts, cron schedule changes, stack changes |
| `IMPACT.md` | New dependencies, new services, new bindings, topology changes |
| `CHECKLIST.md` | New living document added to the repo |
| `ainotebook/008-build-state-and-roadmap.md` | Any module goes Live, any agent added/removed, roadmap items completed |

## Architectural Decision Records (`ainotebook/`)

| ADR | Update When |
|---|---|
| `001` – Four Projects → One System | Project architecture changes fundamentally |
| `002` – Unified Worker vs Microservices | Worker/routing architecture changes |
| `003` – D1 Schema: Five-Table Design | Schema migrations, new tables |
| `004` – Cloudflare Agents SDK | Agent SDK usage or memory patterns change |
| `005` – AI Gateway as Observability Layer | Gateway routing, logging config changes |
| `006` – Regulatory Ingestion: Three-Source Architecture | Scraper sources added/removed, scoring model changes |
| `007` – Bypassing Bot Protection (CMS/HHS) | Firecrawl integration changes, bot bypass strategy changes |
| `008` – Build State & Remaining Roadmap | **Every session that adds a feature** |
| `009` – NIST 800-61 Incident Playbook Agent | Playbook prompt changes, new severity tiers, CFR citation updates |
| `010` – Vendor Security Scanner Agent | Scanner logic changes, new scan fields, status classification changes |
| `011` – Claude API Usage Inventory | New AI calls added to any agent |
| `012` – Heartbeat Agent: Daily Self-Audit Loop | Self-audit query changes, new modules being evaluated |
| `013` – Operations Tab: Admin Controls | Admin panel changes, new manual triggers |
| `014` – Service Binding Patterns | Service binding calling conventions change |
| `015` – Email Provider: Resend | Email service changes, from-address changes |
| `016` – Email Notification Agents | Attestation or incident email logic changes, new email agent |
| `017` – Portfolio Viewer | Portfolio Worker architecture, KV toggle logic changes |
| `018` – GitHub PR Automation | PR threshold changes, branch naming, alert file format changes |
| `019` – Multi-Agent Development Architecture | Agent delegation model, Claude Code/Cursor/Playwright roles change |
| `020` – Cloudflare Workers MCP SDK Reference | MCP implementation patterns, auth strategy, DO vs. stateless choice changes |
| `021` – Model Constants Centralization | Model string assignments change, new agents added, model upgrades |

## Memory Files (`memory/`)

| File | Update When |
|---|---|
| `post_compaction_review.md` | End of any significant session (session summary + live state) |
| `scripts_reference.md` | New script created in `C:\Scripts`, existing script updated |
| `terminal_errors.md` | New error encountered + resolution found |
| `project_context.md` | Target role, major project goal, or stack changes |

## Portfolio Docs (`docs/brms/`)

| File | Update When |
|---|---|
| `01-overview.md` | New module goes live, major capability added |
| `02-alignment.md` | Job description changes, new framework coverage |
| `03-implementation-roadmap.md` | Roadmap items completed or reprioritized |
| `04-letter-to-director.md` | Compelling new capabilities worth highlighting |
| `05-system-narrative.md` *(pending)* | Major new system capabilities or story arc changes |

> After editing any `docs/brms/` file: run `portfolio-deploy` (which pushes to GitHub first).

## Deployment Checklist (before any deploy)

- [ ] `npx tsc --noEmit` passes
- [ ] `.dev.vars` matches all entries in `CLAUDE.md` secrets table
- [ ] If new secret added: run `acis-secrets-check` after deploy
- [ ] If schema migration: back up D1 first
- [ ] If portfolio docs changed: `git push` before `wrangler deploy`
- [ ] After deploy: spot-check affected tab in the Executive Hub
