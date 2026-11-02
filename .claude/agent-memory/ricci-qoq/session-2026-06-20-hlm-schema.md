---
name: session-2026-06-20-hlm-schema
description: HLM knowledge-graph migrations 0019/0020 written file-only; #908 done; session_id left unFK'd by design
metadata:
  type: project
  session: ricci-hlm-schema
  date: 2026-06-20
---

## Done This Session
- #908 — wrote `migrations/0019_hlm_nodes_edges.sql`: hlm_nodes (structural: file + exported function/class + docs via entity_type discriminator) + hlm_edges (imports/calls/extends/implements/tests/documents/references; confidence static|inferred) + impact-query indexes. Recursive-CTE impact query in header comment.
- #917 — wrote `migrations/0020_file_anchor_assignments.sql`: junction queue_item(anchor) -> dna_files, many-to-many, UNIQUE(file_anchor_item_id, dna_file_id) + both directional indexes.
- Both FILE-ONLY — NOT applied to live D1. Pending Ross approval (same pattern as 0017/0018).
- Commit `5a457eb`.

## Key Facts Learned
- FK targets all verified: domains(id), queue_items(id), dna_files(id) are INTEGER PK AUTOINCREMENT.
- `dna_files.created_session` is plain TEXT, NOT FK'd to dna_sessions. I matched this: hlm_nodes.session_id and hlm_edges.session_id are plain TEXT, deliberately unFK'd, so edge/node writes never block on a session not yet registered. Documented in migration header.
- Dropped the brief's standalone `(file_path)` index as redundant — the composite `(file_path, line_start, line_end)` covers file_path prefix lookups (Q4 reverse "which node owns line L").
- Migrations on disk now 0001-0020, sequential (0008 collision long resolved: 0016 focus_log_read_events, 0017 v_sweep_mismatch, 0018 v_tag_assertion). v0.9.0 live.
- Edge-population model (final): Tier-1 static import parser post-commit (confidence='static'); Tier-2 AI inference during sessions (confidence='inferred'); linked_paths rows become 'documents' edges at population time.

## Open Questions
- None blocking. Schema decisions were all final going in.

## Next Agent: Start Here
- Apply 0019 + 0020 to live D1 ONLY after Ross approves (also still-pending: 0018_v_tag_assertion).
- Follow-up items I flagged (NOT yet queued — orchestrator to check): seed hlm_nodes from src/; Tier-1 static import parser post-commit hook -> imports edges; backfill documents edges from linked_paths + `<!-- file-anchor: #N -->`; populate file_anchor_assignments from #906 cluster; HLM API routes (GET /hlm/impact/:id recursive dependents CTE, GET /hlm/nodes, POST /hlm/node, POST /hlm/edge); assertion views v_hlm_orphan_docs / v_hlm_untested_functions once seeded.
- Ricci's other assigned queue (#909-915 from scope.md) is a SEPARATE delegation — not touched this session.
