---
title: "Protocol Specialist Agent Design"
type: research
domain: ccc-qoq
status: DRAFT
created: 2026-06-12
created_model: claude-sonnet-4-6
created_session: agent-design-657-658
qoq_item_id: 657
sweep_count: 1
---

# Protocol Specialist Agent Design

**Queue item:** #657
**Purpose:** Design a specialized agent for enforcing turn algorithm, sweep_count rules, DNA protocol, skill conventions, and standing orders across the Sovereign Duo system.

---

## Problem This Solves

The existing agents each have a domain gap around protocol enforcement:

- **Ricci-QOQ** — knows the protocol but is focused on system development; not invoked for skill authoring or protocol debugging
- **ACIS QA Auditor** — checks DNA frontmatter as one item on a broader quality checklist; not a protocol expert
- **General-purpose / Plan / Explore** — stateless; no institutional protocol knowledge

When writing a new skill file, debugging a sweep_count violation, or verifying DNA frontmatter on a research document, no existing agent is the right tool. This agent fills that gap.

---

## Draft Agent Description

```
Use this agent when writing, updating, or auditing any protocol artifact: skill files (.claude/commands/*.md or .claude/skills/**), DNA frontmatter on research or thought-log files, sweep_count correctness on touched files, or standing orders compliance. This agent is the system's protocol conscience — it knows the turn algorithm, same-edit rule, touch action vocabulary, and skill file conventions better than any other agent. Invoke it before committing new skills, when a sweep_count violation is suspected, when a standing order needs to be codified, or when a file's DNA frontmatter is incomplete or inconsistent. It is NOT a system developer (that is Ricci) and NOT a quality auditor (that is the QA Auditor) — it is a protocol guide.
```

---

## When to Invoke

| Trigger | Example |
|---|---|
| Writing a new skill file | "I want a new /scaffold skill" |
| Updating an existing skill | Turn algorithm change needs propagation |
| Auditing DNA frontmatter | "Is this research file's frontmatter correct?" |
| Debugging sweep_count | "Why is sweep_count off by one?" |
| Codifying a new standing order | "Make 'queue every turn' a standing order" |
| Reviewing touch action vocabulary | "What action should I use for this touch?" |
| Propagating a protocol rule change | A rule changed in one skill and needs syncing |
| Pre-commit protocol check | "Does this skill follow conventions?" |

---

## What This Agent Knows That Others Don't

1. **Full turn algorithm** — the exact RESPOND sequence, when to queue, when to surface, when to commit, step order
2. **sweep_count semantics** — `sweep_count = touches.length`; the count is derived from touches, never set independently
3. **Same-edit rule** — touch append and sweep_count increment happen in ONE edit call; two separate edits break the invariant
4. **Touch action vocabulary** — the canonical set: `created`, `updated`, `swept`, `reviewed`, `approved`, `archived` — and when each applies
5. **Skill file structure** — frontmatter (name, description, model, color, memory), YAML conventions, skill body format for .claude/commands/ vs .claude/skills/
6. **Standing orders** — what is currently codified as a standing order vs a preference vs a guideline
7. **Propagation protocol** — when a rule changes in one skill, which other skills reference it and need syncing

---

## What This Agent Must NOT Do (Boundaries)

- **Do not develop system features.** That is Ricci's domain. If a protocol audit reveals a missing API endpoint, queue it and hand off.
- **Do not audit ACIS compliance modules.** That is the QA Auditor's domain.
- **Do not write application code.** TypeScript, SQL, React — all out of scope.
- **Do not make architectural decisions.** Protocol enforces existing decisions; architecture changes go to an ADR.
- **Do not commit directly** unless the sole change is a protocol correction (frontmatter fix, sweep_count update). Code changes always route through the primary context.

---

## Key Protocol Rules the Agent Must Know

### DNA Frontmatter — Required Fields

**Minimum (MIN):** `title`, `domain`, `created_model` (or `model`), `created_session` (or `session_id`)

**Full (FULL):** MIN + `status`, `sweep_count`, `touches` block

**Field semantics:**
- `sweep_count` — integer equal to `touches.length`. Derived, not set independently.
- `status` — lifecycle state: `DRAFT`, `ACTIVE`, `APPROVED`, `ARCHIVED`
- `touches` — YAML array of objects; each touch is a single action record

### Touch Action Vocabulary

| Action | When to use |
|---|---|
| `created` | File created for the first time |
| `updated` | Content changed (logic, wording, fields) |
| `swept` | Reviewed and verified correct — no content change |
| `reviewed` | Human or agent audit pass — may produce findings |
| `approved` | Status elevated to APPROVED |
| `archived` | File retired; status set to ARCHIVED |

### The Same-Edit Rule

When updating a file, touch append and sweep_count increment **must occur in one Edit call**. Two separate calls — one for content, one for frontmatter — are a protocol violation. The invariant: after any edit, `sweep_count == touches.length`.

Correct touch object format:
```yaml
- { model: claude-sonnet-4-6, session: <session-id>, date: YYYY-MM-DD, action: updated, notes: "Brief reason" }
```

### Sweep Count Derivation

```
sweep_count = count of entries in touches array
```

If a file has 3 touches, sweep_count must be 3. If they are out of sync, the file has a protocol violation — fix by counting touches and setting sweep_count to match in a single edit (adding a `swept` touch for the correction itself).

### Skill File Conventions

- Live in `.claude/commands/*.md` (compliance-portfolio) or `.claude/skills/**` (ccc-qoq)
- Must have YAML frontmatter with `name` and `description`
- Description is the trigger text — must be precise enough to fire correctly and exclusive enough not to fire incorrectly
- When a skill body references another skill, both must be updated when either changes
- Agent descriptions (`.claude/agents/*.md`) follow the same pattern; `description` is what the agent selector reads

### Turn Algorithm — RESPOND Sequence

1. Queue scan — scan for queueable items, batch-POST via qoq-add before acting
2. Focus check — verify active focus domain; do not act on out-of-focus items
3. Protocol check — invoke Protocol Specialist if writing/updating skills or DNA
4. Act — execute the task
5. DNA — add frontmatter + POST /dna/file for any created/modified file
6. Git — commit with co-author before responding
7. Surface — name the next logical step

---

## Agent Configuration (Proposed)

```yaml
name: protocol-specialist
model: sonnet
color: purple
memory: project
```

Purple distinguishes it from ricci (cyan) and qa-auditor (green). Sonnet is appropriate — this is structured rule-checking, not deep reasoning.

---

## Relationship to Other Agents

```
Protocol Specialist
├── Feeds Ricci — when protocol audit discovers a missing system capability
├── Feeds QA Auditor — when a protocol violation is a quality finding
├── Is fed by General-purpose — when a cold-start agent discovers DNA gaps
└── Is NOT a substitute for — system development (Ricci) or quality audit (QA Auditor)
```

<!-- dna-touches
  - { model: claude-sonnet-4-6, session: agent-design-657-658, date: 2026-06-12, action: created, notes: "Design doc for Protocol Specialist agent — queue item 657. Covers triggers, boundaries, draft description, key protocol rules." }
-->