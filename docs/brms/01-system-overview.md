# ACIS — System Overview

**Autonomous Compliance Intelligence System**  
Live at: https://acis.rossonlineservices.com

---

## What It Is

ACIS is a serverless compliance operations platform that automates the monitoring, tracking, assessment, and reporting work that a Security Compliance Administrator typically does manually. It runs continuously on Cloudflare's global edge network, uses Claude AI for regulatory analysis and incident response, and reports to a central admin layer via Cloudflare Service Bindings.

It is not a mockup. It is not a prototype. It is deployed to production infrastructure, processing real federal data, and accessible at a live URL right now.

---

## Architecture

```
Federal Regulatory Sources          ACIS Backend (Cloudflare Workers)
─────────────────────────           ──────────────────────────────────
Federal Register (CMS/EBSA/HHS) ──▶ Regulatory Pulse
Regulations.gov (CMS/HHS/OCR)   ──▶   ↳ Claude scores each document
CMS Newsroom                     ──▶   ↳ Risk level, impacted field,
HHS Press Room                   ──▶     deadline, remediation step
                                         64 live events in database
                                  
Client Plan Data                  Attestation Vault
─────────────────                   ↳ RxDC submission status
8 client records             ──▶   ↳ Gag Clause attestation status
                                    ↳ Completion percentages

Vendor Security Scanning          Vendor Risk
──────────────────────              ↳ Real TLS verification
6 vendor URLs             ──────▶  ↳ 6-header security score (0–100)
                                    ↳ Claude HIPAA Business Associate
                                      risk assessment per vendor

Incident Creation                 Incident Response
─────────────────                   ↳ NIST SP 800-61 Rev 2 playbook
Any incident type         ──────▶  ↳ HIPAA reportability assessment
                                    ↳ 60-day OCR deadline calculation
                                    ↳ CFR citations, escalation contacts

Daily 08:00 UTC Cron              Heartbeat Agent
────────────────────                ↳ Audits all 4 modules
Runs automatically        ──────▶  ↳ Green / Yellow / Red per module
                                    ↳ Reports to CCC Admin
                                    ↳ Persists to agent memory

                                  Executive Hub (Cloudflare Pages)
                                  ──────────────────────────────────
                                  acis.rossonlineservices.com
                                    ↳ Live Pulse panel
                                    ↳ Attestation panel
                                    ↳ Vendor Risk panel
                                    ↳ Incident Tracker + Playbooks
                                    ↳ Operations tab
                                        ↳ System Health (Green/Yellow/Red)
                                        ↳ Agent Logs (AI Gateway inference log)
                                        ↳ Admin Controls (manual triggers)
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Compute | Cloudflare Workers (TypeScript) |
| Database | Cloudflare D1 (SQLite at the edge) |
| File Storage | Cloudflare R2 (document vault) |
| Frontend | Cloudflare Pages (React + Tailwind) |
| AI | Anthropic Claude (claude-opus-4-7, claude-sonnet-4-6) |
| AI Observability | Cloudflare AI Gateway (all inference logged) |
| Scraping | Firecrawl API (bypasses CMS/HHS bot protection) |
| Regulatory Data | Federal Register API, Regulations.gov API |
| Portfolio Admin | CCC Admin (separate Worker + D1, Service Binding) |
| CI/CD | GitHub → Wrangler deploy |

---

## The AI Layer

Every Claude call is routed through the Cloudflare AI Gateway, which logs every request and response. The Executive Hub's Operations tab renders this log — a hiring manager can see the exact input and output for every risk scoring decision, vendor assessment, and incident playbook generation. This is not a black box. The reasoning is visible.

Six distinct AI agents are deployed:

| Agent | Model | Trigger | Purpose |
|---|---|---|---|
| Regulatory Risk Scorer | claude-sonnet-4-6 | Daily cron (per document) | Risk level, impacted field, remediation step, deadline |
| NIST Playbook Generator | claude-opus-4-7 | On incident creation | NIST 800-61 playbook with HIPAA-specific obligations |
| Vendor Security Assessor | claude-opus-4-7 | On demand | HIPAA Business Associate risk classification |
| System Health Auditor | claude-opus-4-7 | Daily cron (after scraper) | Green/Yellow/Red module health report |
| Attestation Reminder | Resend (no AI) | Daily cron | Email alert when any client attestation is Overdue |
| Incident Escalation | Resend (no AI) | Daily cron | Email with OCR countdown when incident open 7+ days |

---

## What "Autonomous" Means

Most compliance tools require a human to initiate every action. ACIS initiates actions on its own:

- Every morning at 08:00 UTC, it reads the federal register and scores new regulatory events
- Every morning after that, it audits itself — checking for overdue attestations, stale incidents, unscanned vendors, and new high-risk regulatory activity
- When a new incident is opened, it generates a complete response playbook before the screen loads
- When a vendor is scanned, it provides a compliance-specific risk assessment, not just a port scan
- When a High-risk regulatory event is ingested, it opens a GitHub pull request with a compliance alert file — Claude's assessment, required action, and CFR citations — for the administrator to review and merge
- When an attestation goes Overdue or an incident ages past 7 days, it sends an email — not a dashboard notification that requires a login, but an outbound alert that finds the administrator

The compliance administrator's job shifts from *doing* compliance work to *reviewing* what the system surfaces and *acting* on what it escalates.
