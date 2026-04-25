# 002 — Unified Worker vs Microservices

**Date:** 2026-04-25  
**Status:** Decided

---

## The Decision

One primary ACIS Worker handling all module routes, with agents (scraper, heartbeat) as separate Workers bound via Service Bindings. Not four independent Workers with their own deployments.

## The Architecture

```mermaid
flowchart LR
    subgraph Workers ["Cloudflare Workers"]
        MW["acis-worker\n(main router)\nsrc/index.ts"]
        SA["scraper-agent\nsrc/agents/scraper.ts\ncron: daily"]
        HB["heartbeat-agent\nsrc/agents/heartbeat.ts\ncron: every 30m"]
    end

    subgraph Storage ["Storage"]
        D1[(D1\nacis-db)]
        R2[(R2\nacis-vault)]
    end

    subgraph External ["External"]
        AG["Cloudflare\nAI Gateway"]
        GH["GitHub API\nPR automation"]
        SG["Resend\nemail reminders"]
        CF["CMS/HHS\nRSS feeds"]
    end

    Client -->|HTTP| MW
    MW -->|reads/writes| D1
    MW -->|signed URLs| R2
    MW -->|Claude API| AG

    SA -->|ingest| CF
    SA -->|writes| D1
    SA -->|Service Binding| MW

    HB -->|reads| D1
    HB -->|Claude API| AG
    HB -->|opens PR| GH
    HB -->|Service Binding| MW

    MW -->|Service Binding| CCC["ccc-admin\nWorker"]
```

## Why Not Four Separate Workers

Four Workers means four `wrangler.toml` files, four deployment pipelines, four sets of D1 bindings pointing at the same database, and four places to update when a shared type changes. The modules share the same D1 schema — separating their compute while keeping their storage unified creates artificial complexity.

The router pattern (Hono) already gives clean module separation within one Worker. A route prefix per module (`/regulatory/*`, `/vendor/*`, `/incidents/*`, `/attestation/*`) is as clean as four Workers but with zero coordination overhead.

## Why Agents Are Separate

The scraper and heartbeat agents run on cron triggers, not HTTP triggers. Cloudflare Workers supports cron on any Worker, but separating them makes their purpose explicit and lets them have different CPU time limits and memory profiles than the main API Worker. They communicate back to the main Worker via Service Bindings when they need to trigger side effects (e.g., the scraper reporting a high-risk regulatory event so the main Worker can log it to CCC Admin).

## The Folder Structure This Creates

```
compliance-portfolio/
├── src/
│   ├── index.ts           ← main Hono router (HTTP entrypoint)
│   ├── agents/
│   │   ├── scraper.ts     ← cron Worker: CMS/HHS RSS ingestion
│   │   └── heartbeat.ts   ← cron Worker: self-audit + GitHub PR
│   ├── modules/
│   │   ├── regulatory.ts  ← /regulatory routes + Claude risk scoring
│   │   ├── attestation.ts ← /attestation routes + Resend reminders
│   │   ├── vendor.ts      ← /vendor routes + TLS/header scan
│   │   └── incidents.ts   ← /incidents routes + NIST playbook gen
│   ├── db/
│   │   └── queries.ts     ← typed D1 query functions
│   └── types/
│       └── index.ts       ← shared TypeScript interfaces
├── db/
│   └── schema.sql         ← D1 migration (all 5 tables)
└── frontend/              ← Cloudflare Pages (Executive Hub)
    └── src/
```
