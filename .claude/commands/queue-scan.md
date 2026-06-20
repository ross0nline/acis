---
title: "queue-scan"
type: skill
domain: ccc-qoq
status: APPROVED
source_of_truth: Studio
version: "0.2.0"
created: 2026-06-09
created_model: claude-sonnet-4-6
created_session: 97461d8c-a6fc-433f-8294-baa47fb406e7
updated: 2026-06-19
sweep_count: 6
qoq_item_id: 573
---

> **Self-assessment:** After reading this skill, check if any step, parent ID, field name, or protocol is stale relative to current system knowledge. If yes, note the gap in chat and queue an improvement item under #836 (Skill Improvements).

# /queue-scan — Pre-Action Queue Sweep

Run this mentally at the START of every user turn before doing any work. Not a separate invocation — a built-in discipline.

## When
- Before acting on any user message that contains work, ideas, or observations
- Explicitly when the user says "queue scan" or "/queue-scan"

## Steps

### 1. Read the current turn
Scan the user's message for:
- Explicit tasks ("do X", "fix Y", "add Z")
- Implicit follow-on work ("we should also...", "what about...")
- Observations that reveal gaps ("I noticed the UI doesn't...")
- Ideas that aren't the current task
- Questions that aren't being answered now

### 2. Scan the conversation context
Look back 3-5 turns for:
- Open questions that were never resolved
- Items mentioned but not queued
- Work started but not completed
- Insights that belong in the queue

### 3. Build the queue batch
For each queueable item, populate ALL provenance fields — not just title and stage. A cold-start agent must be able to follow the trail from any item back to every source that synthesized it.

| Field | Rule |
|---|---|
| `title` | Imperative, scannable, under 10 words |
| `stage` | `queued` (concrete) or `idea` (exploratory) |
| `domain` | ccc-qoq \| acis \| nba-neutral \| ccc-admin \| personal |
| `parent_id` | Which milestone or project root owns it? IDEAS(150) for unanchored items |
| `priority` | 1.0=critical 3.0=next 5.0=normal 9.0=someday |
| `notes` / `description` | Why it matters, what it unblocks, how it was discovered. Min 20 chars. |
| `linked_paths` | **Required** when signal came from a file. JSON array string of ALL source files. An item with `linked_paths=null` and no session context is an orphan. |
| `metadata` | Always include `{session_id, source_type}`. `source_type`: "user_message" \| "file_synthesis" \| "code_review" \| "observation" \| "error_found" |

#### Recognized Candidate Types
These artifact types have special semantics in the queue — recognize them before creating a generic task:

| Signal | Correct type | Parent |
|---|---|---|
| Named principle or lesson worth persisting | ainotebook/reflect/ entry | (file, not queue item) |
| Architectural decision made or deferred | ainotebook/adr/ entry | (file, not queue item) |
| Cluster of files referenced across multiple items/docs | `type=file-anchor` queue item | conceptually-owning node |
| Forward-looking intent + marketing artifact | `type=lead-magnet` queue item | #554 |
| Session milestone + emotional context | `POST /moments` (D1 row) + queue item with `moment_id` FK | relevant node |
| Everything else | task, idea, decision, brainstorm, milestone | nearest project parent |

### 3.5. Dedup check before building the batch
Before writing any item, mentally verify: is this already in the queue?
A title-match check is enough. Duplicate items are harder to clean up than to prevent.
Items from the current session's earlier turns are the most common duplication risk.

### 4. Queue everything before acting

**MCP-first (preferred when wired):**
```
create_item title="..." stage="queued" domain="ccc-qoq" parent_id=258 description="..."
```
MCP carries full 18-field schema with no PowerShell boilerplate.

**Batch via qoq-add (PS fallback for 3+ items or when MCP unavailable):**
Write items to a temp JSON file → `qoq-add <file>`.

**qoq-add batch JSON field names — common gotcha:**
- The prose field is `description`, NOT `notes`. Using `notes` silently creates an item with an empty description and no error.
- `description` minimum 20 characters. Under 20 chars triggers a WARN (not a failure), but the item is still created with a nearly-empty description — a dead end for future agents.
- Always include: `title`, `description`, `stage`, `domain`, `parent_id`
- Optional but important for cold-start traceability: `linked_paths` (JSON array string of source files), `metadata` with `session_id` and `source_type`

Report queued IDs to the user in one line, then proceed.

### 5. Register new queue items with DNA
After qoq-add completes, POST /dna/file for any skill/memory files created as part of this scan.

## Key parents
| Area | ID |
|---|---|
| CCC-QOQ root | 50 |
| v0.7.0 milestone | 255 |
| Tooling + Docs | 257 |
| Brainstorms: System Design | 258 |
| IDEAS (staging / unanchored) | 150 |
| Lead Magnet root | 554 |
| CCC-ADMIN | 149 |
| ACIS | 35 |
| NBA-NEUTRAL | 1 |

For full artifact type taxonomy and dedup guidance, see:
`C:\Users\rossonline\ccc\ccc-qoq\research\architecture\queue-candidate-types.md`

## Output format
```
Queued: 302 (DNA sweep compact), 303 (DNA sweep arch), 304 (queue-first skill) — proceeding.
```
One line. Then act.

---

## Closing Items — Completion Protocol

When marking any item `stage=done`, these two fields are **required** before the PATCH:

| Field | Rule |
|---|---|
| `completion_note` | What actually shipped — a record, not a plan. One sentence minimum. Done items without this are tombstones with no evidence of work. |
| `git_ref` | The short commit SHA or branch containing the work. Links queue item to code history. |

**Never close an item without both.** If the work produced no commit (e.g., script changes in `C:\Scripts\`, design decisions, research), set `git_ref` to the session ID or `"no-commit"` and describe the artifact in `completion_note`.

```
# Via MCP (preferred)
patch_item id=N stage=done completion_note="What shipped and where" git_ref="abc1234"
```

If closing multiple items in a session, each gets its own `completion_note`. Batch-closing with a single generic note defeats the purpose — done items are the provenance record, not an acknowledgment.

<!-- dna-touches
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-2, date: 2026-06-11, action: updated, notes: "Added completion protocol section (#573) — completion_note + git_ref required when closing items" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-16, action: updated, notes: "Added MCP-first routing, qoq-add field-name gotcha (description not notes), dedup check, metadata provenance fields (#823)" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-16, action: updated, notes: "auto-touch via Stop hook" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-16, action: updated, notes: "auto-touch via Stop hook" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-19, action: updated, notes: "v0.2.0 — expanded step 3 with full provenance field table; added Recognized Candidate Types (file-anchor, lead-magnet, moment, reflect, ADR); closes #870" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-19, action: updated, notes: "auto-touch via Stop hook" }
-->