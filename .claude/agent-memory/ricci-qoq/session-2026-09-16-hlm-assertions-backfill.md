---
name: session-2026-09-16-hlm-assertions-backfill
description: #923 HLM assertion views + #921 backfill-edges endpoint, v0.19.1 shipped
metadata:
  type: project
  session: session_01DGmN9diG53kPBwRHrD9wFn
  date: 2026-09-16
---

## Done This Session

- **#923 (HLM assertion views)**: migration `0027_hlm_assertion_views.sql` ships two D1 views:
  - `v_hlm_orphan_docs` — doc/reflect nodes (entity_type IN ('research_doc','reflect') OR file_path LIKE 'research/%'/'ainotebook/%') with no outgoing 'documents' edge
  - `v_hlm_untested_functions` — function nodes with no incoming 'tests' edge
  - Both follow the v_sweep_mismatch / v_tag_assertion detect-don't-enforce pattern
  - Applied to live D1 (f405cc09) directly via Cloudflare MCP
  - Routes added: GET /hlm/assertions/orphan-docs, GET /hlm/assertions/untested-functions

- **#921 (backfill documents edges)**: POST /hlm/backfill-edges endpoint in hlm.ts
  - Finds queue_items with linked_paths + associated dna_files row (via dna_files.qoq_item_id)
  - Resolves both ends as hlm_nodes, inserts 'documents' edges idempotently (ON CONFLICT DO NOTHING)
  - Supports dry_run:true for preview
  - Reports: created/skipped/no_source_node/no_target_node/candidates_found

- **Version bumped**: v0.19.0 → v0.19.1 in src/index.ts
- **Commit**: 9020df6 on master; pushed; Cloudflare auto-deploy triggered

## Key Facts Learned

- `dna_files` does NOT have a `linked_paths` column — only `queue_items` has it (migration 0003). The cold-start brief was wrong on this point.
- The current migration sequence tops out at 0026. Next available is 0028 for the next migration.
- `file-anchor: #N` comment scanning for populating `file_anchor_assignments` requires reading file content — impossible from a Worker; needs a PS script (`hlm-scan-anchors.ps1`) — explicitly left as a follow-up and noted in the completion note for #921.
- The Cloudflare MCP d1_query tool returns `[object Object]` in the console output even on success — this is a display issue, not a failure; queries that don't raise exceptions have executed.
- `handleHlm` dispatch: `rest[0]` = sub, `rest[1]` = idStr. Assertion routes use sub='assertions', idStr='orphan-docs'|'untested-functions'.

## Open Questions

- When will `POST /hlm/backfill-edges` have real data to process? It needs queue items with both `linked_paths` populated AND a corresponding `dna_files.qoq_item_id` row. Check with `SELECT COUNT(*) FROM queue_items qi JOIN dna_files df ON df.qoq_item_id = qi.id WHERE qi.linked_paths IS NOT NULL AND qi.linked_paths != '[]'`.
- The file-anchor comment scanning (`<!-- file-anchor: #N -->` → `file_anchor_assignments`) is unbuilt. Candidate PS script: `hlm-scan-anchors.ps1` at C:\Scripts\.

## Next Agent: Start Here

- Worker is v0.19.1; auto-deploy from push 9020df6 should be live within ~1 min of push.
- Verify endpoints are live: `qoq-api GET /hlm/assertions/orphan-docs` and `qoq-api POST /hlm/backfill-edges '{"dry_run":true}'`
- Migration 0027 is applied to live D1 and registered in d1_migrations.
- Next migration will be 0028.
- The file-anchor scanning script is the natural follow-up to #921 — queue a new item under #908 if not already queued.
