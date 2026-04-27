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
| `001` – D1 schema | Schema migrations |
| `002` – Regulatory Pulse | Scraper sources added/removed, scoring model changes |
| `003` – Vendor Risk | Scanner logic changes, new scan fields |
| `004` – Attestation Vault | New attestation types, status lifecycle changes |
| `005` – Incident Response | Playbook prompt changes, new severity tiers |
| `006` – Executive Hub | New tabs, major UI architecture changes |
| `007` – Heartbeat | Self-audit query changes, new modules being evaluated |
| `008` – Build State | **Every session that adds a feature** |
| `009` – AI Gateway | Gateway config changes, log streaming changes |
| `010` – Claude API Inventory | New AI calls added to any agent |
| `011` – AI Notebook | New ADR added |
| `012` – Scraper Sources | New source added, Firecrawl integration changes |
| `013` – R2 Vault | New file storage patterns |
| `014` – CCC Admin | Service binding changes, new outbound calls |
| `015` – Resend Email | Email template changes, new email agent added |
| `016` – Email Agents *(pending)* | Attestation or incident email logic changes |
| `017` – Portfolio Viewer *(pending)* | Portfolio Worker architecture changes |

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
