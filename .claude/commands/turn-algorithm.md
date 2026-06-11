---
title: "Turn Algorithm Skill — Sovereign Duo Per-Turn Protocol"
domain: ccc-qoq
status: APPROVED
source_of_truth: Studio
type: skill
shell: none
disable-model-invocation: false
argument-hint: ""
version: "0.2.0"
created: 2026-06-10
created_model: claude-sonnet-4-6
created_session: 78e6e2b4-34df-4c73-852c-d71397a90c55
updated: 2026-06-11
sweep_count: 2
tags: [turn-algorithm, protocol, pseudo-code, standing-orders, skill, meta]
qoq_item_id: 605
touches:
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-10, action: created, notes: "turn-algorithm.md created as reference file" }
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction, date: 2026-06-11, action: updated, notes: "Wrapped as invokable skill. Passive mode unchanged. Explicit mode narrates each phase and surfaces recommended sequence." }
---

# /turn-algorithm — Per-Turn Protocol

The Sovereign Duo operating protocol in executable pseudo-code form. Two modes:

**Passive (default, every turn):** The algorithm runs silently. No narration.
Results surface in RESPOND as: files written + next step + voice insight.

**Explicit (`/turn-algorithm` invoked):** Narrate each phase as it executes.
End with a proposed sequence for the user to approve before acting.

---

## When to invoke explicitly

- Session start when context is ambiguous or post-compaction
- Turn is complex enough that alignment before execution matters
- User wants to inspect or redirect the planned sequence
- Protocol feels like it's drifting — explicit run resets it

---

## Explicit Mode Response Format

When invoked, after completing each phase, surface:

```
ORIENTATION:   [what was read, what was already known]
SKILL LOADED:  [which skill governs this turn, or "no match"]
QUEUE:         [items queued this turn, or "none"]
EXECUTE PLAN:  [what I'm about to do — ordered list]
               1. [step]
               2. [step]
               3. [step]
AWAITING:      [approval to proceed, or proceeding if autonomous mode]
```

The EXECUTE PLAN is the recommended sequence. User can redirect any step
before execution begins. After approval (or immediately in autonomous mode),
execute in order, committing after each file change.

---

## Algorithm Reference

Full pseudo-code: [`../turn-algorithm.md`](../turn-algorithm.md)

Read it before acting on any non-trivial turn. It governs:
- Orientation (context.md reads, post-compaction)
- Skill check (first — before queue scan)
- Doc improvement gate
- Queue scan (heuristics, classify, batch POST)
- Focus awareness + turn_focus_type classification
- Execute (exploratory vs implementation split)
- DNA (frontmatter sync, POST /dna/file, verification gate)
- Skill/algorithm review gate
- Reflection gate
- Respond (compact commentary vs conversational, next step, voice)

---

## Standing Rule

The algorithm is active every turn whether or not the skill is explicitly invoked.
Invoking it makes the execution visible. Not invoking it makes it silent.
The behavior is identical either way — only the narration changes.
