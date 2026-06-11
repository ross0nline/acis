---
title: "Queuing Skill — When, What, and How to Queue"
domain: ccc-qoq
status: APPROVED
source_of_truth: Studio
type: skill
version: "0.1.0"
created: 2026-06-09
created_model: claude-sonnet-4-6
created_session: post-compaction-2026-06-09-b
updated: 2026-06-09
sweep_count: 0
tags: ["skill","queuing","standing-orders"]
qoq_item_id: null
updated: 2026-06-10
touches:
  - { model: claude-sonnet-4-6, session: post-compaction-2026-06-09-b, date: 2026-06-09, action: created }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-10, action: updated, notes: "Added full provenance section: linked_paths, metadata.session_id, source_type — every item must carry its origin" }
---

# /queuing — Per-Turn Queue Scan Protocol

Run mentally every turn. The queue is the memory of everything we care about.
If it isn't queued, it doesn't exist for future agents.

---

## The Scan — Run Every Turn

Before responding, scan the current message and your own work for these triggers:

| Trigger | Queue as | Example |
|---|---|---|
| New capability or feature mentioned | `idea` under relevant parent | "We could also add X" |
| Open question left unanswered | `idea` under IDEAS (150) | "Should we use DO here?" |
| "We should revisit this" | `queued` child of current item | Any deferred decision |
| Competing approach discussed but not chosen | `idea` | Architecture alternatives |
| Dependency identified | `queued` with description | "Need X before Y" |
| Task too large for current turn | `queued` under current parent | Anything that takes >1 turn |
| Vision element shared by user | `idea` under relevant parent | ESP32-S3 voice interface |
| Bug or error discovered | `queued` as fix | Missing logEvent call |
| Architecture decision made | `idea` as ADR candidate | "We chose X because Y" |
| Skill gap identified | `idea` under IDEAS (150) | "Testing sub-agents is a skill" |
| Sequence step outlined | `queued` child of current milestone | The 4-step event detection plan |

**Rule:** When in doubt, queue it. A queued idea costs nothing. An unqueued idea is lost.

---

## Provenance — Every Item Must Know Its Origin

Every queue item must carry enough information for a cold-start agent to trace it back to its source.
A title and description are not enough. Populate ALL of these:

| Field | When to set | How |
|---|---|---|
| `description` | Always | Why it matters, what it unblocks, the context that generated it |
| `linked_paths` | When signal came from a file | JSON array: `"[\"research/external/foo.md\"]"` — all source files |
| `metadata.session_id` | Always | The session UUID that created this item |
| `metadata.turn` | When identifiable | The turn within the session (if trackable) |
| `metadata.source_type` | Always | `"user_message"` \| `"file_synthesis"` \| `"code_review"` \| `"observation"` \| `"error_found"` |

**The rule:** An item with `linked_paths=null` and no session context is an orphan. Future agents cannot
follow the trail. A well-linked item takes 10 extra seconds to create and saves hours of archaeology.

An unlinked item is a dead end. A linked item is a map.

---

## How to Queue

**Single item (PowerShell):**
```powershell
$body = @{
  title         = "Short, scannable title"
  stage         = "idea"        # idea | queued | active
  domain        = "ccc-qoq"    # nba-neutral | acis | ccc-admin | ccc-qoq | personal
  parent_id     = 150           # IDEAS=150, or closest logical parent
  priority      = 5             # float; lower = higher priority within parent
  description   = "Why this matters and what it unblocks. Include context of how this was discovered."
  linked_paths  = "[\"research/external/source.md\"]"   # omit if no source file
  metadata      = "{\"session_id\":\"SESSION-UUID\",\"source_type\":\"file_synthesis\"}"
} | ConvertTo-Json
Invoke-RestMethod "$base/items" -Method POST -Headers $h -Body $body -ContentType "application/json"
```

**Batch items:** Use `/qoq-add` skill for 3+ items.

**Parent selection:**
- Known project node → use it
- Cross-project or unclear → IDEAS (150)
- Personal/IP/strategy → personal domain, IDEAS parent
- Compliance/ACIS → ACIS root (35)
- ccc-qoq system work → CCC-QOQ root (50) or current focus

---

## Reporting

Always report queued IDs before responding to the user:
```
Queued: id=436 (renderSessionContext impl), id=437 (moveHandler logEvent fix)
```

If you missed queue candidates, acknowledge and catch up immediately — don't wait for the next turn.

---

## Priority Estimation

Within a parent, use float priority:
- `1.0` — must-do before anything else in this parent
- `3.0` — important, next logical step
- `5.0` — normal queue order
- `7.0` — nice-to-have, revisit when focus reaches it
- `9.0` — idea, no urgency

Lower float = higher priority. Position = priority. Depth = scope.

---

## What NOT to Queue

- Work that's already queued (check before adding duplicates)
- Ephemeral task details that belong in the current conversation only
- Code patterns or conventions (those go in skills or CLAUDE.md)
- Things that are genuinely done and closed

---

## Full taxonomy reference
See [queue-taxonomy.md](../qoq/queue-taxonomy.md)
