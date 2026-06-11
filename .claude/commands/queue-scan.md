---
title: "queue-scan"
type: skill
domain: ccc-qoq
status: APPROVED
source_of_truth: Studio
created: 2026-06-09
created_model: claude-sonnet-4-6
created_session: 97461d8c-a6fc-433f-8294-baa47fb406e7
updated: 2026-06-11
sweep_count: 1
qoq_item_id: 573
touches:
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-2, date: 2026-06-11, action: updated, notes: "Added completion protocol section (#573) — completion_note + git_ref required when closing items" }
---

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
For each queueable item, decide:
- Parent: which project root or milestone owns it?
- Stage: `queued` (concrete, will be done) or `idea` (exploratory)
- Domain: ccc-qoq | acis | nba-neutral | ccc-admin | personal
- Priority: within parent context

### 4. Queue everything before acting
Write all items to a temp JSON file → `qoq-add <file>`.
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
| IDEAS (staging) | 150 |
| CCC-ADMIN | 149 |
| ACIS | 35 |
| NBA-NEUTRAL | 1 |

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
