---
title: "qoq-add"
created_model: claude-sonnet-4-6
created_session: 78e6e2b4-34df-4c73-852c-d71397a90c55
sweep_count: 0
---

# /qoq-add — Bulk Queue Item Creation

Use whenever you have 2+ items to queue in the same turn. Writes a JSON array to a
temp file and runs `qoq-add.ps1`, which bypasses the 965-byte PowerShell command limit.

## When to use

- Queuing 2 or more items in the same turn
- Queuing a batch of related items with a shared parent
- Any time you would have made multiple separate `Invoke-RestMethod POST /items` calls

## Steps

### 1. Write the JSON file

Only `title` is required per item. All other fields are optional.

```powershell
$items = @'
[
  { "title": "First item" },
  { "title": "Second item", "description": "extra detail" },
  { "title": "Child with explicit parent", "parent_id": 95 }
]
'@
$items | Out-File "$env:TEMP\qoq-batch.json" -Encoding utf8
```

### 2. Run with defaults (recommended for related batches)

Use `-Parent`, `-Domain`, `-Stage` to apply shared values to every item that doesn't
already set those fields. Per-item values always win over defaults.

```powershell
# All items get parent_id=50, domain=ccc-qoq, stage=queued — unless item overrides
& "C:\Scripts\qoq-add.ps1" "$env:TEMP\qoq-batch.json" -Parent 50 -Domain ccc-qoq -Stage queued
```

### 3. Dry run first (optional)

```powershell
& "C:\Scripts\qoq-add.ps1" "$env:TEMP\qoq-batch.json" -Parent 50 -Domain ccc-qoq -DryRun
```

Dry run prints each item's title and resolved JSON — confirm before committing.

### 4. With KV regeneration (end-of-session batches)

```powershell
& "C:\Scripts\qoq-add.ps1" "$env:TEMP\qoq-batch.json" -Parent 50 -Domain ccc-qoq -Stage queued -Regenerate
```

`-Regenerate` calls `POST /admin/regenerate` after all items are created. Use for the
last batch of a session. Omit for mid-session batches (preserves server-side debounce).

## All supported item fields

| Field | Type | Notes |
|---|---|---|
| `title` | string | **Required** |
| `stage` | string | `idea` `queued` `active` `blocked` `done` `dropped` |
| `domain` | string | `ccc-qoq` `acis` `nba-neutral` `ccc-admin` `personal` |
| `parent_id` | number | parent queue node ID |
| `description` | string | detail, context, or rationale |
| `target_date` | string | `"YYYY-MM-DD"` |
| `title_short` | string | abbreviated label (25 chars max) |
| `priority` | number | float — lower = higher priority |
| `linked_paths` | string | pre-stringified JSON array: `"[\"src/foo.ts\"]"` |
| `git_ref` | string | commit SHA or branch |
| `completion_note` | string | what was shipped |
| `last_verified_at` | string | `"YYYY-MM-DD"` |
| `created_by` | string | defaults to `AIBuddy` |

## Root-level convention

Root items = major projects (NBA-NEUTRAL=1, ACIS=35, CCC-QOQ=50, CCC-ADMIN=149, IDEAS=150).
New items should have a parent. If unclear, use IDEAS=150 as a staging area.
The script warns on parentless items — treat it as a prompt, not a hard block.

## Key parents

| Area | ID |
|---|---|
| CCC-QOQ root | 50 |
| IDEAS (staging) | 150 |
| CCC-ADMIN | 149 |
| ACIS | 35 |
| NBA-NEUTRAL | 1 |
| LEAD MAGNETS root | 554 |

## Tips

- `$env:TEMP\qoq-batch.json` — no cleanup needed, temp files are ephemeral
- Two-pass for hierarchy: first pass creates parents, capture IDs, second pass sets `parent_id`
- Script prints `id=NNN` per item — use those IDs for follow-up PATCH calls
- Split very large batches into groups of 10–20 items per file
