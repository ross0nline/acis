# Roadmap & Vision: ACIS at BRMS

---

## Current State (Live Now)

| Module | Status | What It Does |
|---|---|---|
| Regulatory Pulse | Live | 5-source federal feed, daily Claude scoring, 64 events |
| Attestation Vault | Live | RxDC + Gag Clause tracking for 8 client plans |
| Vendor Risk | Live | Real TLS/header scanning + Claude HIPAA risk assessment |
| Incident Response | Live | NIST 800-61 playbooks auto-generated on every incident |
| Executive Hub | Live | Single dashboard at acis.rossonlineservices.com |
| Operations Tab | Live | Manual triggers, heartbeat view, AI Gateway log streaming |
| Heartbeat Agent | Live | Daily self-audit → Green/Yellow/Red → CCC Admin report |
| Agent Logs | Live | Full AI inference trace visible in Operations tab |

---

## Near-Term Roadmap (Next 30 Days)

### 1. Attestation Email Reminders
Automated outbound reminders to client plans with approaching or overdue RxDC and Gag Clause deadlines. Triggered by the daily cron when `rxdc_status` or `gag_clause_status` reaches a threshold. Sent via Resend API with HIPAA-appropriate templating. This closes the loop between tracking and action — the system doesn't just surface overdue records, it contacts the responsible parties.

### 2. Playbook Agent Upgrade
The NIST playbook generator is currently on claude-sonnet-4-6. Upgrading to claude-opus-4-7 improves the precision of CFR citations and the specificity of phase-level guidance for unusual incident types (e.g., supply chain compromise, insider threat). One-line change, meaningful quality improvement for the compliance team's most critical output.

### 3. Incident Escalation Notifications
When the Heartbeat Agent detects an incident open longer than 7 days, send a targeted alert to the compliance administrator and log an escalation event to the admin layer. Ensures incidents don't silently age past the HIPAA Breach Notification Rule's 60-day OCR reporting window.

### 4. GitHub PR Automation
When the Regulatory Pulse detects a new High-risk event (e.g., a CMS bulletin changing an RxDC submission deadline), the system opens a GitHub pull request automatically — updating the organization's policy documentation with the new requirement, citing the source regulatory document, and tagging the change for review. This is the feature that demonstrates ACIS is not just monitoring but *acting*: the compliance administrator reviews a PR rather than manually researching a bulletin.

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
