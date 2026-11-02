---
name: session-2026-06-22-hlm-import-parser
description: Built HLM Tier-1 static import parser (#920); migration 0025 UNIQUE index; idempotent POST /hlm/edge; WORKER_VERSION v0.18.0
metadata:
  type: project
  session: 53eb3496-5f90-432d-b01b-4beafe2e8565
  date: 2026-06-22
---

## Done This Session
- #920 Tier-1 static import parser BUILT + proven live (NOT closed; Ross closes).
- `C:\Scripts\hlm-parse-imports.ps1` (new) — scans .ts under src/, resolves relative imports, POSTs 'imports' edges. -DryRun/-Paths/-Verbose, UTF8, token from $env:QOQ_ADMIN_TOKEN. Per-file target-collapse with VALUE-WINS type_only.
- `migrations/0025_hlm_edges_unique.sql` (new) — `CREATE UNIQUE INDEX idx_hlm_edges_unique ON hlm_edges(source_id,target_id,edge_type)`. Applied to live D1.
- `hlm.ts` POST /hlm/edge — `ON CONFLICT (source_id,target_id,edge_type) DO NOTHING RETURNING *`; returns `{already_exists:true,...}` on no-op.
- WORKER_VERSION v0.17.0 -> v0.18.0. Commits ec01de7 (code) + bb3fa38 (session log). Pushed, auto-deployed (~90s).

## Key Facts Learned
- **SQLite cannot `ALTER TABLE ... ADD CONSTRAINT`.** To add UNIQUE to an existing table use `CREATE UNIQUE INDEX` — it's a valid `ON CONFLICT (cols)` target, no rebuild. (hlm_edges 0019 had no UNIQUE; dependencies 0023 and file_anchor_assignments 0020 had inline UNIQUE because created fresh.)
- **Glob tool does NOT see `migrations/*.sql`** (additional-working-dir quirk). Use Bash `ls` to enumerate migrations. Highest is now 0025.
- **Migration count: 0001..0025 live.** 0024 = hlm_edges.type_only column (#975). 0025 = unique index (this session).
- **Parser run produced 0 NEW edges:** the manual POC seed (session #919) already covered the real import graph — 62 edges all already_exist, idempotency proven (65->65 unchanged on re-run).
- **mcp.ts imports `../index` BOTH ways:** `import type { Env }` + `import { WORKER_VERSION }`. Parser collapses to one edge per (src,tgt,'imports') with value-wins (type_only only if ALL imports to that target are type). Deterministic, not POST-order dependent.
- HLM node ids (live): index.ts(file)=4, mcp.ts=18, queries.ts=9. centrality top: queries.ts=7, constants.ts=5, event-log.ts=5.

## Open Questions / Flagged (NOT created as items — orchestrator decides)
- **Stale seed flag:** live edge id=30 `mcp.ts->index.ts` is type_only=1 but is a real VALUE import. Parser detects it; ON CONFLICT DO NOTHING (correctly) won't mutate it. Suggest a `-Reconcile` parser flag (PATCH type_only on disagreement) under #908. Likely more stale flags exist.
- **POST /dna/file 500 bug:** the `session_id` branch (dna_sessions files_created/files_modified UPDATE, dna.ts ~line 116) throws an unhandled 500. Isolated: minimal body OK, +qoq_item_id OK, +session_id 500s. Registered all 5 files WITHOUT session_id as workaround. Pre-existing, out of scope — flag for a real fix item.
- Git post-commit hook for the parser: explicitly deferred per brief, follow-up only.

## Next Agent: Start Here
- #920 awaits orchestrator diff-review + close.
- If reconcile wanted: parser already computes correct type_only; add a PATCH-on-mismatch path (needs a PATCH /hlm/edge route — doesn't exist yet, only POST).
- The POST /dna/file session_id 500 deserves its own bug item — it silently breaks DNA session file-count tracking for every agent.
