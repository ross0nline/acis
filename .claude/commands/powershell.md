---
title: "powershell"
created_model: claude-sonnet-4-6
created_session: 78e6e2b4-34df-4c73-852c-d71397a90c55
sweep_count: 0
---

# /powershell — PowerShell Safety Rules

Reference for writing PowerShell commands and scripts correctly in this environment.
Read before writing any PS command that will be saved to disk or is non-trivial.

## Tool selection

| Situation | Use |
|---|---|
| Anything that touches the filesystem, git, npm, wrangler, PS cmdlets | **PowerShell tool** |
| POSIX shell scripts, piped grep/find/head, Bash-only syntax | **Bash tool** |
| Never mix: don't run PS syntax in Bash tool or vice versa | — |

## Command chaining

```powershell
# CORRECT — semicolon chains unconditionally
$a = Get-Item foo; $b = $a.Name; Write-Host $b

# CORRECT — conditional chain (B only if A succeeds)
A; if ($?) { B }

# WRONG — && is NOT available in PowerShell 5.1 (parser error)
A && B
```

## Git commit messages — here-string pattern

Always use a single-quoted here-string. The closing `'@` MUST be at column 0.

```powershell
# CORRECT
$msg = @'
feat(scope): short summary

Longer description here.
$literal dollar signs are safe in single-quoted here-string.

Co-Authored-By: AIBuddy <aibuddy@rossonlineservices.com>
'@
git -C "C:\path\to\repo" commit -m $msg

# WRONG — cat <<'EOF' is Bash syntax, will error in PowerShell
git commit -m "$(cat <<'EOF'
...
EOF
)"
```

## Unicode in PowerShell script files — CRITICAL

**Never write em-dash (`—`) or arrow (`→`) directly into a `.ps1` file.**
The Write tool saves UTF-8; PowerShell 5.1 reads files as Latin-1 by default.
The mismatch produces `â€"` / `â†'` and a parse error on execution.

```powershell
# CORRECT — use code-point variables
$arrow  = [char]0x2192   # →
$emdash = [char]0x2014   # —
$pat    = '\s*' + [regex]::Escape($arrow) + '.*$'

# CORRECT — use ASCII equivalents when the char is in a string literal
$note = "decision - see ADR-005"   # hyphen with spaces instead of em-dash

# WRONG — Unicode literal in script body
$pat = '\s*→.*$'    # will corrupt on execution
```

## Command length limit

**965-byte max per PowerShell tool call command.**

- Split long blocks into sequential calls
- Use `$env:TEMP\scratch.json` for data that would exceed the limit inline
- Never inline large JSON strings — write to file first

```powershell
# CORRECT — write data to temp file, then use it
$data = @{ key = "value" } | ConvertTo-Json
$data | Out-File "$env:TEMP\payload.json" -Encoding utf8
Invoke-RestMethod $url -Method POST -Body (Get-Content "$env:TEMP\payload.json" -Raw)
```

## Environment variables and tokens

```powershell
# CORRECT
$token = $env:QOQ_ADMIN_TOKEN
$h = @{ Authorization = "Bearer $token" }

# WRONG — never hardcode tokens in commands or scripts
$h = @{ Authorization = "Bearer 7096a364f03a..." }
```

## Common pitfalls

| Pitfall | Fix |
|---|---|
| `head` / `tail` don't exist | Use `Select-Object -First N` / `-Last N` |
| `2>&1` wraps native stderr in ErrorRecord | Omit; PS captures stderr automatically |
| `ConvertFrom-Json` → PSCustomObject, not hashtable | Use dot notation: `$obj.key` not `$obj["key"]` |
| `-AsHashtable` not available in PS 5.1 | Use PSCustomObject or cast manually |
| `find`, `grep`, `echo`, `cat` — Unix commands | Use `Get-ChildItem`, `Select-String`, `Write-Host`, `Get-Content` |
| `mkdir -p` | `New-Item -ItemType Directory -Force path` |
| `touch file` | `if (-not (Test-Path path)) { New-Item -ItemType File path }` |
| `rm -rf` | `Remove-Item -Recurse -Force path` |
| Ternary `? :` | Not available in PS 5.1 — use `if/else` |
| Null coalescing `??` | Not available in PS 5.1 — check `$null -eq $x` explicitly |

## Encoding when writing files

```powershell
# Scripts and JSON that other tools will read — always UTF-8
$content | Out-File "file.ps1" -Encoding utf8
Set-Content "file.json" -Value $json -Encoding utf8

# Default PS encoding is UTF-16 LE with BOM — avoid for cross-tool files
```

## linked_paths double-encoding (ccc-qoq API)

The PATCH /items/:id endpoint stores `linked_paths` as a JSON string, not an array.
Must be pre-escaped:

```powershell
$paths    = @("path/to/file.md", "other/file.md")
$json     = $paths | ConvertTo-Json -Compress          # ["path/to/file.md","other/file.md"]
$escaped  = $json.Replace('\','\\').Replace('"','\"')  # [\"path\/to\/file.md\",...]
$body     = '{"linked_paths":"' + $escaped + '"}'      # outer JSON with string value
Invoke-RestMethod "$base/items/$id" -Method PATCH -Headers $h -Body $body
```

## Key constants (never look these up — live here)

| Resource | Value |
|---|---|
| ccc-qoq Worker | `https://ccc-qoq.rossonlineservices.workers.dev` |
| ADMIN_TOKEN | `$env:QOQ_ADMIN_TOKEN` |
| ACIS Worker | `https://acis.rossonlineservices.workers.dev` |
| ACIS ADMIN_TOKEN | `$env:ACIS_ADMIN_TOKEN` |
| Temp file path | `$env:TEMP\scratch.json` (ephemeral, no cleanup needed) |
