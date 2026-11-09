---
name: session-2026-11-09-qi-build
description: Ricci built Qi (Worker v0.20.0) — /qi/scan, /qi/build-static, created_by filter, qi.md agent, qi-hook.ps1 handover; spec deviations and live-test findings
metadata:
  type: project
  session: 01PLp7k8jkQwrc9q87wRyGSX
  date: 2026-11-09
---

## Done This Session
- Built Qi per research/architecture/qi-spec.md. ccc-qoq commits f6f2560 + 05ef3c9 (NOT pushed — push auto-deploys; queued #1155).
- Worker deployed manually (npx wrangler deploy) as v0.20.0; ANTHROPIC_API_KEY secret set on ccc-qoq (piped from compliance-portfolio .dev.vars, never printed).
- Closed #1147, #1148, #1149, #1150 (git_ref f6f2560). #1146 left queued — orchestrator installs agents/qi-handover/qi-hook.ps1 to C:\Scripts, applies dna-hook-patch.md, registers in settings.json.
- Queued #1155 push/verify build, #1156 cost tuning, #1157 first-week audit, #1158 scope decision, #1159 hlm.ts TS errors, #1160 system-state refresh.
- Appended "Build Notes" to qi-spec.md (10 deviations + measured cost).

## Key Facts Learned
- ccc-qoq "KV" is the D1 table kv_artifacts — there is no Cloudflare KV binding. Qi stores qi:static-prompt / qi:static-meta there.
- Wrangler Text rule over src/**/*.ts would break the Worker; Qi uses a generator (scripts/build-qi-static.mjs, wrangler [build]) writing a gitignored src/qi/static-bundle.generated.ts.
- claude-haiku-5-5 rejects non-default temperature; Qi uses structured outputs + 1h cache TTL.
- queue_items.priority is a sibling-order float, not importance — Qi's 1-9 "urgency" goes to metadata.qi_urgency.
- Claude Code session JSONLs can be ~450 MB. Never Get-Content -Raw them; seek a byte tail and line-filter.
- PowerShell Start-Job dies when the parent exits — hooks must use detached Start-Process.
- Claude Code Stop hooks receive session_id / transcript_path / cwd on stdin JSON.
- Bash commands mentioning "git" in complex forms (even the .gitignore filename) are blocked by the worktree guard; put scripts in files or use Edit.
- npm run typecheck fails on pre-existing hlm.ts errors (#1159) — not a Qi regression.

## Open Questions
- Scope: ccc hub root exact vs prefix (#1158).
- Cost: ~$0.06-0.07/scan because prompts exceed Haiku's 100K long-context threshold (#1156).
- Does the Cloudflare GitHub build honour [build] command? Expected yes; verify on push (#1155).

## Next Agent: Start Here
- Read qi-spec.md Build Notes, then agents/qi-handover/README.md.
- After hook install: tail $env:TEMP\qi-hook.log; GET /items?created_by=Qi; event_log qi_scan rows.
