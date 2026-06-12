---
description: PowerShell authoring reference for this machine — PS5.1 constraints, encoding rules, command length limits, PATH scripts. Load before writing any shell commands or scripts.
disable-model-invocation: false
shell: powershell
argument-hint: []
title: "PowerShell Skill"
domain: ccc-qoq
status: APPROVED
source_of_truth: Studio
type: skill
version: "0.1.0"
created: 2026-06-09
created_model: claude-sonnet-4-6
created_session: post-compaction-2026-06-09
updated: 2026-06-09
sweep_count: 5
tags: [skill, powershell, machine-context, encoding, constraints]
qoq_item_id: 371
touches:
  - { model: claude-sonnet-4-6, session: post-compaction-2026-06-09, date: 2026-06-09, action: created }
  - { model: claude-sonnet-4-6, session: post-compaction-2026-06-09-b, date: 2026-06-09, action: updated, notes: "Added Cloudflare 1101 false-failure pattern + $PID reserved variable" }
  - { model: claude-sonnet-4-6, session: fix-393, date: 2026-06-09, action: updated, notes: "Added standing orders reference section (fix item 393 — silo problem)" }
  - { model: claude-sonnet-4-6, session: 78e6e2b4-34df-4c73-852c-d71397a90c55, date: 2026-06-10, action: updated, notes: "Added token-per-call rule (item 478) and skill-review gate (item 479)" }
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-3, date: 2026-06-12, action: swept, notes: "Corrected sweep_count to match touches length (#662 audit)" }
---

# /powershell — Machine-Aware PowerShell Reference

This skill documents the PowerShell environment on the Sovereign Duo machine. Load it before
writing scripts, shell commands, or anything that runs in the PowerShell tool. Designed for
both interactive use and cold-start sub-agents that haven't seen prior conversation context.

**Review this entire file before writing any PowerShell commands. Skipping this read is a
protocol failure — PS5.1 constraints are non-obvious and silently corrupt output.**

Full machine reference: [../../machine-context.md](../../machine-context.md)

> **Standing orders:** If you loaded this skill without running `/qoq` first, read
> [../standing-orders.md](../standing-orders.md) to activate per-turn protocol (QUEUE, DNA, COMMIT, FOCUS, NEXT, VOICE).

---

## Shell: Windows PowerShell 5.1

This is **Windows PowerShell 5.1** — not PowerShell 7/Core. Syntax that works in PS7 may
be a parse error in PS5.1. Never assume PS7 features.

---

## Hard Constraints (Parse Errors or Silent Failures)

| What | Wrong | Right |
|---|---|---|
| Conditional assign | `$x = $a ? $b : $c` | `if ($a) { $x = $b } else { $x = $c }` |
| Chain on success | `cmd1 && cmd2` | `cmd1; if ($?) { cmd2 }` |
| Null coalesce | `$x = $a ?? $b` | `if ($null -eq $a) { $x = $b } else { $x = $a }` |
| Null conditional | `$obj?.Prop` | `if ($obj) { $obj.Prop }` |
| Here-string indented closing | `  '@` | `'@` must be at column 0 |
| Em dash in scripts | `— text` | Use `-` instead; em dash corrupts as Windows-1252 and breaks string parsing |
| Redirect stderr | `2>&1` on native exe | Stderr is already captured — omit |
| Interactive | `Read-Host` | Not available; tool is `-NonInteractive` |

---

## Encoding — Non-Negotiable

```powershell
# ALWAYS specify encoding when reading .md, .json, .ts, or any text file
$raw = Get-Content $path -Raw -Encoding UTF8 -ErrorAction SilentlyContinue

# ALWAYS specify encoding when writing files others will read
$content | Out-File $path -Encoding utf8
```

PS5.1 defaults to Windows-1252. Without `-Encoding UTF8`, any non-ASCII character
(em dash, curly quote, accented letter) is silently corrupted. The error surfaces
3+ hops downstream, not at the read site.

---

## Command Length — 965 Byte Limit

The PowerShell tool has a hard limit. For any payload over ~400 chars, use a temp file:

```powershell
$payload = @'
[
  { "large": "json array" },
  { "second": "item" }
]
'@
$payload | Out-File "$env:TEMP\batch.json" -Encoding utf8
& "C:\Scripts\some-script.ps1" "$env:TEMP\batch.json"
```

Temp files in `$env:TEMP` are ephemeral — no cleanup needed.

---

## Chaining

```powershell
# Unconditional chain (always runs both)
cmd1; cmd2

# Conditional chain (cmd2 only if cmd1 succeeded)
cmd1; if ($?) { cmd2 }

# Never use && — it is not available in PS5.1
```

---

## Here-Strings (Multi-Line Strings)

```powershell
# Single-quoted (literal — no variable expansion)
$json = @'
{ "key": "value with $literal dollar signs" }
'@

# Double-quoted (interpolated)
$json = @"
{ "key": "$variableExpanded" }
"@
```

**The closing `'@` or `"@` must be at column 0 (no leading whitespace).** Indenting it is a parse error.

---

## API Calls (REST)

```powershell
$token = "your-token-here"
$h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
$base = "https://ccc-qoq.rossonlineservices.workers.dev"

# GET
$r = Invoke-RestMethod "$base/focus" -Headers $h

# POST with body
$body = @{ title = "Item title"; stage = "queued" } | ConvertTo-Json
Invoke-RestMethod "$base/items" -Method POST -Headers $h -Body $body

# PATCH
Invoke-RestMethod "$base/items/42" -Method PATCH -Headers $h -Body '{"stage":"done"}' -ContentType "application/json"
```

---

## Scripts on PATH (`C:\Scripts`)

Available by name, no path, no extension required (`.PS1` is in PATHEXT):

```powershell
# Single API call — eliminates repeated token/headers/base boilerplate
qoq-api GET /focus
qoq-api GET /items/437
qoq-api PATCH /items/437 '{"stage":"done"}'
qoq-api POST /dna/file '{"path":"src/handlers/items.ts","action":"updated","model":"claude-sonnet-4-6","domain":"ccc-qoq"}'
# On 1101 from a write to a single-resource path, qoq-api auto-GETs to verify state.

qoq-git status                           # git from ccc-qoq dir — no cd needed
qoq-git add src/handlers/items.ts
qoq-git push origin master
qoq-git log --oneline -5
# Use Bash tool with HEREDOC for git commits (PS5.1 has no heredoc)

qoq-add "$env:TEMP\batch.json"           # bulk queue items
qoq-add "$env:TEMP\batch.json" -DryRun   # preview only
qoq-add "$env:TEMP\batch.json" -Regenerate  # + KV regen at session end

dna-index                          # scan all projects for DNA compliance
dna-index -Register -Session $sid  # POST eligible files to D1
dna-index -Missing                 # only show non-FULL files

acis-deploy                        # ACIS ONLY — build + deploy Pages + Worker
acis-trigger scraper               # manual ACIS agent trigger
```

---

## Variable Patterns

```powershell
# Environment variable read
$tmp = $env:TEMP
$token = $env:ACIS_ADMIN_TOKEN

# Null check (PS5.1 style)
if ($null -eq $value) { ... }
if (-not $value) { ... }

# Array check
if ($arr.Count -eq 0) { ... }

# String interpolation with method calls — wrap in $()
Write-Host "Count: $($items.Count)"
Write-Host "Upper: $($name.ToUpper())"
```

---

## Token Per Call — Non-Negotiable

Shell state does NOT persist between PowerShell tool calls. `$env:QOQ_ADMIN_TOKEN` is
cleared at the end of every tool call.

**Always prepend the token to every PS tool call that uses `qoq-api`:**

```powershell
$env:QOQ_ADMIN_TOKEN = "171cdb83f3ae87ee99030164f16784ad216a153b2b7296278754435e3485b293"
qoq-api GET /focus
```

Never assume the token is already set. Never split the token assignment and the `qoq-api`
call across two separate tool calls. If the token is missing, `qoq-api` silently fails
with a 401 and no useful error message.

---

## Reserved Variables — Do Not Assign

```powershell
# $PID is read-only in PS5.1 — "Cannot overwrite variable PID because it is read-only"
# Use $parentId, $nodeId, $itemId, etc. instead
$parentId = $p.data.id   # OK
$PID = $p.data.id        # PARSE ERROR — DO NOT USE
```

---

## Cloudflare Worker API — Known Quirks

### 1101 False-Failure After Deploy

`Invoke-RestMethod` may throw `WebException: error code: 1101` immediately after
a Worker deploy (cold-start race). The request **may have actually succeeded**.

**Protocol: always verify with a GET before retrying ANY mutating call (PATCH or POST).**

```powershell
# After a 1101 on PATCH — verify before retrying:
$check = Invoke-RestMethod "$base/items/437" -Headers $h
Write-Host "stage: $($check.data.stage_name)"
# If the state is already what you wanted — it succeeded. Do NOT retry.

# After a 1101 on POST (create) — verify before retrying:
$recent = Invoke-RestMethod "$base/items?parent_id=445&limit=20" -Headers $h
# Check if the item title already exists in the response — if yes, it was created.
```

**This applies to qoq-add too.** If qoq-add returns failures with 1101, check D1 before
re-running — the items may already exist. Re-running creates duplicates.

Re-running a PATCH that already succeeded can double-apply (e.g., increment sweep_count twice,
append duplicate events). Always verify first, then act.

### D1 Query Routing Rule

**Prefer the qoq API** (`Invoke-RestMethod` via qoq-api.ps1) for all standard data
operations. The API returns joined, stage-resolved data, handles auth, and the
response shape is stable. Use it for: fetching items, patching stages, closing nodes,
any operation the API surface covers.

**Use D1 MCP only** for raw SQL the API cannot serve: ad-hoc schema inspection,
cross-table joins without an endpoint, migration debugging, or direct data repair.

For raw SQL: `mcp__cloudflare__d1_query` does not serialize results (returns `[object Object]`).
Use `mcp__claude_ai_Cloudflare_Developer_Platform__d1_database_query` instead.
If that also fails, fall back to qoq-api.ps1 with a purpose-built endpoint.

---

## When to Use Bash Tool Instead

Prefer the Bash tool for:
- `curl` HTTP calls (avoids PowerShell SSL/cert issues)
- `node` for JSON parsing of API responses
- Long unix pipelines

In Bash tool, chain with `;` not `&&`.

---

*Reference: [../../machine-context.md](../../machine-context.md)*
