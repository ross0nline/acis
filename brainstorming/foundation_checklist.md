# ACIS Foundation Checklist
*Revised: 2026-04-24 — includes MCP integrations for Claude Code autonomy*

---

## The Strategy

Before a single line of application code is written, every connection, credential, and tool must be in place. Two MCP servers — Cloudflare and GitHub — are the key additions that change the workflow significantly:

- **Cloudflare MCP:** Gives Claude Code direct access to your Cloudflare account. I can create D1 databases, run SQL migrations, inspect Worker deployments, check R2 buckets, and read AI Gateway logs — all from this terminal without you needing to open the Cloudflare dashboard.
- **GitHub MCP:** Gives Claude Code direct access to your GitHub account. I can create the repo, push files, create branches, and open pull requests — including the self-healing PRs the ACIS agent will generate autonomously later.

Together these eliminate most manual verification steps and give me the autonomy to handle infrastructure setup end-to-end once you hand me the tokens.

---

## Step-by-Step (In Order)

### STEP 1 — Upgrade Node.js
**Who:** You  
**Why:** Your current version (v20.11.1) is below Wrangler's minimum engine requirement (v20.18.1). Errors will occur during deployment.  
**Action:** Download and install **Node.js v22 LTS** from nodejs.org. v22 is the current LTS and will be supported through 2027 — more future-proof than jumping to 20.18.x.  
**Verify after:** Run `node --version` in the terminal — should show `v22.x.x`.

---

### STEP 2 — Install Wrangler Globally
**Who:** Claude Code (once Node is upgraded)  
**Why:** Wrangler is Cloudflare's deployment CLI. Global install means we can run `wrangler deploy`, `wrangler d1 execute`, and `wrangler secret put` from anywhere without `npx`.  
**Command I will run:**
```bash
npm install -g wrangler
```

---

### STEP 3 — Authenticate Wrangler
**Who:** You (requires browser)  
**Why:** Wrangler needs its own OAuth session to deploy Workers and run D1 migrations against your account. This is separate from the Cloudflare API token.  
**Action:** Run `wrangler login` in the terminal. It opens a browser — authorize in Cloudflare dashboard.  
**Verify after:** Run `wrangler whoami` — should show your Cloudflare account name and email.

---

### STEP 4 — Generate a Cloudflare API Token
**Who:** You  
**Why:** The Cloudflare MCP uses an API token (not the Wrangler OAuth session) to give Claude Code account-level access.  
**Action:**
1. Go to Cloudflare dashboard → My Profile → API Tokens → Create Token
2. Use the **"Edit Cloudflare Workers"** template as a base, then add permissions for: D1, R2, Pages, AI Gateway
3. Scope it to your specific account
4. Copy the token — you only see it once

---

### STEP 5 — Configure Cloudflare MCP in Claude Code
**Who:** Claude Code (once you have the token)  
**What it unlocks:** I can directly list your Workers, execute D1 SQL, inspect R2 buckets, check Pages deployments, and read AI Gateway logs from this terminal.  
**I will configure:** The `@cloudflare/mcp-server-cloudflare` stdio server in Claude Code's MCP settings, passing your API token and Account ID as environment variables.

---

### STEP 6 — Generate a GitHub Personal Access Token
**Who:** You  
**Why:** The GitHub MCP uses a PAT to authenticate API calls for repo creation, file commits, and PR management.  
**Action:**
1. Go to github.com → Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens
2. Create a token with: **Repositories** (read/write), **Pull Requests** (read/write), **Contents** (read/write), **Workflows** (read/write)
3. Copy the token

---

### STEP 7 — Configure GitHub MCP in Claude Code
**Who:** Claude Code (once you have the PAT)  
**What it unlocks:** I can create the GitHub repo, push the initial file structure, create branches, and eventually wire up the self-healing PR automation — all without you needing the `gh` CLI installed.  
**I will configure:** The GitHub remote MCP server (HTTP transport via `api.githubcopilot.com/mcp/`) in Claude Code's MCP settings.

> **Note on `gh` CLI:** With the GitHub MCP connected, the `gh` CLI is no longer required for this project. The MCP handles everything the CLI would have.

---

### STEP 8 — Verify Cloudflare Account Capabilities via MCP
**Who:** Claude Code (autonomous once MCP is live)  
**Why:** Before we try to create a D1 database or deploy a Worker, we confirm your account has all required services enabled.  
**I will check:** Workers (Free or Paid plan), D1 (enabled), R2 (enabled), Pages (enabled), AI Gateway (enabled).  
**If anything is missing:** I'll tell you exactly what to enable and where.

---

### STEP 9 — Create GitHub Repository via MCP
**Who:** Claude Code  
**Action:** Create a public repo named `acis` (or `compliance-portfolio` — your call) via the GitHub MCP.  
**Then:** Initialize git locally in `compliance-portfolio/`, set the remote, and push the current structure (CLAUDE.md, docs/, projects/, brainstorming/, context/).

---

### STEP 10 — Configure Cloudflare AI Gateway
**Who:** Claude Code (via Cloudflare MCP or Wrangler)  
**Why:** All Claude API calls from the deployed ACIS Workers must route through AI Gateway. This gives us:
- Request/response logging (powers the "Agent Logs" panel on the Executive Hub)
- Caching (reduces API costs on repeated regulatory summaries)
- Rate limiting and observability dashboard in Cloudflare

**I will:** Create an AI Gateway endpoint named `acis-gateway` in your Cloudflare account.

---

### STEP 11 — Choose and Set Up Email Provider
**Who:** You (sign up), Claude Code (configure)  
**Recommendation: Resend** over SendGrid or Mailgun.
- Modern API, cleanest developer experience
- Free tier: 3,000 emails/month (more than enough for a portfolio project with mock partners)
- Works seamlessly with Cloudflare Workers via fetch()
- No complex domain verification required for testing

**Action:** Sign up at resend.com, create an API key, hand it to me.  
**I will:** Store it as a Wrangler secret (`wrangler secret put RESEND_API_KEY`) so it never appears in code.

---

### STEP 12 — Store Anthropic API Key as Wrangler Secret
**Who:** Claude Code (once Wrangler is authed)  
**Why:** The ACIS Workers call Claude API. The key must live as an encrypted Wrangler secret, not in any file.  
**Command I will run:**
```bash
wrangler secret put ANTHROPIC_API_KEY
```
You paste the key when prompted — it never touches a file.

---

## Summary: Who Does What

| Step | Action | Who |
|---|---|---|
| 1 | Upgrade Node.js to v22 LTS | **You** |
| 2 | Install Wrangler globally | Claude Code |
| 3 | `wrangler login` (browser auth) | **You** |
| 4 | Generate Cloudflare API token | **You** |
| 5 | Configure Cloudflare MCP | Claude Code |
| 6 | Generate GitHub PAT | **You** |
| 7 | Configure GitHub MCP | Claude Code |
| 8 | Verify Cloudflare account via MCP | Claude Code |
| 9 | Create GitHub repo + push structure | Claude Code |
| 10 | Configure AI Gateway | Claude Code |
| 11 | Sign up for Resend + get API key | **You** (sign up), Claude Code (configure) |
| 12 | Store Anthropic API key as secret | Claude Code |

**You do: 5 steps** (Node upgrade, Wrangler login, 2 tokens, Resend signup)  
**I do: 7 steps** (everything else, sequentially, once I have the credentials)

---

## What We Are NOT Doing Yet

- No `wrangler init` or project scaffolding
- No D1 database creation
- No Worker code
- No schema migrations
- No frontend

All of that starts in Phase 1 (Agentic Foundation) — only after every item above is confirmed green.
