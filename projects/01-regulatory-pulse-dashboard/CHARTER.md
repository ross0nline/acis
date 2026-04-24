# Project 01: Regulatory Pulse Dashboard

## A. Project Charter

**Objective:** Build an automated system that monitors, ingests, and flags changes in healthcare and cybersecurity regulations, presenting them on a unified dashboard.

**Job Description Alignment:**
- Fulfills: *"Monitor changes in laws, regulations, and industry standards and recommend updates to policies and procedures."*
- Proves MANDATORY HIPAA knowledge (RxDC, Gag Clause, CMS) by specifically targeting these regulatory data streams.
- Demonstrates *"Excellent analytical and risk assessment skills"* via keyword-based risk scoring on incoming regulatory updates.

**Why it wows the hiring manager:** This isn't a static policy document — it's a live system that automatically detects when CMS or HHS changes a rule, scores it for risk, and surfaces it on a dashboard. It shows you can protect the company from compliance drift without someone having to manually check government websites every day.

---

## B. Roadmap

### Phase 1: Backend Infrastructure (Cloudflare Workers & D1)
- [ ] Initialize a Cloudflare Worker project using TypeScript (Wrangler)
- [ ] Provision a Cloudflare D1 SQL database
- [ ] Create a Cron Trigger to fetch RSS/JSON feeds daily from CMS.gov and HHS (HIPAA/OCR updates)

### Phase 2: Data Processing & Risk Scoring
- [ ] Implement a parsing module to extract text from regulatory feeds
- [ ] Implement a risk-scoring function that flags keywords: "RxDC", "Gag Clause", "Attestation", "Breach", "Penalty"

### Phase 3: Frontend Dashboard (Cloudflare Pages)
- [ ] Scaffold a lightweight React or Vanilla TS frontend
- [ ] Create an API route in the Worker to serve D1 records to the frontend
- [ ] Deploy to Cloudflare Pages via GitHub integration

### Phase 4: CI/CD & Documentation
- [ ] Set up GitHub Actions for automated deployment
- [ ] Draft an Incident Response / Policy Update template triggered by high-risk flags

---

## C. Tracking Table

| Module | Component | Status | Notes |
|---|---|---|---|
| Infra | Cloudflare D1 DB | [Uninitiated] | Schema: id, source, title, url, date, risk_level, keywords |
| Infra | Wrangler Setup (TS) | [Uninitiated] | wrangler.toml — D1 binding + Cron trigger |
| Backend | CMS Scraper/Fetcher | [Uninitiated] | Target CMS.gov public RSS/JSON feeds |
| Backend | HIPAA/HHS Fetcher | [Uninitiated] | Target HHS newsroom or OCR RSS feeds |
| Backend | Risk Scoring Module | [Uninitiated] | Keyword match + severity classification |
| Frontend | Dashboard UI | [Uninitiated] | Executive-level view: flagged items, risk level, source |
| DevOps | GitHub CI/CD | [Uninitiated] | Link Pages project to repo via GitHub Actions |

---

## D. Sub-Agent Proposals

**Sub-Agent: CMS Feed Parser**
- Scope: Handles parsing of complex CMS legal text from RSS/JSON feeds, normalizes into D1 schema.
- Trigger: Runs on Cron schedule (daily).
- Output: Structured regulatory event records with extracted keywords and risk scores.

**Sub-Agent: SQL Schema Architect**
- Scope: Designs and generates the D1 SQL schema (migrations) for regulatory events, audit logs, and risk classifications.
- Trigger: One-time setup during Phase 1.
