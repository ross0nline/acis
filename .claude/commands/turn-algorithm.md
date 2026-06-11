---
title: "Turn Algorithm — Sovereign Duo Per-Turn Pseudo-Code"
domain: ccc-qoq
status: APPROVED
source_of_truth: Studio
type: reference
version: "0.1.0"
created: 2026-06-10
created_model: claude-sonnet-4-6
created_session: 78e6e2b4-34df-4c73-852c-d71397a90c55
updated: 2026-06-11
sweep_count: 14
tags: [turn-algorithm, protocol, per-turn, pseudo-code, standing-orders]
qoq_item_id: 487
touches:
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-10, action: created, notes: "Extracted from standing-orders.md into own file per item 487" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-10, action: updated, notes: "Added context.md auto-read, ainotebook category creation, focus awareness, removed 5-sentence cap, split respond into file/no-file paths" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-10, action: updated, notes: "Added detailed DNA pseudo-code block (frontmatter sync, COALESCE gotcha, status/sweep_count rules) and skill check block (3-step gate, disable_model_invocation guard)" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-10, action: updated, notes: "Named the context.md vs SKILL.md distinction: context=orientation/map, skill=action protocol/instructions; split PRE-WORK into two labelled sections" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-10, action: updated, notes: "Expanded queue scan into full pseudo-code block: trigger heuristics, classify, dedup, batch vs single POST, report IDs" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-10, action: updated, notes: "Added DNA verification gate (Step 3): assert frontmatter.updated, touches appended, dnaPost.success — stop if any fails" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-10, action: updated, notes: "MCP integration: /mcp in skill check map, create_item in queue dispatch (preferred over PS when wired), get_focus in focus awareness" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-10, action: updated, notes: "Added POST-WORK: SKILL/ALGORITHM REVIEW gate before RESPOND — check each new capability/pattern for encoding before concluding" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-10, action: updated, notes: "Added linked_paths to queue scan classify block — required when signal source is a file. Added REFLECTION GATE phase before RESPOND." }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-10, action: updated, notes: "Gap analysis applied: first-turn gate, MCP metadata note (519), memory file archive gate (515), turn_focus_type classification (516), tightened reflection trigger, post-compaction explicit reference" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-10, action: updated, notes: "Added /deploy to skill check map with PowerShell Set-Location note" }
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction, date: 2026-06-11, action: updated, notes: "Moved skill check before queue scan. Removed stale MCP item 519 comment. Added global skill fallback and /partner-check to skill map." }
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-2, date: 2026-06-11, action: updated, notes: "Updated global skill fallback to reference ~/.claude/skill-index.md (item #595)" }
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-2, date: 2026-06-11, action: updated, notes: "Fixed sweep_count rule: sweep_count = total touch count, not swept-action counter. Removed stale DB comment." }
---

# Turn Algorithm

**Read this file every turn. It is the compact executable specification of the Sovereign Duo
operating protocol. The checklist in `standing-orders.md` expands each step.**

---

## Reference File Types

Two distinct file types govern behavior — both mandatory, different triggers:

| File | Purpose | Trigger | Reads like |
|---|---|---|---|
| `context.md` | Directory orientation — what is this dir, what files live here, conventions | Entering or writing to a directory | Passive map: "here's what you're looking at" |
| `SKILL.md` | Action protocol — step-by-step instructions for a specific action type | Action matches skill domain | Active instructions: "here's how to do this" |

`context.md` answers: **where am I?**  
`SKILL.md` answers: **how do I do this?**

Both are read before acting. Neither is a skim. `context.md` orients; `SKILL.md` governs.

---

```
fn turn(userMessage):

  // ── PRE-WORK: ORIENTATION ─────────────────────────────────────────────────
  if firstTurnOfSession:
    read(".claude/skills/post-compaction/SKILL.md")  // always — do not skip, do not act first

  for dir in (dirsEntered + dirsWrittenTo):
    if exists(dir + "/context.md"):
      read(dir + "/context.md")         // passive orientation — what is this dir?
      // do NOT confuse with SKILL.md — context.md is a map, not instructions

  // ── PRE-WORK: SKILL CHECK ─────────────────────────────────────────────────
  // Runs FIRST — skill governs how the rest of the turn executes, including queue scan.
  // Step 1 — classify the intended action; match to a SKILL.md (not context.md)
  skill = matchSkill(action)
  // Partner check?                      → /partner-check
  // Queue ops (create/close/focus)?     → /mcp        (native tools when wired; PS fallback)
  // Writing PS commands?                → /powershell  (SKILL.md governs how)
  // Git operation?                      → /git
  // Ainotebook entry?                   → /ainotebook
  // Version bump?                       → /versioning
  // Deploying a worker?                 → /deploy      (PowerShell Set-Location; never Bash cd)
  // New to this area?                   → /read-context  (loads relevant context.md files)
  // Not sure what skill?                → /check-skills  (context.md of .claude/skills/ is the index)
  // Skill not in current project?       → read C:\Users\rossonline\.claude\skill-index.md
  //                                        locate skill by invoke name, then read(skill.path)

  // Step 2 — gate: don't act until SKILL.md is loaded
  if skill and skill.disable_model_invocation == true:
    only invoke if user explicitly named the skill    // never auto-invoke high-side-effect skills
  else if skill:
    read(skill.SKILL.md)                              // full read — not a skim
    for ref in skill.referencedFiles:                 // e.g. machine-context.md, standing-orders.md
      read(ref)

  // Step 3 — no match → proceed; but log the gap
  // Skipping the skill check is a protocol failure — even if the action seems obvious
  // Skills encode prior pain. One-off prompts evaporate. Skills compound.

  // ── PRE-WORK: DOC IMPROVEMENT GATE ───────────────────────────────────────
  // After reading any governing doc, check if it needs improvement.
  // Docs go stale silently — the check must be explicit.
  for doc in (contextMdsRead + skillMdsRead + claudeMdsRead):
    if doc.isMissingCurrentBehavior(thisSession):
      queue("Update " + doc.path + ": [what's missing]", stage="queued", priority=high)
    if doc.hasStaleInfo(thisSession):
      if minor: update inline now
      else:     queue it — don't silently accept stale docs
  // This gate applies to context.md, SKILL.md, and CLAUDE.md files
  // "Stale" = reflects old behavior, missing new protocols, or contradicted by current work
  // Do NOT rewrite docs speculatively — only flag what this session's work revealed

  // ── PRE-WORK: QUEUE SCAN ─────────────────────────────────────────────────
  // Scan every source — miss nothing. An unqueued idea is a lost idea.
  candidates = []

  for signal in scan(userMessage + myOwnWork + codeReviewed + errorsFound + observations):

    // Trigger heuristics — if any match, it's a candidate
    if signal matches any of:
      | new capability or feature mentioned          → stage="idea",   parent=relevantNode
      | open question left unanswered this turn      → stage="idea",   parent=IDEAS(150)
      | "we should revisit / look at / consider"     → stage="queued", parent=currentItem
      | competing approach discussed but not chosen  → stage="idea",   parent=currentItem
      | dependency identified ("need X before Y")    → stage="queued", notes=dependency
      | task too large for current turn              → stage="queued", parent=currentItem
      | vision / long-horizon idea from user         → stage="idea",   parent=relevantNode
      | bug or error discovered                      → stage="queued", notes=repro+impact
      | architecture decision made or deferred       → stage="idea",   notes=ADRcandidate
      | skill gap identified                         → stage="idea",   parent=IDEAS(150)
      | risk surfaced but not actioned               → stage="queued", priority=high

    // Classify — populate ALL provenance fields, not just title/stage
    item = {
      title:        imperative, scannable, <10 words,
      stage:        "idea" | "queued" | "active",
      parent_id:    knownProjectNode ?? IDEAS(150),   // IDEAS=150 for unanchored items
      domain:       matchDomain(signal),              // ccc-qoq | acis | nba | personal
      priority:     estimatePriority(urgency),        // 1.0=critical 3.0=next 5.0=normal 9.0=someday
      notes:        why it matters + what it unblocks + how it was discovered,
      linked_paths: signal.sourceFile ?? null,        // ALL source files as JSON array string
      // linked_paths REQUIRED when signal came from any file (synthesis, research, brainstorm, reflect)
      // An item with linked_paths=null and no session context is an orphan — a dead end, not a map
      metadata: {
        session_id:  currentSessionId,                // always — links item to the session that created it
        source_type: classifySource(signal),          // "user_message"|"file_synthesis"|"code_review"|"observation"|"error_found"
        turn:        currentTurn ?? null              // when identifiable
      }
      // Full provenance is not optional. A cold-start agent must be able to follow the trail
      // from any item back to every source that synthesized it.
    }

    // Dedup check — do not re-queue what's already there
    if not existsInQueue(item.title):
      candidates.append(item)

  if candidates:
    if mcpAvailable():
      ids = [create_item(c) for c in candidates]         // MCP tool — no token, no PS boilerplate
      // create_item supports full 18-field schema: linked_paths, metadata, tags, protocol_version
    elif len(candidates) >= 3:
      ids = batchPOST(candidates via qoq-add tempFile)   // batch for 3+ items (PS fallback)
    else:
      ids = singlePOST(candidates via qoq-api)           // 1–2 items (PS fallback)
    chat("Queued: " + ids)                               // report before responding

  // ── FOCUS AWARENESS ───────────────────────────────────────────────────────
  focus = get_focus()                  // MCP tool — preferred; no PS boilerplate
       ?? qoq-api GET /focus           // PS fallback if MCP not wired
  if work.domain != focus.domain:
    chat("Focus drift: current=" + work.domain + " declared=" + focus.domain)
  if focus.stale(session):             // focus set many turns ago, work has shifted
    chat("Focus may need updating — current work is " + work.summary)
    // Do not force-update; surface and let user decide

  turn_focus_type = classify(userMessage, currentWork):
    | userExplicitlyRedirected  → "user_directed"  // user asked for something off-agenda
    | followingDeclaredAgenda   → "declared"        // executing queue priority as planned
    | discussingSystemItself    → "meta"             // protocol, design, system conversation
    | silentlyOffCourse         → "drift"            // work migrated without explicit redirect
    | blockerOnDeclaredFocus    → "blocked"          // can't proceed on focus item
    | firstTurnPostCompaction   → "orientation"      // reading context, no work output yet
  // Log in chat if user_directed or drift — both are signals worth surfacing

  // ── EXECUTE ───────────────────────────────────────────────────────────────
  if exploratory(userMessage):
    respond(recommendation[1 sentence] + tradeoff[1 sentence] + redirect)
    return                             // do NOT implement until user agrees

  result = doWork(userMessage)

  substance = derive(result)
  // Route by TYPE, not length — ask "what type is this?" before writing, not "how long?"
  contentType = classify(substance):
    | architecturalDecision    → ainotebook/adr/
    | namedPrincipleOrLesson   → ainotebook/reflect/
    | tradeOffAnalysis         → ainotebook/analysis/ or research/architecture/
    | designExploration        → research/architecture/ or brainstorm/
    | statusOrCoordination     → chat only
    | shortObservation(<3s)    → chat only
  if contentType.routesToFile:
    category = matchAiNotebookCategory(contentType)
    if !category: createCategory() via /ainotebook-category skill  // never skip; create if missing
    path = routeToFile(substance, category)  // research/, ainotebook/, brainstorm/
    write(path, substance)
  else:
    chat(substance)                    // brief observations stay in chat

  // ── POST-WORK: DNA ────────────────────────────────────────────────────────
  // MEMORY FILE GATE — before writing any memory/*.md file
  for f in (filesCreated + filesModified):
    if f.path.matches("memory/**"):
      archivePath = "memory/archive/" + f.stem + "_" + today + ".md"
      copyTo(archivePath)              // snapshot before overwrite — history that would otherwise be lost
      POST /dna/file { path: f.path, action: "updated", ... }  // register the mutation

  for f in (filesCreated + filesModified):

    // Step 1 — update the FILE FRONTMATTER first (DB won't do this for you)
    action = f.isNew ? "created" : "updated"
    if statusChange: f.frontmatter.status = newStatus        // DRAFT | APPROVED | ARCHIVED
    f.frontmatter.updated = today
    f.frontmatter.touches.append({
      model:   currentModel,
      session: sessionId,
      date:    today,
      action:  action,
      notes:   shortNote                // what changed and why
    })
    // sweep_count = total number of touches in the touches array (increment by 1 each touch)
    f.frontmatter.sweep_count = f.frontmatter.touches.length
    // Frontmatter and DB must stay in sync — update BOTH or neither

    // Step 2 — POST /dna/file (upserts dna_files row + appends dna_touches row)
    POST /dna/file {
      path:        f.path,             // required
      action:      action,             // created | updated | swept | reviewed | approved
      model:       currentModel,
      domain:      f.domain,
      session_id:  sessionId,          // links touch to dna_sessions; updates files_created/files_modified counts
      status:      f.frontmatter.status,  // must pass explicitly — DB uses COALESCE (won't update if omitted)
      qoq_item_id: f.frontmatter.qoq_item_id ?? null,
      notes:       shortNote,
      turn:        currentTurn         // optional but useful for audit
    }
    // sweep_count = total touch count — always pass the new value explicitly (DB does not compute this)
    // status is NEVER auto-updated — always pass it explicitly on every call

    // Step 3 — VERIFY before moving on (both sides, not just intent)
    assert f.frontmatter.updated == today             // file was actually edited
    assert f.frontmatter.touches.last.session == sessionId  // touch appended
    assert dnaPost.success == true                    // DB confirmed the upsert
    if any assert fails:
      stop — fix the gap before proceeding            // do not silently skip

  if filesChanged:
    git add <specific files>
    git commit -m "type(scope): msg\n\nCo-Authored-By: AIBuddy <aibuddy@...>"
    // Bash tool HEREDOC only — never PowerShell for commits

  // ── POST-WORK: SKILL / ALGORITHM REVIEW ──────────────────────────────────
  // Did this turn produce something worth encoding? Check before concluding.
  for each in (newCapabilities + newPatterns + newConstraints + protocolDecisions):
    if recurring_pattern and not covered_by_any_skill:
      if isNewDomain:  create new SKILL.md in .claude/skills/<name>/
      else:            update most relevant existing SKILL.md
      update .claude/skills/context.md to list the skill
    if algorithmic_behavior and not in_turn_algorithm:
      update turn-algorithm.md         // e.g. new routing rule, new phase, new gate
    // Skills encode prior pain. Wins that aren't encoded evaporate between sessions.
    // One check per turn. Skills compound; one-off prompts do not.

  // ── POST-WORK: REFLECTION GATE ────────────────────────────────────────────
  // Did this turn surface something worth framing persistently in its own voice?
  // Distinct from skills (which encode behavior) — reflections capture WHY or WHAT-IT-MEANS.
  insight = detect(namedPrinciple + patternRecognition + sessionLevelObservation + protocolEvolution)
  if insight AND insight.wouldChangeFutureBehavior AND not alreadyWritten(insight.principle):
    write ainotebook/reflect/reflect-NNN-slug.md  // via /ainotebook skill, full frontmatter + DNA
    // The bar: would a future agent or session behave differently because of this reflection?
    // If removing it wouldn't confuse a future reader — it's not a reflection, it's a chat observation.
    // Do NOT write a reflection just because work happened or an observation sounds insightful.

  // ── RESPOND ───────────────────────────────────────────────────────────────
  next   = identifyNextStep(result)    // specific, not generic
  voice  = surfaceInsight(result)      // non-obvious pattern, risk, or observation

  if filesCreated:
    respond(
      compactCommentary(filesCreated), // what was written and why it matters — dense, not long
      next,
      voice                            // if one exists
    )
  else:
    respond(
      conversational(result),          // natural exchange; match tempo of the message
      next,
      voice
    )
  // No sentence cap. Compact means dense, not truncated.
  // Depth → files. Chat → coordination + commentary + voice.
```

*Expands to: [`standing-orders.md`](standing-orders.md)*
