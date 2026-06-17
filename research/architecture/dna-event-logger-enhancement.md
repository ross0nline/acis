---
title: "DNA Event Logger Enhancement Proposal"
type: research
domain: ccc-qoq
status: DRAFT
created: 2026-06-12
created_model: claude-sonnet-4-6
created_session: post-78e6e2b4-compaction-3
qoq_item_id: 659
sweep_count: 1
---

# DNA Event Logger — Enhancement Proposal

Findings from a live D1 schema audit (2026-06-12). Current schema is more complete than current protocol compliance — the gaps are enforcement failures, not design failures.

---

## Current Schema (dna_touches)

```sql
CREATE TABLE dna_touches (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id       INTEGER NOT NULL REFERENCES dna_files(id) ON DELETE CASCADE,
  session_db_id INTEGER REFERENCES dna_sessions(id) ON DELETE SET NULL,
  model         TEXT NOT NULL,
  session       TEXT,
  touched_at    TEXT NOT NULL DEFAULT (datetime('now')),
  action        TEXT,   -- created | updated | reviewed | swept | approved | archived
  turn          INTEGER,
  notes         TEXT
)
```

---

## Protocol Compliance Gaps (higher priority than schema changes)

Observed in touches 316–325 — the most recent 10 records:

| Field | Expected | Actual | Gap |
|---|---|---|---|
| `turn` | Turn number within session | NULL on every record | Protocol says populate; nothing does |
| `session_db_id` | FK to dna_sessions | NULL on ~50% of records | Sessions not registered before touches |
| `session` | Session ID string | NULL on recent sonnet sessions | Inconsistent population |
| `notes` | Context note for significant touches | NULL on every record | Never written |

**These are enforcement gaps, not schema gaps.** The Protocol Specialist agent (#657) should add turn tracking and session registration to its operating protocol. Fix enforcement before adding schema columns.

---

## Schema Enhancement Proposals (priority order)

### 1. `qoq_item_id INTEGER` on dna_touches — HIGH VALUE

```sql
ALTER TABLE dna_touches ADD COLUMN qoq_item_id INTEGER REFERENCES queue_items(id) ON DELETE SET NULL;
```

**Why**: Closes the traceability loop — "this file was changed because of queue item #X." Currently you can see that a file was touched, but not why. With `qoq_item_id`, you can query: "which queue items caused the most file changes?" and "which files were touched for item #636?"

**Migration**: Backfill is not possible for historical records. Set NULL for past touches; enforce for future ones.

### 2. `change_magnitude TEXT` on dna_touches — MEDIUM VALUE

```sql
ALTER TABLE dna_touches ADD COLUMN change_magnitude TEXT CHECK(change_magnitude IN ('minor', 'moderate', 'major'));
```

**Why**: Distinguishes a typo fix from a protocol rewrite. `sweep_count` tells you how many times a file was touched; `change_magnitude` tells you whether those touches were substantive.

**Migration**: NULL for historical, self-assessed by the model on new touches.

### 3. `focus_at_end TEXT` on dna_sessions — LOW VALUE

```sql
ALTER TABLE dna_sessions ADD COLUMN focus_at_end TEXT;
```

`focus_at_start` exists; `focus_at_end` would show focus drift across the session. Low priority because the focus API already tracks this; it would be a denormalization of live data.

### 4. `queue_items_closed/created INTEGER` on dna_sessions — LOW VALUE

```sql
ALTER TABLE dna_sessions ADD COLUMN queue_items_closed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dna_sessions ADD COLUMN queue_items_created INTEGER NOT NULL DEFAULT 0;
```

Session-level productivity metrics. Useful for the QOQ self-auditing system, but derivable from `queue_items.closed_at` joined to session date. Low priority.

---

## Recommended Action Order

1. **Enforce `turn` population** — every touch must include the turn number. Add to Protocol Specialist operating checklist (#657).
2. **Enforce `session_db_id` linkage** — session registration must happen before first touch in a session. Already required by protocol; not being followed.
3. **Add `qoq_item_id` to dna_touches** — single migration, highest traceability value.
4. **Add `change_magnitude`** — optional quality signal, low migration cost.
5. **Skip `focus_at_end` and session counters** — derivable, not worth the schema complexity.

---

## Migration SQL (when ready)

```sql
-- Run via D1 MCP or wrangler d1 execute
ALTER TABLE dna_touches ADD COLUMN qoq_item_id INTEGER REFERENCES queue_items(id) ON DELETE SET NULL;
ALTER TABLE dna_touches ADD COLUMN change_magnitude TEXT CHECK(change_magnitude IN ('minor', 'moderate', 'major'));
```

No data migration needed — NULL is the correct default for historical records.

<!-- dna-touches
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-3, date: 2026-06-12, action: created, notes: "Based on live D1 schema audit — touches 316-325 showed turn=NULL and session_db_id=NULL as systemic gaps" }
-->