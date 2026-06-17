---
description: Pre-action skill check protocol — before any non-trivial action, enumerate available skills, confirm which apply, and invoke them. Based on Anthropic engineering Rule 1: prompt skills, not Claude. Run when starting a new task type or when uncertain if a skill covers the work.
disable-model-invocation: false
shell: powershell
argument-hint: []
title: "Check-Skills Skill"
domain: ccc-qoq
status: APPROVED
source_of_truth: Studio
type: skill
version: "0.1.0"
created: 2026-06-09
created_model: claude-sonnet-4-6
created_session: post-compaction-2026-06-09
updated: 2026-06-09
sweep_count: 2
tags: [skill, meta, protocol, intelligence-layer, inline-chat]
qoq_item_id: 374
---

# /check-skills — Pre-Action Skill Check Protocol

**Rule 1 (Anthropic Engineering):** Prompt skills, not Claude.

Skills are organized collections of files that package composable procedural knowledge.
They persist. They improve. They chain. A one-off prompt evaporates; a skill compounds.

Before any non-trivial action — before writing a script, before creating an ainotebook entry,
before a queue batch, before a file operation — check if a skill covers it.

---

## The Protocol

### 1. Enumerate Available Skills

Read the skills index:

```
.claude/skills/context.md        ← start here; lists all skills and what they cover
```

Or scan the directory directly:
```
.claude/skills/
  qoq/          → /qoq        session start, queue state, standing orders
  qoq-add/      → /qoq-add    bulk queue item creation
  powershell/   → /powershell  PS5.1 machine context, constraints, patterns
  ainotebook/   → /ainotebook  ADR, reflect, thought-log authoring
  read-context/ → /read-context  context file loading, cold-start orient
  check-skills/ → /check-skills  this skill
```

### 2. Match Task to Skill

| If you're about to... | Check skill |
|---|---|
| Write any PowerShell command or script | `/powershell` |
| Create an ADR, reflection, or thought-log | `/ainotebook` |
| Queue 2+ items | `/qoq-add` |
| Start a session or re-orient after compaction | `/qoq` |
| Enter a new work area unfamiliar this session | `/read-context` |
| Write code or call a Cloudflare API | Read relevant Worker source first |

### 3. Load the Skill

Invoke the skill by name before acting. The skill file tells you:
- Constraints specific to this action type
- Step-by-step protocol
- Patterns that have been validated
- Things that look right but break silently

### 4. After Completing — Update the Skill If Needed

```
After every skill use:
  Was the output exactly right?
  → Yes: done.
  → No: is this a one-time fix, or should it be in the skill forever?
       → One-time: fix it and move on.
       → Forever: UPDATE THE SKILL NOW.
```

Skills get smarter every session only if they're updated every session. Day 30 should
be better than Day 1. The skill is the product, not the output.

---

## Skill Anatomy (3 Layers)

Based on Anthropic engineering best practices:

```
Layer 1: Description (frontmatter)
  → What Claude checks to decide if this skill applies
  → Must be specific; vague descriptions = missed matches

Layer 2: Instructions (SKILL.md body)
  → Step-by-step protocol
  → Most people stop here

Layer 3: Tools (supporting files in skill dir)
  → Scripts, reference docs, API call templates, data files
  → THIS IS WHERE THE LEVERAGE IS
  → If a skill writes the same code every session: save it as a tool file
  → Code compute is cheaper, faster, and deterministic vs. AI tokens
```

Example: `qoq/queue-taxonomy.md` is a Layer 3 tool — loaded on demand, costs nothing
when not needed, eliminates re-derivation of the taxonomy every session.

---

## Skill Flags Reference

| Flag | Effect |
|---|---|
| `disable-model-invocation: true` | Only user can invoke; AIBuddy cannot auto-invoke |
| `disable-model-invocation: false` (or absent) | Both user and AIBuddy can invoke |
| `user_invocable: false` | Hidden from `/` slash menu; only sub-agents can invoke |

High-side-effect skills (deploy, send messages, irreversible writes) should have
`disable-model-invocation: true`. Reference/advisory skills should be freely invocable.

---

## Inline Chat Protocol

When working in inline chat (not a full skill invocation):

1. **Task arrives** — before doing anything, ask: "Is there a skill for this?"
2. **Skill found** — read its SKILL.md; follow its protocol
3. **No skill found** — proceed; note if a skill should be created
4. **After completion** — if a new pattern emerged, queue a "Build: [skill name] skill" item

The queue is the memory. New skill candidates go in the queue, not mental notes.

---

## Skills are the Intelligence Layer

From the video synthesis research (`research/external/video-synthesis-2026-06-08.md`):

> *"The folder is the app. The folder is the agency. The folder IS the IP."*
> — Jake Van Clief

The skills directory is not a collection of shortcuts. It is the accumulated operational
intelligence of the Sovereign Duo — every constraint learned, every pattern validated,
every encoding bug that burned us once and won't burn us again.

Context windows close. Conversations compact. Model versions change.

Skills persist.

---

## Current Skills Index

See [../context.md](../context.md) for the full up-to-date table.

<!-- dna-touches
  - { model: claude-sonnet-4-6, session: post-compaction-2026-06-09, date: 2026-06-09, action: created }
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-3, date: 2026-06-12, action: swept, notes: "Corrected sweep_count to match touches length (#662 audit)" }
-->