# Project 03: Incident Response Auto-Playbook & Tracker

## A. Project Charter

**Objective:** A webhook-driven tool that standardizes incident logging and auto-generates NIST 800-61-aligned containment playbooks when a security incident is reported.

**Job Description Alignment:**
- Fulfills: *"Lead incident response documentation and ensure proper reporting procedures are followed."*
- Fulfills: *"Track remediation efforts and ensure timely resolution of compliance findings."*
- Demonstrates: *"Strong understanding of cybersecurity frameworks (NIST)"*

**Why it wows the hiring manager:** During a real security incident, documentation discipline breaks down. This system enforces structure automatically — a hiring manager sees that you've codified the chaos, which is exactly what a compliance administrator is supposed to do.

---

## B. Roadmap

### Phase 1: Backend (Cloudflare Worker)
- [ ] Create a Worker endpoint that accepts an incident report (type, description, reporter)
- [ ] Generate an Incident Ticket in D1 with timestamp and unique ID
- [ ] Integrate Claude API to generate a 5-step NIST 800-61-aligned containment playbook based on incident type

### Phase 2: Database & Remediation Tracking (Cloudflare D1)
- [ ] Schema: incident_id, type, description, reporter, timestamp, status, playbook, remediation_steps[]
- [ ] Track status: "Open" | "Contained" | "Remediated" | "Closed"
- [ ] Expose GET endpoint to retrieve all incidents and their current status

### Phase 3: Frontend Dashboard (Cloudflare Pages)
- [ ] "Panic Button" dashboard — incident type selector (Phishing, Data Exfiltration, Ransomware, Unauthorized Access, etc.)
- [ ] Incident log view with status, timestamps, and generated playbook
- [ ] Remediation step checklist per incident

### Phase 4: CI/CD & Documentation
- [ ] GitHub Actions → Cloudflare deployment pipeline
- [ ] Export incident report as PDF/Markdown for regulatory submission

---

## C. Tracking Table

| Module | Component | Status | Notes |
|---|---|---|---|
| Backend | Incident Intake Endpoint | [Uninitiated] | POST /incident — type, description, reporter |
| Backend | Ticket Generator | [Uninitiated] | Auto-assign ID, timestamp, initial status |
| Backend | AI Playbook Generator | [Uninitiated] | Claude API — NIST 800-61 5-step containment |
| Database | D1 Incident Schema | [Uninitiated] | Full incident lifecycle tracking |
| Frontend | Panic Button Dashboard | [Uninitiated] | Incident type selector |
| Frontend | Incident Log View | [Uninitiated] | Status + playbook + checklist |
| Frontend | Report Export | [Uninitiated] | PDF/Markdown for regulatory submission |
| DevOps | GitHub CI/CD | [Uninitiated] | Automated deploy pipeline |

---

## D. Sub-Agent Proposals

**Sub-Agent: NIST Playbook Generator**
- Scope: Receives incident type and description, outputs a structured 5-step containment playbook aligned to NIST SP 800-61r2 (Preparation, Detection, Containment, Eradication, Recovery).
- Output: JSON with step[], action[], responsible_party[], estimated_time[], and documentation_required[].
