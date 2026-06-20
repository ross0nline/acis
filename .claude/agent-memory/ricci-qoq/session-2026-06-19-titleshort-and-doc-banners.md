---
name: session-2026-06-19-titleshort-and-doc-banners
description: Fixed MCP create_item title_short null bug (#898) + added SUPERSEDED banners to two stale arch docs
metadata:
  type: project
  date: 2026-06-19
---

## Done This Session
- Queued #898 (parent 257 Tooling+Docs, domain ccc-qoq) for the MCP title_short fix; marked active, implemented, closed done with git_ref fd316e2.
- Task 1: Extracted `titleToSlug` from `src/handlers/items.ts` into new exported `src/utils/slug.ts`. Imported in both items.ts and mcp.ts. Changed mcp.ts create_item insert from `title_short ?? null` to `title_short?.trim() ?? titleToSlug(title.trim())`. `npx tsc --noEmit` clean (exit 0).
- Task 2: Added SUPERSEDED banner after frontmatter in `research/architecture/ccc-qoq-system-design.md` and `generation-engine.md`. Inline-corrected the synchronous-cascade paragraph (line ~68) in generation-engine.md to note `ctx.waitUntil()` + D1 `kv_artifacts` per ADR 001 / D001. Append-only — no existing content rewritten.
- dna-touch ran on both docs (sweep_count: system-design 2->3, generation-engine 3->4; updated date bumped).
- Single commit fd316e2 with AIBuddy co-author. Closed #898.

## Key Facts Learned
- `src/utils/` did not exist before this session — slug.ts is the first file in it.
- MCP create_item handler (src/handlers/mcp.ts ~line 110) builds its INSERT independently from REST handleItems — it does NOT call handleItems. Any column-default logic added to REST createHandler must be mirrored here or it silently no-ops on the MCP path. This is the same class of "silent no-op" the schema-addition protocol warns about, but for handler parity rather than migration parity.
- TS source files in ccc-qoq do NOT carry DNA frontmatter (that's .md-only); they match a plain import-block header style (see focus.ts).
- ccc-qoq commits go directly to master each turn (project's own queue repo, not PR-flow). Working tree had ~13 pre-existing unrelated modified files from prior sessions — I staged only my 5 files by explicit path, did not sweep them.
- `$env:AIBUDDY_MODEL` is not set in the PS profile — dna-touch warns and leaves the touch entry model field empty. Pass `-Model` explicitly or set the env var to attribute touches.

## Open Questions
- Are there OTHER REST-vs-MCP create_item divergences beyond title_short? mcp.ts builds its own INSERT/RETURNING and resolves priority/stage/domain independently. Worth a parity audit of every column default and side-effect (e.g. does mcp create_item trigger generation cascade / syncItemTags the way REST does?).
- The 13 pre-existing unstaged ccc-qoq working-tree changes were left uncommitted by a prior session. Next session should confirm whether those are intentional WIP or orphaned.

## Next Agent: Start Here
- The title_short fix is committed but NOT deployed. Run `npx wrangler deploy` from `C:\Users\rossonline\ccc\ccc-qoq\` to push it live before relying on MCP-created items having slugs.
- Consider a REST/MCP create_item parity audit (see Open Questions) and queue it under 257 if gaps exist.

<!-- dna-touches
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-19, action: updated, notes: "auto-touch via Stop hook" }
-->