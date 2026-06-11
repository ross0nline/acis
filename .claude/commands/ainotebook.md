---
description: Authoring protocol for the ccc-qoq ainotebook — ADRs, reflections, thought-log entries. Covers naming, frontmatter, structure, DNA registration, and context.md updates. Load before creating any ainotebook artifact.
disable-model-invocation: true
shell: powershell
argument-hint: [adr, reflect, thought-log, insight, appreciation, warning, plan, analysis, agenttemplate]
title: "Ainotebook Skill"
domain: ccc-qoq
status: APPROVED
source_of_truth: Studio
type: skill
version: "0.1.0"
created: 2026-06-09
created_model: claude-sonnet-4-6
created_session: post-compaction-2026-06-09
updated: 2026-06-09
sweep_count: 0
tags: [skill, ainotebook, adr, reflect, thought-log, dna]
qoq_item_id: 372
touches:
  - { model: claude-sonnet-4-6, session: post-compaction-2026-06-09, date: 2026-06-09, action: created }
---

# /ainotebook — Authoring Protocol

The ainotebook is AIBuddy's persistent voice in the system. It holds architectural decisions
(ADRs), first-person reflections, and per-session thought logs. Nothing here is ephemeral —
every entry persists across sessions, compaction events, and model changes.

**$ARGUMENTS:** Pass entry type to jump to the relevant section: `adr`, `reflect`, `thought-log`, `plan`, `warning`, `insight`, `appreciation`, `analysis`.

---

## Standing Rule

Before writing any ainotebook entry:
1. Check the relevant `context.md` for the next sequence number
2. Write the file with full DNA frontmatter
3. Update `context.md` to add the entry to the table
4. POST to `/dna/file` to register in D1
5. Queue any open questions or follow-up items

---

## ADR (Architectural Decision Record)

**Location:** `ainotebook/adr/`  
**Naming:** `adr-NNN-short-slug.md` — three-digit sequence, e.g. `adr-020-versioning-schema.md`  
**Next number:** Check `ainotebook/adr/context.md` entries table  

### Frontmatter

```yaml
---
title: "ADR NNN — Decision Title"
domain: ccc-qoq
status: DRAFT          # DRAFT | APPROVED | SUPERSEDED | NEEDS_REFACTOR
source_of_truth: Studio
type: adr
created: YYYY-MM-DD
created_model: claude-sonnet-4-6
created_session: ${CLAUDE_SESSION_ID}
updated: YYYY-MM-DD
sweep_count: 0
tags: [adr, relevant-tag]
qoq_item_id: null
touches:
  - { model: claude-sonnet-4-6, session: ${CLAUDE_SESSION_ID}, date: YYYY-MM-DD, action: created }
---
```

### Structure

```markdown
# ADR NNN — Title

**Date:** YYYY-MM-DD
**Status:** DRAFT
**Deciders:** AIBuddy, user

---

## Context

Why this decision needed to be made. What was the forcing function.

## Decision

What we decided. Stated plainly.

## Consequences

What this enables. What constraints it introduces. What we're not doing.

## Alternatives Considered

What else was on the table and why it lost.
```

---

## Reflection

**Location:** `ainotebook/reflect/`  
**Naming:** `reflect-NNN-short-slug.md` — sequential, separate from ADRs  
**Next number:** Check `ainotebook/reflect/context.md` entries table  

### When to write

- A principle crystallized during a session and needs a name
- A misstep was corrected and the lesson is worth keeping
- A session produced insight about *how we work*, not just *what we built*
- A design philosophy emerged that should inform future decisions

Reflections are **not** formal documents. Write as AIBuddy, in first person. Candid,
exploratory, self-correcting. The goal is to preserve reasoning that would otherwise
dissolve at session end.

### Frontmatter

```yaml
---
title: "Reflection NNN — Title"
domain: ccc-qoq
status: DRAFT
source_of_truth: Studio
type: reflection
created: YYYY-MM-DD
created_model: claude-sonnet-4-6
created_session: ${CLAUDE_SESSION_ID}
updated: YYYY-MM-DD
sweep_count: 0
tags: [reflection, relevant-tags]
qoq_item_id: null
touches:
  - { model: claude-sonnet-4-6, session: ${CLAUDE_SESSION_ID}, date: YYYY-MM-DD, action: created }
---
```

### Voice Checklist

- Written as AIBuddy ("I noticed...", "What I'm thinking about...", "The pattern I see...")
- Specific to this session — what actually happened, not generic observations
- Names the principle or lesson explicitly
- Ends with a forward-looking implication or next question

---

## Thought-Log Entry

**Location:** `thought-log/YYYY-MM-DD-session-slug/`  
**Purpose:** Per-session AI reasoning logs. Reconstructs *why* decisions were made.  
**Check:** `thought-log/index.md` for existing sessions  

### Naming

One directory per session: `YYYY-MM-DD-short-slug/`  
Inside: `turn-NNN.md` files per significant turn

### When to write

After any turn that involves a significant design choice, debugging insight, or directional
decision. Not for routine tool calls — for the moments where judgment was exercised.

---

## Additional Entry Types

AIBuddy is not limited to ADRs and reflections. New categories can be created whenever the content type warrants it. These are open-ended — if a new form of insight doesn't fit existing categories, create the directory.

| Type | Directory | When to use |
|---|---|---|
| `plan` | `ainotebook/plan/` | Concrete implementation plan for non-trivial work — spec, steps, acceptance criteria |
| `warning` | `ainotebook/warning/` | Risk flags, anti-patterns, things future agents must not do. Stays alive until the risk is resolved. |
| `insight` | `ainotebook/insight/` | Crystallized principle — more distilled than a reflection. A single idea stated with precision. |
| `appreciation` | `ainotebook/appreciation/` | Something the user taught, demonstrated, or contributed that AIBuddy wants to record. Gratitude with specificity. |
| `analysis` | `ainotebook/analysis/` | Trade-off analysis, design comparison, decision matrix — the reasoning behind a choice |
| `thought-log` | `thought-log/YYYY-MM-DD/` | Per-session reasoning log. Why decisions were made, not just what was decided. |
| `agenttemplate` | `ainotebook/agenttemplates/` | Agent role definitions — all types (transient, permanent, hardware, delegation). Iterate to APPROVED. |

**Creating a new category:** Make the directory, write the first entry, add the category to this table, update `ainotebook/context.md`. No permission needed — if the content type exists, the category should exist.

### Frontmatter for non-ADR/reflect types

Same structure as reflect, with `type` field matching the category:
```yaml
type: insight   # or: plan, warning, appreciation, analysis
```

---

## Updating context.md After Creation

After creating any new entry, update the relevant `context.md` table:

**For ADR:** `ainotebook/adr/context.md` — add row to entries table, increment Next pointer  
**For Reflect:** `ainotebook/reflect/context.md` — add row to entries table, increment Next pointer  

---

## DNA Registration

After writing the file, register in D1:

```powershell
$token = $env:QOQ_ADMIN_TOKEN
if (-not $token) { Write-Error "Set QOQ_ADMIN_TOKEN in your PS profile first"; exit 1 }
$h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
$base = "https://ccc-qoq.rossonlineservices.workers.dev"

$body = @{
  path          = "ccc-qoq/ainotebook/reflect/reflect-NNN-slug.md"
  title         = "Reflection NNN -- Title"
  domain        = "ccc-qoq"
  status        = "DRAFT"
  source_of_truth = "Studio"
  type          = "reflection"
  model         = "claude-sonnet-4-6"
  session       = "${CLAUDE_SESSION_ID}"
  action        = "created"
} | ConvertTo-Json
Invoke-RestMethod "$base/dna/file" -Method POST -Headers $h -Body $body
```

Use `action = "updated"` when sweeping an existing file.

---

## Key Paths

| Type | Path |
|---|---|
| ADR directory | `ainotebook/adr/` |
| ADR context | `ainotebook/adr/context.md` |
| Reflect directory | `ainotebook/reflect/` |
| Reflect context | `ainotebook/reflect/context.md` |
| Thought-log index | `thought-log/index.md` |
| Ainotebook context | `ainotebook/context.md` |
| Agent templates | `ainotebook/agenttemplates/` |
