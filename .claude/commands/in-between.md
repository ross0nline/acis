---
title: "in-between"
created_model: claude-sonnet-4-6
created_session: 78e6e2b4-34df-4c73-852c-d71397a90c55
sweep_count: 0
---

# /in-between — Mid-Turn Feedback Injection

This skill is a signal, not a state-check. When the user sends a message prefixed with
`/in-between`, it means: **"I'm adding feedback while you're working. Don't stop. Don't
lose your place. Absorb this and continue your current turn."**

The user sees an "Add feedback" input in the UI while tasks are running. /in-between is
how they inject a thought, correction, or observation into that slot without interrupting
the work in progress.

## When this appears

- The user has sent feedback mid-turn (while tool calls are running, while a task is
  in progress, or between steps of a multi-step action)
- The feedback may be a correction, a clarification, a new constraint, or an observation
- It is NOT a request to stop and do something else unless the feedback explicitly says so

## How to handle it

1. **Acknowledge in one line** — confirm you saw it. Don't repeat it back verbatim.
2. **Queue anything queue-worthy** — if the feedback surfaces an idea, gap, or follow-on
   item, queue it immediately (one line: `Queued: #ID (title).`)
3. **Apply it if applicable to current work** — adjust the in-progress action if the
   feedback changes what you're doing
4. **Resume** — continue exactly where you left off, or execute the work that was pending
   when the feedback arrived. If nothing was in progress, proceed with whatever would have
   been next. Do not ask what to do. Do not run a state scan.

## What NOT to do

- Do not abandon your current task
- Do not ask "should I stop what I'm doing?"
- Do not run /post-compaction or /queue-scan
- Do not treat it as a new top-level request unless the user explicitly says to pivot

## Example

User mid-turn: `/in-between — don't use $env:ADMIN_TOKEN in that block, use the profile var`

Correct response:
```
Got it — switching to $env:QOQ_ADMIN_TOKEN. Queued: #552 (update all skills to use profile var). Continuing.
[resumes the current turn, or the work that was pending/would have been done had the feedback not arrived]
```
