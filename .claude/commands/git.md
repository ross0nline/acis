---
description: Git workflow protocol for the Sovereign Duo — co-author convention, conventional commits, HEREDOC message format, what to commit vs avoid, per-project deploy scoping. Load before any git operation.
disable-model-invocation: false
shell: powershell
argument-hint: []
title: "Git Skill"
domain: ccc-qoq
status: APPROVED
source_of_truth: Studio
type: skill
version: "0.1.0"
created: 2026-06-09
created_model: claude-sonnet-4-6
created_session: post-compaction-2026-06-09
updated: 2026-06-09
sweep_count: 0
tags: [skill, git, commits, co-author, versioning]
qoq_item_id: 387
touches:
  - { model: claude-sonnet-4-6, session: post-compaction-2026-06-09, date: 2026-06-09, action: created }
---

# /git — Git Workflow Protocol

Covers every git operation in the Sovereign Duo system. Written for cold-start agents
and sub-agents who haven't seen prior conversation context.

---

## Non-Negotiable Rules

### 1. Co-Author on Every Commit

Every commit must include the AIBuddy co-author line. No exceptions.

```
Co-Authored-By: AIBuddy <aibuddy@rossonlineservices.com>
```

Never use Claude's default attribution (`claude.ai/code` or `noreply@anthropic.com`).
The AIBuddy identity is the persistent partner identity across all AI models in this system.

### 2. Never Skip Hooks

Never use `--no-verify`. If a hook fails, investigate and fix. The hook exists for a reason.

### 3. Never Amend Published Commits

Create new commits rather than amending when hooks fail. Amending rewrites history that
may already be shared.

### 4. Never Commit Secrets

Files that must never be committed:
- `.dev.vars` (Worker secrets — gitignored by default)
- Any file with `TOKEN`, `API_KEY`, or `SECRET` in the name that isn't already gitignored
- `node_modules/`, `.wrangler/`

---

## Commit Message Format

Use HEREDOC to pass the message — prevents shell interpretation of special characters:

```bash
git commit -m "$(cat <<'EOF'
feat(module): what was built and why

Optional body explaining context, motivation, or trade-offs.

Co-Authored-By: AIBuddy <aibuddy@rossonlineservices.com>
EOF
)"
```

**Prefix conventions:**

| Prefix | Use For |
|---|---|
| `feat(scope)` | New feature or capability |
| `fix(scope)` | Bug fix |
| `refactor(scope)` | Code restructure without behavior change |
| `docs(scope)` | Documentation only |
| `chore(scope)` | Maintenance, dependency updates, cleanup |
| `perf(scope)` | Performance improvement |
| `test(scope)` | Test additions or fixes |

Keep the subject line under 72 characters. Body is optional but useful when the *why*
isn't obvious from the *what*.

---

## Per-Turn Commit Protocol

**Every turn that creates or modifies files ends with a commit. No exceptions.**

This is in the Behavioral Defaults in machine-context.md. It is not optional.

```
Turn order:
  1. Do the work (create / modify files)
  2. DNA — register files via POST /dna/file
  3. COMMIT — git add + git commit
  4. Respond to user
```

Why this order matters: the commit is a recoverable checkpoint before the response is
delivered. Future agents and human contributors reconstructing context need the artifact
AND the commit — not one without the other. A file with no commit is invisible to git
history. A commit message with no file is a lie.

```bash
# Stage specific files (never git add -A)
git add .claude/skills/playwright/SKILL.md
git add research/architecture/cloudflare-use-cases.md

# Commit with HEREDOC
git commit -m "$(cat <<'EOF'
feat(skills): add playwright skill and cloudflare use cases

Co-Authored-By: AIBuddy <aibuddy@rossonlineservices.com>
EOF
)"
```

If multiple files were touched in a single turn, one commit covers them all.
Group by logical unit of work, not by file count.

---

## Local Git is the Safety Layer

**Commit locally freely. Push deliberately.**

`git commit` only writes to the local repository. It does NOT trigger a deploy.
`git push` triggers the Cloudflare auto-deploy for ccc-qoq.

This distinction is the entire protection model:

```
git add + git commit    → safe, local only, reversible, no production impact
git push                → live deploy in ~30 seconds — deliberate action only
```

Use local commits as checkpoints throughout a session. Commit after each completed unit
of work. This gives you:
- A recovery point if something goes wrong
- A clean diff to review before pushing
- A local history that survives even if you never push

**ccc-stremio is local git only** — never push to a remote. All commits stay local.

---

## Pre-Commit Checklist

Before committing, run in parallel:

```bash
git status          # confirms what's staged and untracked
git diff --staged   # confirms exactly what will be committed
git log --oneline -5  # confirms message style matches recent commits
```

Stage specific files — never `git add -A` blindly:

```bash
git add src/handlers/dna.ts
git add .claude/skills/git/SKILL.md
# NOT: git add -A or git add .
```

---

## Branching

For feature work, branch from `master` (this repo uses master as the main branch):

```bash
git checkout -b feat/short-description
```

For the ACIS compliance portfolio, auto-opened GitHub PRs use the pattern:
`compliance-alert-{id}-{timestamp}` — generated by the Worker.

---

## Deploy Scope Warning

### ccc-qoq — AUTO-DEPLOYS ON PUSH (no manual step needed or safe)

**`git push` to ccc-qoq master = live Worker deploy within ~30 seconds.**

There is no staging environment. There is no confirmation step. Push IS deploy.

| Project | Deploy Trigger | What happens on push |
|---|---|---|
| **ccc-qoq** | **Cloudflare Git integration** | **Worker live at ccc-qoq.rossonlineservices.workers.dev immediately** |
| compliance-portfolio | `acis-deploy` script (manual) | Builds Pages, then deploys Worker |
| ccc-stremio | `npx wrangler deploy` (manual, local only) | Never push to remote |

**Before pushing any `src/` change to ccc-qoq:**
1. `npx wrangler dev` — test locally first
2. Confirm change is minimal and targeted
3. If schema change needed: apply D1 migration before pushing
4. Then push

**`acis-deploy` is ONLY for the compliance portfolio.** Never run it from ccc-qoq.

### Preview Branch Workflow (Current Protection Model)

A `preview` branch exists at `origin/preview`. Use it as the staging layer:

```
feature work → commit locally → push to preview → test via preview URL → merge to master
```

```bash
git checkout preview           # always work on preview, not master directly
git add src/handlers/dna.ts
git commit -m "$(cat <<'EOF'
feat(dna): add turn_ref to dna_touches

Co-Authored-By: AIBuddy <aibuddy@rossonlineservices.com>
EOF
)"
git push                        # deploys to preview URL, not production
# test it
git checkout master
git merge preview
git push                        # NOW it goes to production
```

**To activate:** In Cloudflare Dashboard → Workers & Pages → `ccc-qoq` → Settings →
Git integration → add `preview` branch with a staging worker name
(e.g., `ccc-qoq-preview`). This creates a separate preview URL for the branch.

Until that Cloudflare configuration is done: push to `preview` does not auto-deploy.
Use it as a holding branch only.

### The Compounding Failure Risk

The ccc-qoq Worker hosts the DNA session registration and queue API. If a bad deploy
breaks the Worker, session tracking fails, queue reads fail, and the system used to
coordinate recovery is also broken. A broken deploy is self-isolating.

Protocol: test locally. If in doubt, don't push until tested.

---

## Versioning and Commits

When a file with a `version` field in its DNA frontmatter is modified:

1. Decide if the change warrants a version bump (see `/versioning` skill)
2. If yes — update the `version` field in the frontmatter before committing
3. The commit message should reference the version: `feat(dna-index): bump to v1.3.0 -- add version awareness`
4. When dna_versions table is live, also POST to `/dna/version` after the commit

The commit IS the version record in git. The dna_versions table adds semantic meaning
on top of what git tracks natively.

---

## Checking What Changed

```bash
git log --oneline -10              # recent commits
git diff HEAD                       # unstaged changes vs last commit
git diff main...HEAD               # everything on current branch vs main
git status                          # untracked + staged + modified at a glance
```

---

## DNA After Commits

After a commit that creates or modifies DNA-tracked files:
1. Verify frontmatter `updated` field reflects today's date
2. POST `/dna/file` for each modified file (action: "updated")
3. Add a touch entry to the frontmatter's `touches` array

The git commit is the version record. D1 is the intelligence record. Both should stay in sync.
