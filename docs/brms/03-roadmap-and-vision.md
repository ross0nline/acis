# Roadmap & Vision: ACIS at BRMS

---

## Current State (Live Now)

| Module | Status | What It Does |
|---|---|---|
| Regulatory Pulse | Live | 5-source federal feed, daily Claude scoring, 64 events |
| Attestation Vault | Live | RxDC + Gag Clause tracking for 8 client plans |
| Vendor Risk | Live | Real TLS/header scanning + Claude HIPAA risk assessment |
| Incident Response | Live | NIST 800-61 playbooks auto-generated on every incident |
| Attestation Reminders | Live | Daily email when any client attestation is Overdue |
| Incident Escalation | Live | Daily email for Open incidents 7+ days; HIPAA OCR countdown |
| GitHub PR Automation | Live | High-risk event (score ≥ 8) → auto branch + compliance alert PR |
| Executive Hub | Live | Single dashboard at acis.rossonlineservices.com |
| Operations Tab | Live | Manual triggers, heartbeat view, AI Gateway log streaming |
| Heartbeat Agent | Live | Daily self-audit → Green/Yellow/Red → CCC Admin report |
| Agent Logs | Live | Full AI inference trace visible in Operations tab |

---

## Completed Features

### ✅ Playbook Agent Upgrade — Complete (2026-04-25)
Upgraded from `claude-sonnet-4-6` to `claude-opus-4-7`. CFR citation precision and phase-level specificity measurably improved. Every new incident receives an Opus-quality playbook.

### ✅ Attestation Email Reminders — Complete (2026-04-26)
Daily cron checks for `rxdc_status = 'Overdue'` or `gag_clause_status = 'Overdue'`. When found, sends an HTML summary table to the compliance administrator via Resend. No-op on clean days — no spam.

### ✅ Incident Escalation Notifications — Complete (2026-04-26)
Daily cron checks for incidents open longer than 7 days. Email includes days-open count and HIPAA OCR window countdown per incident. Subject line escalates to `⚠️ URGENT` when any incident hits 45+ days. Cites 45 CFR § 164.404.

### ✅ GitHub PR Automation — Complete (2026-04-27)
When the Regulatory Pulse ingests a High-risk event (score ≥ 8), ACIS opens a GitHub pull request automatically — creating a compliance alert file with Claude's full risk assessment, required action, and source citation. The compliance administrator reviews and merges. Demo PR #1 is open: HHS Notice of Benefit and Payment Parameters for 2027 (Risk: 9/10).

---

## BRMS-Specific Adaptation (If Deployed)

ACIS was built as a general healthcare compliance platform. Adapting it for BRMS would require approximately two weeks of configuration:

**Data layer:**
- Import BRMS's actual client plan roster into Attestation Vault
- Import BRMS's vendor inventory into Vendor Risk
- Seed historical incident records
- Configure regulatory feed filters for BRMS's specific product lines and state coverage

**Compliance layer:**
- Add SOC 2 audit management module (evidence collection tracker, control testing schedule, auditor communication log)
- Add Business Associate Agreement (BAA) tracking to Vendor Risk (`baa_status`, `baa_expiry`, `baa_signed_by`)
- Add employee security awareness training completion tracker (HIPAA §164.308(a)(5) requirement)
- Configure state privacy law monitoring for BRMS's operating states (CCPA, state breach notification laws)

**Reporting layer:**
- Monthly executive summary report: Claude synthesizes the month's regulatory changes, incident activity, vendor status, and attestation completion into a board-ready document
- SOC 2 readiness dashboard: maps ACIS data to specific SOC 2 Trust Services Criteria
- Compliance calendar view: key regulatory deadlines surfaced as a visual timeline

---

## The Vision: Compliance as Infrastructure

The traditional compliance administrator model requires constant manual effort: reading bulletins, updating spreadsheets, chasing attestations, writing incident reports, reviewing vendor SOC 2 reports. The ceiling on what one person can manage is defined by hours in a day.

ACIS redefines that ceiling. With ACIS deployed:

- **Regulatory monitoring** becomes passive. The system reads every relevant federal bulletin and scores it before the administrator arrives in the morning.
- **Attestation tracking** becomes automated. Reminders go out without prompting. Completion percentages update in real time.
- **Vendor risk** becomes continuous. Vendors are scanned on schedule; changes in security posture trigger alerts.
- **Incident response** becomes faster. The playbook exists before the first status meeting.
- **Executive reporting** becomes a dashboard URL, not a quarterly slide deck.

One compliance administrator with ACIS operates at the throughput of a three-person compliance team — with an audit trail, an AI reasoning log, and a self-monitoring system that reports its own health daily.

That is not a role description. It is a competitive advantage for the organization that deploys it.
