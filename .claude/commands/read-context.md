---
description: Load project context files to orient a cold-start agent or sub-agent. Discovers the relevant context.md hierarchy for the current working area. Run at session start or when entering an unfamiliar part of the codebase.
disable-model-invocation: false
shell: powershell
argument-hint: []
title: "Read-Context Skill"
domain: ccc-qoq
status: APPROVED
source_of_truth: Studio
type: skill
version: "0.1.0"
created: 2026-06-09
created_model: claude-sonnet-4-6
created_session: post-compaction-2026-06-09
updated: 2026-06-09
sweep_count: 3
tags: [skill, context, cold-start, memory, position-addressed]
qoq_item_id: 373
---

# /read-context — Context File Loading Protocol

**For cold-start agents:** Your context window is empty. This skill tells you what to read
to reconstruct working knowledge of this project without replaying the entire conversation.

**For warm sessions:** Run when entering a new subdirectory or work area you haven't touched
this session.

---

## Standing Orders

If you loaded this skill without running `/qoq` first, standing orders are not yet active.
Activate them now:

**[../.claude/skills/standing-orders.md](../standing-orders.md)**

Read that file. Standing orders apply from the next turn.

---

## Why This Exists

The context window is ephemeral. Compaction erases it. Sub-agents don't inherit it.
Every session starts cold. Context files are the persistent layer — they sit in the file
system and accumulate knowledge across sessions.

**Position-addressed memory:** The path IS the context. When you open
`ccc-qoq/research/architecture/ccc-qoq-system-design.md`, the path has already told you:
this is ccc-qoq, it's research, it's architecture, it's system design. CLAUDE.md cascades
from root. context.md at each layer adds specificity. You don't need to re-derive what
you're working on — you read where you are.

---

## Load Order (Most to Least Foundational)

1. **`CLAUDE.md`** — Global role, stack, working conventions, current system state
2. **`memory/MEMORY.md`** — User preferences, project state, feedback patterns (auto-loaded)
3. **`memory/post_compaction_review.md`** — Current in-flight work, live state
4. **`memory/focus_state.md`** — Current focus node; compare to live `GET /focus` for drift
5. **Project context** — Relevant `context.md` file for the subdirectory you're entering

---

## Key Context Files by Work Area

```
.claude/
  machine-context.md          # Machine: OS, PS5.1 constraints, encoding, PATH scripts
  skills/context.md            # Skills directory: all available /skills, what each does

ccc-qoq/
  research/context.md                      # Research dir overview
  research/architecture/context.md         # Architecture docs index
  research/compact/system-state.md         # LIVE system state — read this
  research/compact/conventions.md          # Domain vocab, stages, root convention
  research/compact/architecture-gap-analysis.md  # What's built vs not
  research/external/video-synthesis-2026-06-08.md  # Video synthesis — workflow insights
  research/philosophy/qoq-spirit.md        # The spirit and principles of QOQ

  ainotebook/context.md                    # AIBuddy notebook overview
  ainotebook/adr/context.md                # ADR index + next number
  ainotebook/reflect/context.md            # Reflection index + next number

  .claude/skills/qoq/queue-taxonomy.md     # Queue categories + per-turn scan protocol
  docs/queue-taxonomy.md                   # Public-facing taxonomy doc
```

---

## Reading Protocol

### Quick orient (< 2 min)
```powershell
# 1. Current focus + queue state
$token = $env:QOQ_ADMIN_TOKEN
if (-not $token) { Write-Error "Set QOQ_ADMIN_TOKEN in your PS profile first"; exit 1 }
$h = @{ Authorization = "Bearer $token" }
Invoke-RestMethod "https://ccc-qoq.rossonlineservices.workers.dev/focus" -Headers $h
```
Then read `memory/post_compaction_review.md` and `memory/focus_state.md`.

### Deep orient (entering new work area)
1. Read the `context.md` for the subdirectory you're entering
2. Read 1–2 of the files it indexes that are most relevant to the current task
3. Check `research/compact/system-state.md` for current build state

### Sub-agent brief
Spawn a sub-agent with explicit file paths rather than conversation context.
Include: the relevant `context.md`, the specific files they'll touch, and the task.
A well-briefed sub-agent at file-read depth beats an unbriefed sub-agent at conversation depth.

---

## Context Maintenance Protocol

When you create or significantly modify a file in a subdirectory:
1. Check if that directory has a `context.md`
2. If yes, add or update the entry for the file
3. If no, consider whether the directory is growing enough to warrant one

Context files are cheap to write and expensive to lack. When in doubt, add one.

---

## Checking for Drift

At session start or after compaction, compare memory focus state to live:

```powershell
$token = $env:QOQ_ADMIN_TOKEN
if (-not $token) { Write-Error "Set QOQ_ADMIN_TOKEN in your PS profile first"; exit 1 }
$h = @{ Authorization = "Bearer $token" }
$live = Invoke-RestMethod "https://ccc-qoq.rossonlineservices.workers.dev/focus" -Headers $h
Write-Host "Live focus: $($live.data.focus.title)"
# Compare to memory/focus_state.md
```

If memory says one focus and live says another, the user changed focus manually.
Update memory/focus_state.md to match live and proceed with the live focus.

<!-- dna-touches
  - { model: claude-sonnet-4-6, session: post-compaction-2026-06-09, date: 2026-06-09, action: created }
  - { model: claude-sonnet-4-6, session: fix-393, date: 2026-06-09, action: updated, notes: "Added standing orders reference section (fix item 393 — silo problem)" }
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-3, date: 2026-06-12, action: swept, notes: "Corrected sweep_count to match touches length (#662 audit)" }
-->