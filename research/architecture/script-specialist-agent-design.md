---
title: "Script Specialist Agent Design"
type: research
domain: ccc-qoq
status: DRAFT
created: 2026-06-12
created_model: claude-sonnet-4-6
created_session: agent-design-657-658
qoq_item_id: 658
sweep_count: 1
---

# Script Specialist Agent Design

**Queue item:** #658
**Purpose:** Design a specialized agent that knows the C:\Scripts\ inventory, identifies workflow gaps, and writes new PowerShell utility scripts for the Sovereign Duo system.

---

## Draft Agent Description

```
Use this agent when creating, modifying, or auditing utility scripts in C:\Scripts\. It knows the full existing script inventory (14 scripts spanning QOQ API, DNA management, ACIS operations, git helpers, deployment, and codebase metrics), the PS5.1 constraints of this machine (no && chaining, 965-byte command limit, UTF-8 encoding required, no ternary operator), and the Sovereign Duo conventions (QOQ_ADMIN_TOKEN from env, AIBuddy co-authorship, token-per-call rule for qoq-api). Invoke it when a new workflow gap is identified, when an existing script needs an argument added, or when a repetitive terminal workflow needs to be automated. It does NOT write application code (TypeScript, SQL, Workers) — scripts only.
```

---

## Existing Script Inventory

| Script | Purpose | Key Args / Notes |
|---|---|---|
| `qoq-api.ps1` | Thin REST wrapper for ccc-qoq API; handles auth, 1101 false-failure recovery | `<Method> <Path> [Body]`; reads `$env:QOQ_ADMIN_TOKEN` |
| `qoq-add.ps1` | Bulk queue item creation from a JSON array file | `<File> [-DryRun] [-Parent N] [-Domain s] [-Stage s] [-Regenerate]`; auto-derives title_short; root-item guard |
| `qoq-git.ps1` | Run git from ccc-qoq directory regardless of cwd (solves Bash tool cwd-reset) | Mirrors git args exactly; not for commits (PS5.1 lacks HEREDOC) |
| `qoq-export.ps1` | Fetch generated QOQ.md from KV and commit to git | `[-Push]`; GET /generated/full → writes ccc-qoq/QOQ.md |
| `qoq-metrics.ps1` | Codebase token estimation with heuristic calibration | `<code|md|all> [-Verify]`; hits Anthropic count_tokens API with -Verify |
| `qoq-seed.ps1` | Parse QOQ.md and generate seed SQL for ccc-qoq-db | `[-Execute] [-Remote]`; outputs db/seed-qoq.sql |
| `dna-index.ps1` | Scan CCC project MD files for DNA compliance (FULL/MIN/PARTIAL/NONE) | `[-Missing] [-Register -Session <uuid>] [-Project s] [-DryRun]`; excludes .claude dirs |
| `dna-align.ps1` | Cross-reference DB-side DNA audit with local frontmatter; detects drift | `[-Fix] [-DryRun]`; calls GET /dna/audit then resolves local files |
| `acis-deploy.ps1` | Build ACIS frontend + deploy Pages + deploy Worker in one command | No args; 3-step sequence; compliance-portfolio ONLY |
| `acis-trigger.ps1` | Manually fire ACIS API endpoints | `<scraper|heartbeat|vendors|demo-pr>`; reads `$env:ACIS_ADMIN_TOKEN` |
| `acis-secrets-check.ps1` | Compare .dev.vars keys vs deployed Wrangler secrets | No args; highlights gaps |
| `portfolio-deploy.ps1` | Push commits and deploy portfolio Worker | No args; git push → wrangler deploy |
| `phantom_sync.ps1` | Unknown — not inspected in this session | — |
| `wake_phantom.ps1` | Unknown — not inspected in this session | — |

**Token convention:** All QOQ scripts read `$env:QOQ_ADMIN_TOKEN`; ACIS scripts read `$env:ACIS_ADMIN_TOKEN`. Token must be set in the same PowerShell call that uses it — shell state clears between tool calls.

---

## Top 5 Workflow Gaps

These gaps were identified by reading the existing scripts and understanding the system's operational patterns.

### Gap 1: `qoq-focus.ps1` — Focus state get/set from CLI

**Current workflow:** Set focus requires `qoq-api PUT /focus/<id> '{}'` plus knowing the item ID. Reading focus requires `qoq-api GET /focus` and parsing JSON output mentally.

**Gap:** No script wraps focus operations with a human-readable interface. During multi-session work, focus drift is caught only by reading memory files, not by a quick CLI check.

**Proposed script:** `qoq-focus.ps1`
- `qoq-focus` — GET /focus, display current main/sub/light in readable format
- `qoq-focus <id>` — PUT /focus/<id> to set focus
- `qoq-focus -Clear` — clear focus
- Optionally updates `memory/focus_state.md` automatically

### Gap 2: `dna-touch.ps1` — Single-file touch registration from CLI

**Current workflow:** Registering a DNA touch on a file requires manually constructing a JSON body and calling `qoq-api POST /dna/file '{"path":"...","action":"updated",...}'`. The 965-byte PS command limit and JSON escaping make this error-prone when inlined.

**Gap:** No script handles the one-file-at-a-time touch registration that happens after every Edit call. `dna-index.ps1` is batch/scan oriented; it doesn't serve the per-file turn-by-turn protocol.

**Proposed script:** `dna-touch.ps1`
- `dna-touch <path> <action> [-Notes s] [-Session s] [-Domain s]` — POST /dna/file for a single file
- Action validates against the canonical vocabulary: created/updated/swept/reviewed/approved/archived
- Session falls back to `$env:QOQ_SESSION_ID` then "unknown-session"
- CCC-roots the path automatically (strips `C:\Users\rossonline\ccc\`)

### Gap 3: `qoq-status.ps1` — System-wide health snapshot

**Current workflow:** Checking system health requires multiple separate calls: GET /focus, GET /items (filtered), GET /dna/audit, plus reading memory files. No consolidated "how is the system right now" command exists.

**Gap:** During session starts and handoffs, a quick status snapshot would orient the agent faster than reading 5 files in sequence. The cold-start protocol in ricci-qoq.md lists 7 manual steps.

**Proposed script:** `qoq-status.ps1`
- Calls GET /focus, GET /dna/audit summary, and optionally GET /items?stage=active in parallel (sequential in PS5.1 but fast)
- Outputs: current focus item, active item count by domain, DNA health (errors/warnings count), last heartbeat
- Designed to be run as the first command of any session

### Gap 4: `acis-git.ps1` — Mirror of qoq-git.ps1 for compliance-portfolio

**Current workflow:** `qoq-git.ps1` solves the cwd-reset problem for ccc-qoq operations. No equivalent exists for compliance-portfolio. The Bash tool's cwd does reset between calls, but the compliance-portfolio directory is the default cwd, making this less urgent — however, git operations on compliance-portfolio from within a ccc-qoq-focused session still require explicit path handling.

**Gap:** When working across both repos in the same session, there is no `acis-git` that targets `C:\Users\rossonline\ccc\compliance-portfolio` explicitly. The symmetry with qoq-git is also useful for documentation.

**Proposed script:** `acis-git.ps1` — mirrors qoq-git.ps1 exactly but targets compliance-portfolio.

### Gap 5: `qoq-session.ps1` — Session registration + env setup

**Current workflow:** Beginning a new session requires manually: (1) generating or noting a session UUID, (2) setting `$env:QOQ_SESSION_ID`, (3) calling `qoq-api POST /dna/session '{"session_id":"...","model":"...","notes":"..."}'`. This is a 3-step manual workflow done at the start of every session.

**Gap:** No script automates the session start ritual. This is the highest-friction part of the DNA protocol — it's often skipped precisely because it requires manual UUID generation plus an API call with JSON construction.

**Proposed script:** `qoq-session.ps1`
- `qoq-session start [-Model s] [-Notes s]` — generates a UUID, sets `$env:QOQ_SESSION_ID`, POSTs to /dna/session, prints the session ID
- `qoq-session end` — optionally POSTs a session-close touch
- UUID generation: `[System.Guid]::NewGuid().ToString()`

---

## Key Knowledge the Agent Must Have

### PS5.1 Constraints (this machine)

- No `&&` pipeline chaining — use `;` or `if ($?) { ... }`
- No ternary operator (`?:`) — use `if/else`
- No null-coalescing (`??`) — use `if (-not $x) { $x = $default }`
- Default file encoding is UTF-16 LE — always use `-Encoding utf8` for files the API or git will read
- No HEREDOC syntax — use `@'...'@` single-quoted here-strings for multiline content; closing `'@` must be at column 0
- 965-byte maximum per PowerShell tool call — split long blocks; use temp files for large JSON payloads
- `2>&1` on native executables wraps stderr as ErrorRecord — avoid; stderr is already captured

### PATH and PATHEXT Conventions

- Scripts live in `C:\Scripts\` which is on PATH
- `.PS1` is in PATHEXT, so scripts are invoked by name without extension: `qoq-api GET /focus`
- New scripts must be placed in `C:\Scripts\` and named in `kebab-case.ps1`
- Scripts should be self-documenting: comment block at top, `Usage:` line, `# param: explanation` pattern

### Token-Per-Call Rule for qoq-api

The `$env:QOQ_ADMIN_TOKEN` must be set in the **same PowerShell tool call** that invokes `qoq-api`. Shell state (environment variables) clears between tool invocations. Scripts that call `qoq-api` internally are safe — they read the env var at execution time. Scripts that chain with `qoq-api` via a separate tool call are not.

Correct pattern in a new script:
```powershell
$token = $env:QOQ_ADMIN_TOKEN
if (-not $token) { Write-Error "Set QOQ_ADMIN_TOKEN in your PS profile first"; exit 1 }
```

### AIBuddy Co-authorship in Scripts

Any script that runs git commits must include the co-author footer:
```
Co-Authored-By: AIBuddy <aibuddy@rossonlineservices.com>
```
Reference: `qoq-export.ps1` line 42–43 for the correct inline commit message pattern.

### Error Handling Conventions

- Use `Write-Error` for hard failures + `exit 1`
- Use `Write-Warning` for recoverable issues (e.g., 1101 false failures)
- Use `Write-Host ... -ForegroundColor` for structured output (Cyan = headings, Green = success, Red = error, Yellow = warning, DarkGray = detail)
- Always validate env token before making API calls — fail fast with a clear message

---

## Agent Configuration (Proposed)

```yaml
name: script-specialist
model: sonnet
color: yellow
memory: project
```

Yellow distinguishes it from existing agents. Sonnet is appropriate — script writing is structured, not deep reasoning.

---

## Relationship to Other Agents

```
Script Specialist
├── Calls Ricci — when a new script reveals a missing API endpoint needed for the script
├── Calls Protocol Specialist — when a new script must follow DNA or turn algorithm conventions
├── Is called by General-purpose — when a user says "can we script this?"
└── Is NOT for — application code (TypeScript/Workers), SQL migrations, React components
```

<!-- dna-touches
  - { model: claude-sonnet-4-6, session: agent-design-657-658, date: 2026-06-12, action: created, notes: "Design doc for Script Specialist agent — queue item 658. Includes full inventory of 14 existing scripts and top 5 workflow gaps." }
-->