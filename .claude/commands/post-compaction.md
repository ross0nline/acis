# /post-compaction — Session State Recovery After Compaction

Run immediately after any compaction event, or at the start of any session where context
feels unfamiliar. Replaces manually reading the memory file — surfaces live state in one shot.

## When to invoke
- You see a compaction summary block at the top of the conversation
- The user says "we just compacted" or "start fresh"
- You feel uncertain about what was in progress

## Steps

### 1. Read the memory file

Read `C:\Users\rossonline\.claude\projects\C--Users-rossonline-ccc-compliance-portfolio\memory\post_compaction_review.md`

Extract:
- **Completed this session** — what was shipped
- **In-flight / pending** — what needs to continue
- **Next recommended step** — the specific next action
- **Key file locations** — where the active code lives

### 2. Fetch live ccc-qoq state + check for focus drift

```powershell
$h = @{ Authorization = "Bearer $env:QOQ_ADMIN_TOKEN" }
$base = "https://ccc-qoq.rossonlineservices.workers.dev"

# Current focus
$focus = Invoke-RestMethod "$base/focus" -Headers $h
Write-Host "FOCUS: $($focus.data.focus.id) — $($focus.data.focus.title) [$($focus.data.focus.stage_name)]"
$anc = $focus.data.ancestors | ForEach-Object { $_.title }
Write-Host "Ancestors: $($anc -join ' > ')"
```

Compare live focus ID to `memory/focus_state.md` sub level:
- **Match** → in sync, proceed
- **Mismatch** → user likely changed it manually. Report: "Focus drift: system=[live title], memory=[declared sub]. Updating memory to match." Then update `focus_state.md`.

### 3. Check recent commits across active repos

```powershell
Write-Host "=== ccc-qoq ===" -ForegroundColor Cyan
git -C "C:\Users\rossonline\ccc\ccc-qoq" log --oneline -5
Write-Host "=== compliance-portfolio ===" -ForegroundColor Cyan
git -C "C:\Users\rossonline\ccc\compliance-portfolio" log --oneline -5
```

### 4. Report (10 lines max)

Synthesize into a brief report:

```
POST-COMPACTION BRIEF — [date]

COMPLETED: [bullet from memory file]
IN-FLIGHT: [top 2-3 pending items with IDs]
NEXT STEP: [specific item ID + title]
FOCUS: [current focus item from live API]
LAST COMMIT: [most recent commit from relevant repo]
```

Do not pad the report. If everything is clear from step 1, step 2-3 can be skipped.

## Key constants (do not look these up — they live here)

| Resource | Value |
|---|---|
| ccc-qoq Worker | `https://ccc-qoq.rossonlineservices.workers.dev` |
| ccc-qoq ADMIN_TOKEN | `$env:QOQ_ADMIN_TOKEN` (set in PS profile — never hardcode) |
| ccc-qoq D1 | `f405cc09-b555-45f2-a1c5-3ae27cd64398` |
| ACIS Worker | `https://acis.rossonlineservices.workers.dev` |
| Memory dir | `C:\Users\rossonline\.claude\projects\C--Users-rossonline-ccc-compliance-portfolio\memory\` |

## After the brief

Update `/qoq` session registration if starting a new ccc-qoq session (mark compaction=1).
Then proceed directly to the next step — do not ask the user what to work on unless the
memory file's next step is genuinely ambiguous.
