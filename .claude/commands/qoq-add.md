---
description: Bulk queue item creation via qoq-add.ps1. Use whenever queuing 2 or more items in the same turn, or any batch of related items. Bypasses the 900-byte PowerShell command limit.
disable-model-invocation: true
shell: powershell
argument-hint: [post-compaction]
title: "QOQ-Add Skill"
domain: ccc-qoq
status: APPROVED
source_of_truth: Studio
type: skill
version: "0.1.1"
created: 2026-06-09
created_model: claude-sonnet-4-6
created_session: 97461d8c-a6fc-433f-8294-baa47fb406e7
updated: 2026-06-09
sweep_count: 1
tags: [skill, qoq, queue, batch, qoq-add]
qoq_item_id: null
touches:
  - { model: claude-sonnet-4-6, session: 97461d8c-a6fc-433f-8294-baa47fb406e7, date: 2026-06-09, action: created, notes: "Migrated from .claude/commands/qoq-add.md" }
  - { model: claude-sonnet-4-6, session: post-compaction-2026-06-09, date: 2026-06-09, action: swept, notes: "Added hybrid DNA frontmatter; version 1.1.0 marks first sweep" }
---

# /qoq-add — Bulk Queue Item Creation

Use for any batch of 2+ items. Writes a JSON file and runs qoq-add.ps1 — no inline
JSON size limits, full field support, optional dry-run and KV regeneration.

---

## Steps

### 1. Write the JSON file

```powershell
$items = @'
[
  {
    "title": "First item title",
    "stage": "idea",
    "domain": "ccc-qoq",
    "parent_id": null,
    "description": "optional detail"
  },
  {
    "title": "Second item title",
    "stage": "queued",
    "domain": "ccc-qoq",
    "parent_id": 95,
    "target_date": "2026-07-01"
  }
]
'@
$items | Out-File "$env:TEMP\qoq-batch.json" -Encoding utf8
```

### 2. Dry run (optional — recommended for large batches)

```powershell
& "C:\Scripts\qoq-add.ps1" "$env:TEMP\qoq-batch.json" -DryRun
```

### 3. Execute

```powershell
& "C:\Scripts\qoq-add.ps1" "$env:TEMP\qoq-batch.json"
```

### 4. Execute with KV regeneration (use for last batch of a session)

```powershell
& "C:\Scripts\qoq-add.ps1" "$env:TEMP\qoq-batch.json" -Regenerate
```

`-Regenerate` forces a fresh KV artifact build. Use at session end. Omit mid-session
to preserve the server-side 60-second debounce.

---

## All Available Fields

| Field | Type | Notes |
|---|---|---|
| `title` | string | **Required** |
| `stage` | string | `idea` `queued` `active` `blocked` `done` `dropped` |
| `domain` | string | `ccc-qoq` `acis` `nba-neutral` `ccc-admin` `personal` |
| `parent_id` | number or null | parent queue node ID |
| `description` | string | detail, context, or rationale |
| `target_date` | string | `"YYYY-MM-DD"` — surfaces in urgent artifact |
| `title_short` | string | abbreviated label for compact views |
| `priority` | number | float — lower = higher priority |
| `linked_paths` | string | JSON array string: `"[\"src/foo.ts\"]"` |
| `git_ref` | string | commit SHA or branch when item was completed |
| `completion_note` | string | what was actually shipped |
| `last_verified_at` | string | `"YYYY-MM-DD"` — last accuracy review |
| `created_by` | string | defaults to `AIBuddy` |

---

## Root-Level Convention

Root items = major projects: NBA-NEUTRAL=1, ACIS=35, CCC-QOQ=50, CCC-ADMIN=149, IDEAS=150.

New items should always have a parent. If the right parent is unclear, default to IDEAS (150).
IDEAS is the staging area for parent-worthy ideas that haven't found their permanent home yet.

---

## Tips

- Use `$env:TEMP\qoq-batch.json` — no cleanup needed, temp files are ephemeral
- Build hierarchy in two passes: first creates parents, second uses returned IDs as `parent_id`
- Script reports `id=NNN` per created item — use those for follow-up PATCH calls
- Split very large batches into logical groups of 10–20 items per file
