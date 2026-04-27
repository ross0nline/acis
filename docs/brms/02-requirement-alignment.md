# Requirement Alignment: JD vs. ACIS Capabilities

Every essential duty and knowledge requirement from the Security Compliance Administrator II position description is addressed below with the specific ACIS capability that demonstrates it — and a live endpoint or UI location where it can be verified.

---

## Essential Duties

### Develop, implement, and maintain the organization's information security compliance program
**Demonstrated by:** The entire ACIS system. This is not a plan for a compliance program — it is a running compliance program. Four modules cover the four primary compliance domains in healthcare administration (regulatory monitoring, attestation, vendor risk, incident response), unified under a single Executive Hub dashboard.

---

### MANDATORY: Knowledge of HIPAA compliance — RxDC, Gag Clause, CMS

**RxDC — Demonstrated by:** Attestation Vault tracks `rxdc_status` per client plan: `Pending → Submitted → Confirmed → Overdue`. Completion percentage is surfaced on the dashboard. The regulatory scraper flags every CMS bulletin that affects RxDC reporting deadlines.

**Gag Clause — Demonstrated by:** Attestation Vault tracks `gag_clause_status` per client: `Not Started → In Progress → Attested → Overdue`. Independent lifecycle from RxDC because attestation timelines differ.

**CMS — Demonstrated by:** CMS is one of three Federal Register feed sources and one of two Firecrawl newsroom sources. Every CMS bulletin is ingested, scored, and surfaced within 24 hours of publication. CMS-specific risk events are tagged and searchable in the Live Pulse panel.

---

### Monitor changes in laws, regulations, and industry standards and recommend updates to policies and procedures

**Demonstrated by:** Regulatory Pulse module. Five live data sources:
- Federal Register (CMS, EBSA, HHS agency feeds)
- Regulations.gov (CMS, HHS, EBSA, OCR dockets)
- CMS Newsroom (Firecrawl — bypasses bot protection)
- HHS Press Room (Firecrawl — bypasses bot protection)

Each document is scored by Claude: `risk_level` (High/Medium/Low), `impacted_field` (RxDC/GagClause/HIPAA/GeneralSecurity), `summary`, `remediation_step`, and `deadline`. 64 real federal documents in the live database.

---

### Conduct internal risk assessments and compliance audits

**Demonstrated by:** Heartbeat Agent. Every morning, after the scraper runs, a 13-query D1 audit checks:
- Regulatory events ingested in the last 72 hours (weekend-aware window)
- High-risk events (score ≥ 8)
- Overdue attestation clients
- High Risk vendors
- Open incidents older than 7 days
- Vendors not scanned in 30+ days

Claude produces a Green/Yellow/Red assessment per module and a list of specific action items. Available via `GET /api/heartbeat/last` or the Operations tab.

---

### Lead incident response documentation and ensure proper reporting procedures are followed

**Demonstrated by:** Incident Response module. Every incident automatically receives a NIST SP 800-61 Rev 2 playbook before the creation response returns. The playbook includes:
- Severity classification (Critical/High/Medium/Low)
- HIPAA reportability determination
- 60-day OCR notification deadline (if reportable)
- Five-phase response guidance (Detection, Containment, Eradication, Recovery, Post-Incident)
- Specific CFR citations (e.g., `45 CFR § 164.404`, `45 CFR § 164.312(a)(1)`)
- Escalation contacts (Privacy Officer, CISO, Legal Counsel, Affected Individual Notification Team)

---

### Track remediation efforts and ensure timely resolution of compliance findings

**Demonstrated by:**
- Attestation Vault: `rxdc_status` and `gag_clause_status` lifecycle tracks remediation per client
- Incident Response: status lifecycle (`Open → Contained → Remediated → Closed`) with `closed_at` timestamp
- Heartbeat Agent: flags incidents open 7+ days as a Yellow/Red condition and generates an action item
- Vendor Risk: `overall_status` lifecycle tracks remediation per vendor (`Pending Review → Approved` or `High Risk → Requires Review`)

---

### Partner with IT and business units to ensure appropriate security controls are in place

**Demonstrated by:** Vendor Risk module. The scanner assesses security controls at each vendor's web presence:
- TLS validity (HTTPS certificate verification)
- HTTP security headers: HSTS, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Claude synthesizes findings as a HIPAA Business Associate risk assessment
- Results inform vendor approval decisions for IT and Legal

---

### Report compliance status, risks, and mitigation strategies to executive leadership

**Demonstrated by:**
- Executive Hub dashboard at `acis.rossonlineservices.com` — visual summary of all four compliance domains
- Heartbeat Agent: structured Green/Yellow/Red report forwarded to CCC Admin (the portfolio-level admin layer) daily
- Operations tab: System Health section provides a board-ready module status view at a glance
- Agent Logs: every Claude inference call is logged and rendered in the Operations tab — model used, tokens, latency, pass/fail. The reasoning behind every risk scoring decision, vendor assessment, and incident playbook is visible and auditable. This is not a black box.

---

## Knowledge, Skills & Abilities

| Requirement | ACIS Demonstration |
|---|---|
| NIST framework | Incident playbooks are grounded in NIST SP 800-61 Rev 2 by system prompt instruction; all five phases implemented |
| ISO 27001 | *Planned — see Roadmap* |
| SOC 2 Audit management | *Planned — see Roadmap* |
| Annual RxDC reporting | Attestation Vault `rxdc_status` lifecycle with completion percentage tracking |
| Annual Gag Clause Attestation | Attestation Vault `gag_clause_status` lifecycle, independent of RxDC |
| Vendor Management | Vendor Risk module with real security scanning, risk classification, and status tracking |
| Analytical and risk assessment skills | Four Claude agents, five inference calls — risk scoring, playbook generation, vendor assessment, system health audit |
| Written and verbal communication | Every AI output (playbooks, risk summaries, heartbeat reports) demonstrates precise regulatory language |
| Executive reporting | Executive Hub + Heartbeat Agent provide the reporting layer |
| Project management | CCC Admin tracks this project: 10 modules, 5 agents, 8 planned features, version history |
