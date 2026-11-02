---
name: session-2026-06-20-gap-proposals
description: Proposals for the 5 identified system gaps; corrected 2 stale premises against live code
metadata:
  type: project
  session: ricci-gap-proposals
  date: 2026-06-20
---

## Done This Session
- Produced solution proposals (no implementation) for all 5 gaps: what-to-build / effort / risk / sequencing.
- Read live code to verify each gap premise. Two premises had drifted from reality.

## Key Facts Learned (verified against live src/ 2026-06-20)
- **Gap 1 is already fixed in code.** `src/types/index.ts` lines 25-28 contain all 4 "missing" fields (sweep_count, protocol_version, session_id, moment_id). Interface = 28 fields. The "24 fields" claim survives only as a stale AUDIT NOTE in research/compact/system-state.md line 123. Proposal: correct the note + add a D1↔interface parity guard script (qoq-schema-check.ps1).
- **Gap 3 is largely already closed.** mcp.ts threads ExecutionContext: `buildServer(env, ctx)` (line 14), `createMcpFetch` (280-282). create_item fires cascade via ctx.waitUntil (line 150); patch_item fires cascade (273) AND has the full #541 phase-gate (lines 195-215). So #896 "no ExecutionContext on MCP path" is STALE. What actually remains: MCP create_item builds its OWN raw INSERT (lines 120-138) vs REST's createHandler = parity risk; and MCP logs only `stage_changed`, REST logs `item_updated` + `stage_changed`. Fix = extract shared createItemCore/patchItemCore.
- **Gap 4 confirmed unbuilt.** focus.ts sets focus only via setFocusHandler (PUT /focus/:id) or the `main` marker path (lines 186-198). No code advances focus on done. RECOMMENDATION: build GET /focus/next + `suggested_next_focus` in done-response — SUGGEST not auto-advance. Auto-advancing seizes the focus pointer = trust-eroding side-effect. Flagged for sign-off.
- **Gap 2** is the only deeply architectural one. 3 independent sweep_count lineages (dna_files server-inc, frontmatter client-maintained, queue_items.sweep_count via PATCH sweep:true at items.ts line 243). Proposal: rename queue_items.sweep_count → review_count (kill collision) + make dna_files authoritative so dna-sweep-check -Fix stops being a required repair.
- **Gap 5** Phase A = classify hlm_edges edge_type type-imports vs imports (build-time edge-builder, likely a script). Safe rule: type-imports ONLY when entire import is type-only; mixed → imports (conservative over-report). Phase B (per-export node granularity) = L, defer/queue under HLM parent.

## Open Questions
- Gap 4: does Ross want SUGGEST (my recommendation) or true auto-advance? Needs sign-off before build.
- Gap 2: where do the Stop/PostToolUse DNA hooks (compliance-portfolio) write frontmatter sweep_count? If they hardcode the increment they must be updated or they re-introduce drift.
- Gap 5: is the hlm_edges builder a script or Worker code? Confirm before estimating the backfill re-run.

## Next Agent: Start Here
- Recommended exec order: Gap1 (S, quick win + guardrail) → Gap2 rename then authoritative → Gap3 shared core → Gap4 (builds on Gap3 core) → Gap5 PhaseA (parallelizable).
- Gap3 and Gap4 should share the extracted patchItemCore — don't thread suggested_next_focus twice.
- Before Gap2 rename: grep `sweep_count` across src/ and C:\Scripts (qoq-add.ps1, generation templates) — string matches will break.
