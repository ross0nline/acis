# CCC Meta-System: Architectural Thoughts & Recommendations

*2026-04-24 — Response to user's concept of a global CCC admin layer*

---

## What You're Actually Describing

You're not just asking for a project tracker. You're describing a **living system of record** for every CCC project you will ever build — one that:

- Knows about every project, its modules, its features, its tech stack
- Tracks the lifecycle of each piece (Uninitiated → Pending → Implemented → Updated) with timestamps and versions
- Lets you see the full picture from one URL
- Propagates changes dynamically (update a module status → parent project reflects it instantly)
- Is itself a CCC project, built on the same stack

The AppSheet/Sheets analogy is exactly right. The translation is:

| AppSheet Concept | CCC Equivalent |
|---|---|
| Google Sheets | Cloudflare D1 (relational SQL) |
| Linked sheets with foreign keys | D1 tables with JOINs + foreign keys |
| AppSheet UI | Cloudflare Pages (the admin dashboard) |
| Dynamic field updates on row change | Worker API that cascades status changes |
| Form views / table views | Dashboard panels per project/module |
| Formula columns | Computed fields via Worker logic |

The difference is this is production-grade infrastructure, not a spreadsheet — it scales without hitting row limits, it's real-time, and it's yours.

---

## The Core Architectural Insight

**The CCC Admin must be built BEFORE ACIS.** Here's why:

If ACIS is built first with its own D1 schema and then you try to bolt a meta-admin on top, you will have to:
- Restructure ACIS's database
- Add inter-project communication retroactively
- Rewrite the Executive Hub to talk to an external system

If you build the CCC Admin first, ACIS wires into it from day one. Every future project follows the same pattern. You never touch the wiring again — you just add rows.

This is the "scalable foundation" principle you described. The admin layer IS the foundation.

---

## Three-Option Architecture Analysis

### Option A: CCC Admin Embedded in ACIS
All meta-tables live in ACIS's D1 database. The ACIS Executive Hub doubles as the CCC Admin.

- **Pro:** Simple to start, one database, one deployment
- **Con:** Future projects can't have their own D1 — they'd all share ACIS's database across project boundaries. This breaks isolation and becomes a nightmare to manage at scale.
- **Verdict:** Don't do this. It's the "duct tape now, rewire later" path.

### Option B: CCC Admin as Separate Standalone Project
CCC Admin has its own Worker, D1 database, and Pages frontend. Projects report to it via public API.

- **Pro:** Clean separation, fully independent
- **Con:** Requires each project to make HTTP calls to an external service to report status. Network dependency between projects.
- **Verdict:** Viable but adds latency and complexity for inter-project communication.

### Option C: CCC Admin with Cloudflare Service Bindings (Recommended)
CCC Admin has its own D1 + Pages. Individual project Workers connect to it via **Cloudflare Service Bindings** — a zero-latency, zero-network, in-edge RPC mechanism. ACIS's Worker calls the CCC Admin Worker directly, like a function call, not an HTTP request.

- **Pro:** True separation of concerns. Each project has its own D1 for operational data. The CCC Admin D1 holds only meta-level data. Updates are atomic and near-instant. Scales to any number of projects without changing the wiring.
- **Con:** Slightly more `wrangler.toml` configuration upfront.
- **Verdict:** This is the right answer. Build it once, wire it right.

---

## Recommended Schema: CCC Admin D1

This is the relational backbone of everything. Designed to be normalized, linkable, and extensible without schema changes.

```sql
-- The universe of CCC projects
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,        -- e.g., 'acis', 'vendor-portal'
    description TEXT,
    status TEXT DEFAULT 'Uninitiated', -- Uninitiated|Active|Paused|Complete|Archived
    github_url TEXT,
    pages_url TEXT,
    worker_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tech stack items (normalized lookup table)
CREATE TABLE tech_stack (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,               -- e.g., 'Cloudflare D1', 'TypeScript', 'React'
    category TEXT,                    -- 'Compute'|'Database'|'Frontend'|'AI'|'DevOps'|'Email'
    version TEXT,
    docs_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many: which projects use which tech
CREATE TABLE project_tech_stack (
    project_id INTEGER REFERENCES projects(id),
    tech_id INTEGER REFERENCES tech_stack(id),
    PRIMARY KEY (project_id, tech_id)
);

-- Modules within a project (the functional building blocks)
CREATE TABLE modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,                    -- 'Backend'|'Frontend'|'Database'|'DevOps'|'AI'|'Agent'
    current_status TEXT DEFAULT 'Uninitiated',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full version history of every module (the audit trail)
CREATE TABLE module_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL REFERENCES modules(id),
    version TEXT NOT NULL,            -- e.g., '1.0.0', '1.1.0'
    status TEXT NOT NULL,             -- Uninitiated|Pending|Implemented|Updated|Deprecated
    notes TEXT,
    changed_by TEXT,                  -- 'Claude Code'|'Cursor'|'Manual'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Individual features within a module
CREATE TABLE features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL REFERENCES modules(id),
    name TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'Medium',   -- 'Critical'|'High'|'Medium'|'Low'
    status TEXT DEFAULT 'Uninitiated',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sub-agents defined per module
CREATE TABLE sub_agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    module_id INTEGER REFERENCES modules(id),
    name TEXT NOT NULL,
    purpose TEXT,
    system_prompt TEXT,
    trigger_type TEXT,                -- 'Cron'|'Webhook'|'Manual'|'Event'
    status TEXT DEFAULT 'Uninitiated',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Service connections and credentials inventory (no secret values stored)
CREATE TABLE connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    service_name TEXT NOT NULL,       -- 'Cloudflare AI Gateway'|'Resend'|'GitHub'|'Anthropic'
    connection_type TEXT,             -- 'MCP'|'API'|'Service Binding'|'Wrangler Secret'
    status TEXT DEFAULT 'Uninitiated', -- Uninitiated|Configured|Active|Error
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Event log: every status change, deployment, or agent action across all projects
CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    module_id INTEGER REFERENCES modules(id),
    event_type TEXT NOT NULL,         -- 'StatusChange'|'Deployment'|'AgentAction'|'PROpened'|'Error'
    description TEXT,
    triggered_by TEXT,                -- 'Claude Code'|'Cron'|'GitHub'|'Manual'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Why This Schema Is "Never Rewire" Compliant

- Adding a new project = one INSERT into `projects`, zero schema changes
- Adding a new module = one INSERT into `modules`, zero schema changes
- New tech stack item = INSERT into `tech_stack`, link via `project_tech_stack`
- Every status change is a new row in `module_versions` — you always have the full history
- `activity_log` is your audit trail across everything — what changed, when, by what
- Foreign keys ensure referential integrity — delete a project, its modules, features, and connections cascade

---

## What the CCC Admin Dashboard Shows

The Cloudflare Pages frontend for the CCC Admin is the single URL you visit to see everything:

**View 1: Portfolio Overview**
- All projects as cards: name, status badge, last updated, live URL
- Filter by: status, tech stack, active/archived

**View 2: Project Detail**
- Modules list with current status and version
- Tech stack used
- Active connections / integrations
- Activity log (timestamped event feed)
- Link to GitHub repo, live app

**View 3: Module Drill-Down**
- Version history with timestamps (what changed, when, by what tool)
- Features within this module and their statuses
- Sub-agents attached to this module

**View 4: Tech Stack Registry**
- All technologies used across all projects
- Which projects use what
- Version tracking

**View 5: Global Activity Feed**
- Cross-project timeline: every deployment, status change, agent action
- Filter by project, event type, or date range

---

## How Projects Self-Report to the Admin

When ACIS (or any future project) performs an action, its Worker sends a status update to the CCC Admin via Service Binding:

```typescript
// Inside any project Worker (e.g., ACIS)
// When a module status changes:
await env.CCC_ADMIN.updateModuleStatus({
  project_slug: 'acis',
  module_name: 'CMS Scraper',
  new_status: 'Implemented',
  version: '1.0.0',
  changed_by: 'Claude Code'
});
```

This writes to `module_versions`, updates `modules.current_status`, and logs to `activity_log` — all atomically, all in one call. The dashboard reflects it immediately.

---

## Revised Sequencing: What Comes First

The foundation steps don't change, but we add **two steps before scaffolding ACIS:**

**After foundation connections are confirmed (Steps 1-12):**

- **Step 13 — Design CCC Admin schema** (finalize the schema above based on any feedback)
- **Step 14 — Create CCC Admin as Project #0:** GitHub repo, D1, Worker, Pages deployment
- **Step 15 — Seed CCC Admin with ACIS data:** Register ACIS as Project #1 with its modules, tech stack, and connections
- **Step 16 — Verify CCC Admin dashboard shows ACIS:** The admin is live before ACIS code is written
- **Step 17 — Begin ACIS Phase 1 (Agentic Foundation):** Now every ACIS status change is visible in the CCC Admin from the start

---

## One Important Design Decision to Confirm

The CCC Admin needs its own GitHub repo and Cloudflare Pages deployment. Should it be:

**A)** A separate repo (`ccc-admin`) — keeps it completely independent  
**B)** A monorepo that contains both CCC Admin and all projects as sub-directories  
**C)** The current `compliance-portfolio` repo with a `ccc-admin/` folder added  

My recommendation is **A** — a separate `ccc-admin` repo. Reasons:
- The admin is infrastructure, not a compliance project
- It should be deployable independently of any project
- Future projects should reference it, not be co-located with it
- Clean git history per project

But this is a global architecture decision that's worth your explicit sign-off before I create any repos.
