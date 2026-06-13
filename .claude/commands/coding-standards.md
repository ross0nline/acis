---
name: coding-standards
description: Design principles and coding conventions for ccc-qoq and ACIS systems. Load before writing any handler, migration, or script to verify the approach aligns with established patterns.
metadata:
  type: reference
  domain: ccc-qoq
  source_of_truth: Studio
  created: 2026-06-13
  created_model: claude-sonnet-4-6
---

# /coding-standards — Design Principles and Conventions

Load this before writing handlers, migrations, scripts, or reference data. These are
the principles that have been explicitly chosen and validated by the Sovereign Duo.

---

## 1. AppSheets Principle — Reference Tables Over Hardcoded Enumerables

The core rule: any enumerable value that appears in more than one place belongs in a D1
reference table, not in code or local files.

**The test:** If adding a new option requires editing a file, a constant, or a deploy,
the data is in the wrong place.

**The correct model:**
- `domains`, `stages`, `item_types`, `profiles` are D1 reference tables
- `queue_items` references them via FK (`domain_id`, `stage_id`, `type_id`)
- Scripts and tools fetch reference data from the API at runtime, not from bundled JSON
- Adding a new domain = one D1 INSERT; it appears everywhere automatically

**Anti-patterns to reject:**
```typescript
// Wrong: hardcoded string enum in handler
if (domain !== 'ccc-qoq' && domain !== 'acis') { return err(400, 'invalid domain') }

// Wrong: local JSON file for reference data
const profiles = JSON.parse(fs.readFileSync('profiles.json'))

// Right: resolve via FK at insert time
const domain = await db.prepare('SELECT id FROM domains WHERE name = ?').bind(domainName).first()
if (!domain) return err(400, `Unknown domain: ${domainName}`)
```

---

## 2. FK Over Magic Strings

Every relationship between tables uses a FK integer ID, not a string name column.

- `queue_items.domain_id` references `domains.id` — not `domain_name TEXT`
- `queue_items.stage_id` references `stages.id` — not `stage TEXT`
- `profiles.domain_id`, `profiles.stage_id`, `profiles.type_id` — all FKs

**Exception:** API inputs and outputs use string names (`domain: "ccc-qoq"`) for
ergonomics. The handler resolves name → ID on the way in, and JOINs to get name on
the way out. The D1 storage layer is always FK-clean.

---

## 3. Master Table Instinct

Before creating a new table, exhaust the column/slice options on an existing table.

Questions to ask first:
- Can a new column on `queue_items` hold this data?
- Can a tag or metadata field capture it without schema change?
- Does the difference in data structure *require* a separate table, or is it just convenient?

Override conditions — a new table IS justified when:
- The entity has its own lifecycle independent of queue items (e.g., `dna_files`)
- It needs to be FK-referenced from multiple places (e.g., `domains`, `profiles`)
- The row count would differ by orders of magnitude from the parent table
- The join pattern would be repeated across 3+ query paths

---

## 4. Scripts Derive From API

Terminal scripts (`C:\Scripts\*.ps1`) are thin clients against the Worker API.
They do not embed domain logic, reference data, or configuration.

**The rule:** If the information lives in D1, the script calls the API to get it.

```powershell
# Wrong: read profiles from a local JSON file
$profiles = Get-Content "C:\Scripts\qoq-profiles.json" | ConvertFrom-Json

# Right: fetch from API
$pr = Invoke-RestMethod "$base/profiles/$profileName" -Headers $h
```

This means any profile, domain, or stage added to D1 is immediately available to all
scripts without a file edit or deploy.

---

## 5. Migration Conventions

- File: `NNNN_descriptive_name.sql` in `migrations/`
- Use `CREATE TABLE IF NOT EXISTS` and `INSERT OR IGNORE` for idempotency
- Seed data uses subquery name resolution for FK fields:
  ```sql
  INSERT OR IGNORE INTO profiles (name, domain_id, stage_id) VALUES
    ('my-profile', (SELECT id FROM domains WHERE name='ccc-qoq'), (SELECT id FROM stages WHERE name='idea'))
  ```
- Register all migrations in `d1_migrations` table if applied manually (not via wrangler)
- After manual D1 apply, always run `npm run deploy` from ccc-qoq to deploy the Worker

---

## 6. Handler Conventions (TypeScript Workers)

```typescript
// Standard response helpers at top of every handler file
function ok(data: unknown, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}
function err(status: number, error: string): Response {
  return Response.json({ success: false, error }, { status });
}

// Route shape: handler receives (request, env, rest: string[])
// rest = path segments after the handler's prefix
// GET /profiles/:name  -> rest = ['brainstorm']
// POST /profiles       -> rest = []

// SELECT queries: always filter WHERE active = 1 for reference tables
// INSERT: use RETURNING * to get the created row in one round-trip
```

---

## 7. DNA Protocol (Non-Negotiable)

Every file creation or modification requires a `POST /dna/file` registration.
Every session requires a `POST /dna/session` registration (once per session).

Fields required on every `POST /dna/file`:
- `path`: relative to repo root (e.g., `ccc-qoq/src/handlers/profiles.ts`)
- `action`: `created` | `updated`
- `model`: `claude-sonnet-4-6` (current model)
- `domain`: `ccc-qoq` | `acis` | etc.
- `session_id`: current JSONL session UUID

Do not batch DNA at the end of a turn. Register each file as soon as it's written.

---

## 8. Git Commit Protocol

- Stage specific files by name, never `git add -A`
- Co-author line: `Co-Authored-By: AIBuddy <aibuddy@rossonlineservices.com>`
- Message: imperative mood, reference closed item IDs (`Closes #702 #703`)
- Never `--no-verify`, never `--no-gpg-sign`
- Commit every turn that creates or modifies files — before responding

---

## Quick Reference

| Principle | Decision |
|---|---|
| New enumerable option | D1 INSERT, not code edit |
| Cross-table relationship | FK integer, not string |
| New table vs column | Exhaust columns first |
| Script configuration | API call at runtime |
| File creation | POST /dna/file immediately |
| Item closed | mcp patch_item stage=done + completion_note |
