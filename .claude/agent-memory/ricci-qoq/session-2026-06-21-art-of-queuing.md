---
name: session-2026-06-21-art-of-queuing
description: Ricci's independent take on the Art of Queuing (#646); core finding that blocked_by is a single FK with no dependency graph / readiness computation
metadata:
  type: project
  session: ricci-art-of-queuing-2026-06-21
  date: 2026-06-21
---

## Done This Session
- Wrote Ricci's opinionated take on "The Art of Queuing" (#646) to agents/ricci-qoq/sessions/2026-06-21-art-of-queuing-take.md
- Read across queue mechanics: queuing SKILL.md, queue-taxonomy.md, 0001 schema, 0015 moments, db/queries.ts (recursive CTEs), items.ts, generate.ts, focus.ts
- Confirmed #646 live: queued, p=3.0, parent=50 (CCC-QOQ root), domain=ccc-qoq — in Ricci scope

## Key Facts Learned (load-bearing, don't re-derive)
- **"Tells you what to build next" is FAKED, not computed.** Two near-miss mechanisms: (a) GET /focus/next is a passthrough that reads the hand-set focus_type='next' marker (a bookmark); (b) renderSessionContext "Next Steps" = top-3 queued children of main focus by priority (a projection of priority you already set). Neither reasons about readiness.
- **blocked_by is a SINGLE nullable self-FK on queue_items.** No many-to-many deps, no transitive resolution, no computed "ready set." renderBlocked just lists blocked_by IS NOT NULL + names the one blocker. THIS is the missing dependency graph #646 reaches for.
- **qid decimal path (1.2.3) is COMPUTED on the fly** in getAllItemsForGeneration via priority-rank within parent — not stored, so it never drifts. (HLM named-segment vision pre-figured.)
- Float-priority insertion works: moveHandler computes (lo+hi)/2; append = maxSiblingPriority+1.0. Renumbering is genuinely never needed.
- Phase-gate #541 (can't mark parent done while non-terminal children open) means a subtree IS an enforced project plan — scaffolding-from-tree primitive already exists, just undocumented.
- Provenance is first-class: linked_paths, session_id, metadata.source_type, qoq-add auto-stamps from JSONL.

## My Core Thesis (for continuity)
Art of Queuing = placing a thought on 3 orthogonal axes — WHEN (priority float), WHY/scope (depth/parent), WHAT-KIND (domain/tag/type) — fast enough to cost nothing, rich enough to recover full reasoning. System nailed capture-cost + single-item recoverability; has NOT built the layer where structure reasons back. "Next" needs: priority (human's claim about importance) ∩ readiness (graph's claim about possibility). System has the first, lacks the second.

## Recommendation (highest leverage)
ONE many-to-many `dependencies(item_id, depends_on_id, kind)` edge table solves BOTH the dependency-graph gap (Gap 2) AND the item↔item linking gap (Gap 3). Then GET /items/ready (recursive CTE: queued items whose every 'blocks' dep is done) = the real "what to build next."

## Open Questions
- Does Ross's synthesis-005 (didn't exist on disk when I wrote mine) converge or diverge on the dependency-graph point? Compare before building the canon.
- Should focus_type='next' be replaced by computed derivation or kept as manual override on top of computed?

## Next Agent: Start Here
- #646 still a stub. Build order if greenlit: art-of-queuing canon docs (cheap) → dependencies edge table → GET /items/ready → computed-next.
- Flagged 5 child items for orchestrator (did NOT create them per scope — see take file's "What I'd queue out of this").
