# ACIS Brainstorm: Synthesis, Gaps, and Recommendations

*Written: 2026-04-24 — based on full review of all context documents*

---

## What Has Actually Changed Since the Original Plan

The biggest shift is conceptual: **this is no longer 4 separate portfolio projects**. The context documents reveal the plan has evolved into a single integrated system — **ACIS (Autonomous Compliance Intelligence System)** — with the original projects becoming modules feeding into one Executive Hub dashboard.

The other major shift: the system is now **agentic**, not just automated. The distinction matters:
- Automated = runs on a cron, does a task, stops
- Agentic = has memory (Durable Objects), reasons about state over time, takes autonomous actions (opens GitHub PRs, sends targeted reminders), and logs its own thought process visibly

The Integrated Project Charter explicitly merges Project 01 (Regulatory Pulse) and Project 04 (RxDC Attestation Vault) under ACIS. The "Autonomous Edge Engineer" concept (self-healing Worker that monitors its own code and opens PRs) is the meta-layer on top.

One critical status update buried in the tracking table: **Claude intelligence is already [Implemented]** — the API key is live via Claude Code. That means the hardest dependency is done before a single line of project code is written.

---

## The Architecture as I Now Understand It

```
ACIS (Autonomous Compliance Intelligence System)
│
├── Intelligence Layer
│   ├── Claude API (via Cloudflare AI Gateway) ← [Implemented]
│   └── Cloudflare Agents SDK (Durable Objects) ← stateful memory
│
├── Data Layer (Cloudflare D1)
│   ├── regulatory_events        ← Project 01: CMS/HHS feed results
│   ├── attestation_vault        ← Project 04: RxDC/Gag Clause tracking
│   ├── agent_memory             ← Agent's cross-run memory (key-value)
│   ├── vendor_risk              ← Project 02: NOT YET IN SCHEMA
│   └── incidents                ← Project 03: NOT YET IN SCHEMA
│
├── Storage Layer
│   └── Cloudflare R2            ← Encrypted PDFs (attestations)
│
├── Backend (Cloudflare Workers)
│   ├── Scraper Agent            ← Daily cron, CMS/HHS RSS feeds
│   ├── Risk Scorer              ← Claude: "Immediate Action" vs "Informational"
│   ├── Attestation Reminder     ← 30-day deadline cron + SendGrid
│   ├── Vendor Intake API        ← TLS/header scan + AI policy review
│   ├── Incident Intake API      ← NIST 800-61 playbook generation
│   └── Self-Healing Heartbeat   ← Every 30 min: self-audit → GitHub PR if needed
│
├── GitHub Integration
│   ├── CI/CD: GitHub Actions → Wrangler deploy
│   └── Agent can OPEN PRs when policy docs need updates (big wow factor)
│
└── Executive Hub (Cloudflare Pages)
    ├── Live Pulse               ← Real-time regulatory feed with risk scores
    ├── Attestation Status       ← % completion progress bar for RxDC/Gag Clause
    ├── Agent Logs               ← Transparent view of AI reasoning (the "brain log")
    ├── Vendor Risk Board        ← Partner risk status table
    └── Incident Tracker         ← Open incidents + NIST playbooks
```

---

## Gaps I Found

### 1. Projects 02 and 03 Are Orphaned From ACIS
The Integrated Charter explicitly merges 01 and 04, but the Vendor Risk Assessor (02) and Incident Response Playbook (03) aren't wired into the ACIS architecture yet. They need:
- Two more D1 tables: `vendor_risk` and `incidents`
- API routes in the main ACIS Worker (or their own Workers that share the D1 binding)
- Panels in the Executive Hub dashboard

**Recommendation:** Treat all 4 modules as sub-systems of ACIS from day one. One `wrangler.toml`, one D1 database, one deployment pipeline. Don't build them in isolation and bolt them together later — that creates integration debt.

### 2. Cloudflare MCP Is Not Set Up
The Edge-Agent Stack document calls out connecting the **Cloudflare MCP** to Claude Code so I can directly see their Cloudflare account (list Workers, inspect D1 databases, read R2 buckets) from within this terminal. This hasn't been done yet and it's a significant workflow multiplier. Setting it up before Phase 1 means I can verify D1 schema creation, check Worker deployments, and inspect live data without leaving the conversation.

**Recommendation:** This should be the literal first technical step before any code is written.

### 3. AI Gateway Is Not In Our Current Stack Plan
The Integrated Charter says "Configure the AI Gateway to route Claude calls." This is different from calling the Claude API directly. Cloudflare AI Gateway sits in front of the Claude API and provides:
- Request/response logging (the hiring manager can see the agent's actual API calls)
- Caching (reduce API costs on repeated regulatory summaries)
- Rate limiting and observability dashboards

The "Agent Logs" panel on the Executive Hub becomes far more impressive if it's pulling structured logs from AI Gateway rather than just printing strings we write ourselves.

**Recommendation:** Set up AI Gateway before writing any Claude API calls in the Workers. Route all LLM traffic through it.

### 4. GitHub Repo Doesn't Exist Yet
Nothing can deploy without a repo. CI/CD, the self-healing PR feature, GitHub Actions → Wrangler — all of it depends on a GitHub repo existing with the right structure. This is blocked until a repo is initialized.

**Recommendation:** Create the GitHub repo immediately after Cloudflare MCP setup. Then the project structure we've built locally can be pushed as the initial commit, and `wrangler.toml` can reference the repo from day one.

### 5. The Self-Healing Worker Needs Scoping
The "Autonomous Edge Engineer" concept (Worker calls Claude every 30 min about its own error rates and opens a GitHub PR if changes are needed) is genuinely impressive but also the most complex piece. The risk is scope creep — building a self-healing meta-system when the compliance content isn't live yet.

**Recommendation:** Treat this as Phase 4, after the core ACIS modules are deployed and generating real data. The "Brain Log" (D1's `agent_memory` table surfaced on the dashboard) is the quick win that demonstrates the same concept with less risk.

### 6. Sub-Agent Regulatory Analyst Output Format Needs a Home
The Sub-Agent spec defines a clean JSON output:
```json
{
  "risk_level": "High/Medium/Low",
  "impacted_field": "RxDC/GagClause/GeneralSecurity",
  "summary": "1-sentence summary",
  "remediation_step": "Actionable item for the admin",
  "deadline": "YYYY-MM-DD"
}
```
This maps cleanly to the `regulatory_events` D1 table from `acis.txt`, but the `remediation_steps` column is `TEXT`, not structured JSON. This means we either store JSON strings (fine for now) or add discrete columns. Decision should be made before writing the schema migration.

**Recommendation:** Store as JSON string in `remediation_steps` initially. When Phase 2 is done, we can add a `deadline DATE` column via migration if querying by deadline becomes useful.

---

## Recommendations on Project Structure Rename

The current folder structure has 4 separate project folders. Given ACIS is the real architecture, I'd suggest restructuring when we're ready to start:

```
compliance-portfolio/
├── CLAUDE.md
├── docs/
│   └── job-description.md
├── context/               ← keep as-is (source PDFs)
├── brainstorming/         ← this file lives here
└── acis/                  ← THE project (replaces 4 separate folders)
    ├── wrangler.toml
    ├── src/
    │   ├── index.ts           ← main Worker router
    │   ├── agents/
    │   │   ├── scraper.ts     ← regulatory feed ingestion
    │   │   └── heartbeat.ts   ← self-healing loop
    │   ├── modules/
    │   │   ├── regulatory.ts  ← Project 01 logic
    │   │   ├── attestation.ts ← Project 04 logic
    │   │   ├── vendor.ts      ← Project 02 logic
    │   │   └── incidents.ts   ← Project 03 logic
    │   └── db/
    │       └── schema.sql     ← unified D1 schema (all 5 tables)
    └── frontend/              ← Cloudflare Pages (Executive Hub)
        └── src/
```

The individual `CHARTER.md` files we already created can stay in their current locations as planning documents — they're still useful references even if the code lives in a single `acis/` directory.

---

## The D1 Schema — Completed View

The `acis.txt` file has 3 tables. Here's the full 5-table schema I'd add Projects 02 and 03 into:

```sql
-- From acis.txt (unchanged)
CREATE TABLE IF NOT EXISTS regulatory_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    published_date DATETIME,
    ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    risk_score INTEGER DEFAULT 0,
    summary TEXT,
    tags TEXT,
    remediation_steps TEXT
);

CREATE TABLE IF NOT EXISTS attestation_vault (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    pbm_name TEXT,
    rxdc_status TEXT DEFAULT 'Pending',
    gag_clause_status TEXT DEFAULT 'Not Started',
    last_contact_date DATETIME,
    r2_folder_path TEXT
);

CREATE TABLE IF NOT EXISTS agent_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    context_key TEXT UNIQUE,
    context_value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- NEW: Project 02
CREATE TABLE IF NOT EXISTS vendor_risk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_name TEXT NOT NULL,
    vendor_url TEXT NOT NULL,
    contact_email TEXT,
    tls_valid INTEGER,           -- boolean
    headers_score INTEGER,       -- 0-100 from header scan
    ai_risk_summary TEXT,        -- Claude's structured JSON analysis
    overall_status TEXT DEFAULT 'Pending SOC2 Review', -- 'Approved', 'High Risk'
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- NEW: Project 03
CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_type TEXT NOT NULL, -- 'Phishing', 'Data Exfiltration', 'Ransomware', etc.
    description TEXT,
    reporter TEXT,
    status TEXT DEFAULT 'Open',  -- 'Contained', 'Remediated', 'Closed'
    playbook TEXT,               -- Claude-generated NIST 800-61 JSON
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME
);
```

---

## Workflow Division Going Forward

Based on the Deployment Guide and Edge-Agent Stack docs, here's how we should split work:

| Tool | Use For |
|---|---|
| **Claude Code (me, terminal)** | Wrangler config, D1 migrations, Worker logic, backend agent code, deployments, debugging |
| **Cursor Composer (Cmd+I)** | UI scaffolding, frontend layout, visual dashboard components |
| **Cloudflare MCP (once set up)** | Live inspection of D1 data, Worker status, R2 bucket contents — directly from this terminal |

---

## Pre-Implementation Checklist (Before Writing a Single Line of Code)

These are the blockers. Nothing else should start until these are done:

1. **Set up Cloudflare MCP** in Claude Code settings
2. **Create GitHub repository** for ACIS (public, for portfolio visibility)
3. **Initialize git** in the compliance-portfolio directory and push initial structure
4. **Confirm Cloudflare account** has Workers, D1, R2, Pages, and AI Gateway enabled
5. **Confirm `wrangler` is installed** and authenticated (`wrangler whoami`)
6. **Decide on SendGrid vs Mailgun** for the attestation reminder emails (need API key)
7. **Confirm Anthropic API key** is accessible in the environment for Worker secrets

Once those 7 are checked off, Phase 1 (Agentic Foundation) can start immediately with real momentum and no blocked threads.

---

## The "Wow Factor" Prioritization

If the hiring manager only spends 5 minutes on the demo link, what do they need to see? In order of impact:

1. **Live Pulse with real data** — the scraper must be pulling actual CMS/HHS feeds, not mock data. Real regulatory updates are the credibility anchor.
2. **Attestation progress bar** — instantly communicates "I manage 50+ partners, here's the completion rate." Visceral and relevant.
3. **Agent Logs / Brain Log** — the AI reasoning visible on screen is a genuine differentiator. Most candidates show static dashboards; this shows a system thinking in real time.
4. **GitHub PR automation** — if there's time to build it, the demo of the system opening its own PR when a policy changes is a conversation stopper.
5. **Vendor risk scan** — impressive but lower priority than the HIPAA-specific features.

---

## One Open Question for the User

The Integrated Charter mentions "The Agent sends automated reminders to vendors with missing SOC 2 or HIPAA docs" in Phase 3. This combines the Attestation Vault (RxDC/Gag Clause partners) with the Vendor Risk Assessor (third-party vendors). Are these the same pool of contacts, or two distinct workflows? The answer changes whether we need one reminders system or two.
