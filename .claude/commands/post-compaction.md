---
description: Post-compaction re-orientation protocol. Run immediately when a conversation summary message appears — before any other action. Reads transcript turns, loads memory, checks focus drift, scans queue, activates standing orders.
disable-model-invocation: false
shell: powershell
argument-hint: []
title: "Post-Compaction Skill"
domain: ccc-qoq
status: APPROVED
source_of_truth: Studio
type: skill
version: "0.2.0"
created: 2026-06-09
created_model: claude-sonnet-4-6
created_session: post-compaction-2026-06-09-b
sweep_count: 3
tags: [skill, compaction, context, cold-start, orientation, standing-orders]
qoq_item_id: null
touches:
  - { model: claude-sonnet-4-6, session: post-compaction-2026-06-09-b, date: 2026-06-09, action: created }
  - { model: claude-sonnet-4-6, session: fix-393, date: 2026-06-09, action: updated, notes: "Step 5 now references shared standing-orders.md (fix item 393 — silo problem)" }
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-3, date: 2026-06-12, action: updated, notes: "Added stale-check for post_compaction_review.md, compaction summary note, agent routing table, new pitfalls, end-of-session update reminder" }
---

# /post-compaction — Re-Orientation Protocol

Run immediately when the conversation summary message appears. The compaction summary
is a starting point, not a substitute for transcript context. Act only after completing
this protocol.

---

## Step 0 — Read `post_compaction_review.md` First

Before touching code, files, or the transcript:

```
C:\Users\rossonline\.claude\projects\C--Users-rossonline-ccc-compliance-portfolio\memory\post_compaction_review.md
```

This is the live state document — in-flight work, pending items, key file locations,
infrastructure IDs. It's written specifically to survive compaction. Read it in full.

Then read `memory/focus_state.md` to get the last recorded focus node.

**Stale-check**: Look at the `originSessionId` in the frontmatter. If it doesn't match
the current session's context (i.e., it's from a previous session), the file is stale
background context — not current state. Use it for infrastructure constants and key file
paths, but don't trust its "In-Flight" section as authoritative. Plan to update it at the
end of this protocol (Step 6).

---

## Step 1 — Read Transcript Turns (Non-Negotiable)

**Minimum: last 3 turns. Target: last 10 turns. Hard cap: 10.**

**Compaction summary shortcut**: Anthropic's auto-compact design preserves the most
recent turns verbatim (or near-verbatim) in the compaction summary message. If you have
a detailed compaction summary in your current context window, reading it carefully IS
reading the transcript — the JSONL provides the same content. Use the JSONL read as a
verification step when something in the summary feels incomplete or ambiguous, not as a
required first pass.

What the transcript catches that summaries often miss:
- User corrections that contradict the summary
- Partially completed tasks (do not restart from scratch)
- Pending items the user named that the summary dropped
- The exact last thing the user said (not a paraphrase)

**If the transcript isn't accessible:** ask the user to paste recent context before
proceeding. Do not act on the summary alone.

```powershell
# List recent JSONL files to find the right session
Get-ChildItem "C:\Users\rossonline\.claude\projects\C--Users-rossonline-ccc-compliance-portfolio\" -Filter "*.jsonl" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 5 Name, LastWriteTime
```

Then read the file using the Read tool with `offset` set to skip to the last N turns.
A JSONL turn is one JSON object per line. Parse the last 10 lines.

If the file is large (> 5000 lines), use `offset` to find the right position:
```powershell
(Get-Content "path\to\session.jsonl" | Measure-Object -Line).Lines
```

---

## Step 2 — Load Remaining Memory

1. **`memory/MEMORY.md`** — Already auto-loaded; scan for anything stale or contradicted by transcript

---

## Step 3 — Check Focus Drift

```powershell
$token = $env:QOQ_ADMIN_TOKEN
if (-not $token) { Write-Error "Set QOQ_ADMIN_TOKEN in your PS profile first"; exit 1 }
$h = @{ Authorization = "Bearer $token" }
$live = Invoke-RestMethod "https://ccc-qoq.rossonlineservices.workers.dev/focus" -Headers $h
Write-Host "Live focus: $($live.data.focus.title) (id=$($live.data.focus.id))"
```

Compare live focus to `memory/focus_state.md`. If they differ:
- User changed focus manually between sessions
- Update `memory/focus_state.md` to match live
- Proceed with the live focus node, not the stale memory

---

## Step 4 — Surface Pending Work

From the transcript and summary, identify:

1. **In-progress task**: The last incomplete operation. Resume it — don't restart from scratch.
2. **Pending items**: Things the user named that weren't yet done.
3. **Queue candidates**: Items identified but not yet added to D1 — add them now via `qoq-add`.

Report in one paragraph: what you read, what's in-flight, what you're about to do.

---

## Step 5 — Activate Standing Orders

Standing orders are now active. Full checklist and during-session protocol:

**[../.claude/skills/standing-orders.md](../standing-orders.md)**

Read that file now if you haven't loaded `/qoq` this session. The standing orders apply
starting from the next turn.

---

## Step 6 — Resume

Pick up from Step 4's in-progress task. State one sentence: what you're about to do and why.

Do not re-introduce yourself. Do not summarize the project. Do not ask what to work on
if the transcript makes it clear. Act.

**End-of-session**: Update `memory/post_compaction_review.md` before closing out any
significant session. The next agent starts cold — leave a state that lets them act, not
orient.

---

## Agent Routing

When work arises that might need a specialist, route correctly:

| Work type | Right agent |
|---|---|
| ccc-qoq system dev (schema, routes, generation engine) | Ricci (`ricci-qoq`) |
| Live system quality audit (endpoints, crons, outputs) | QA Auditor (`acis-qa-auditor`) |
| Protocol guidance (sweep_count, DNA frontmatter, skill conventions) | Protocol Specialist (#657 — not yet built) |
| Script writing / C:\Scripts\ inventory | Script Specialist (#658 — not yet built) |
| Proposal / compliance-portfolio / personal project work | Inline — no agent needed |
| Broad codebase search | Explore agent |

Do not enlist Ricci for non-ccc-qoq work. Do not enlist QA Auditor for development tasks.
When the specialist agents are not yet built, handle protocol questions inline.

---

## Cloudflare Operations Routing

When a Cloudflare task arises post-compaction, route correctly:

| Task | Right tool |
|---|---|
| Set/rotate Worker secrets | `wrangler secret put` via Bash — canonical, no UI needed |
| View secrets list | `wrangler secret list` |
| Navigate Dashboard for things wrangler can't do | Playwright MCP (`/playwright` skill) |
| Deploy a Worker | `wrangler deploy` or project deploy script |
| Browse D1 data, KV keys, R2 objects via UI | Playwright MCP — use `browser_navigate` to dashboard |

Playwright is for UI-only operations. If a wrangler CLI command exists for the task,
use it — it's faster, scriptable, and doesn't require browser state.

---

## Common Post-Compaction Pitfalls

| Pitfall | Correct behavior |
|---|---|
| Acting on summary alone without reading turns | Read 3-10 turns first — non-negotiable |
| Restarting an in-flight task from scratch | Resume from where it stopped |
| Retrying a mutation without GET-verifying | Check actual state first (1101 protocol) |
| Asking what to work on when transcript is clear | Act on what was in-flight |
| Missing the DNA registration for files just created | Check every file touched this session |
| Using `&&` to chain Bash commands | Use `;` — `&&` fails in this environment |
| Trusting stale `post_compaction_review.md` as current | Check `originSessionId` — if prior session, use for constants only |
| Enlisting Ricci for non-ccc-qoq work | Ricci = ccc-qoq system dev only; proposal/personal work is inline |
| Touch note claiming additions not yet in the body | Touch record must describe what was done, not what was planned |
