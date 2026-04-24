# Project 02: Automated Vendor Risk Assessor (VRA)

## A. Project Charter

**Objective:** Build a system that automates the initial intake and risk scoring of third-party vendors, reducing manual busywork and demonstrating scalable vendor management.

**Job Description Alignment:**
- Fulfills: *"Vendor Management"*
- Demonstrates: *"Knowledge of industry security standards (SOC 2, ISO 27001)"*
- Supports: *"Conduct internal risk assessments and compliance audits"*

**Why it wows the hiring manager:** Vendor management is one of the most time-consuming parts of this role. Building a system that automates initial risk scoring (HTTP headers, TLS validity, AI-driven policy review) shows you can design scalable controls, not just check boxes manually.

---

## B. Roadmap

### Phase 1: Backend API (Cloudflare Worker)
- [ ] Create a Worker endpoint that accepts a vendor URL and basic details
- [ ] Implement passive scan: check HTTP security headers (CSP, HSTS, X-Frame-Options)
- [ ] Implement TLS certificate validity check

### Phase 2: AI-Driven Policy Analysis
- [ ] Pass vendor privacy policy URL to Claude API for SOC 2 / HIPAA compliance mention extraction
- [ ] Generate a structured risk summary from the AI response

### Phase 3: Database & Status Tracking (Cloudflare D1)
- [ ] Store vendor records with status: "Pending SOC2 Review" | "Approved" | "High Risk"
- [ ] Expose a GET endpoint to retrieve all vendor risk records

### Phase 4: Frontend Dashboard (Cloudflare Pages)
- [ ] Vendor intake form (URL + name + contact)
- [ ] Risk status table with color-coded risk levels
- [ ] Deploy to Cloudflare Pages via GitHub Actions

---

## C. Tracking Table

| Module | Component | Status | Notes |
|---|---|---|---|
| Backend | Worker API Endpoint | [Uninitiated] | POST /vendor — accepts URL + metadata |
| Backend | HTTP Header Scanner | [Uninitiated] | Check CSP, HSTS, X-Frame-Options, etc. |
| Backend | TLS Checker | [Uninitiated] | Validate cert expiry and issuer |
| Backend | AI Policy Analyzer | [Uninitiated] | Claude API — extract SOC2/HIPAA mentions |
| Database | D1 Vendor Schema | [Uninitiated] | Fields: id, name, url, risk_score, status, scan_date |
| Frontend | Vendor Intake Form | [Uninitiated] | Simple form → POST to Worker |
| Frontend | Risk Status Dashboard | [Uninitiated] | Table with status badges |
| DevOps | GitHub CI/CD | [Uninitiated] | Automated deploy to Pages + Workers |

---

## D. Sub-Agent Proposals

**Sub-Agent: Vendor Policy Reviewer**
- Scope: Receives a privacy policy URL, fetches the text, and uses Claude API to identify SOC 2, HIPAA, ISO 27001 compliance signals or red flags.
- Output: Structured JSON with compliance_mentions[], red_flags[], and overall_risk_score.
