---
created_session: post-78e6e2b4-compaction-6
sweep_count: 1
touches:
  - { session: post-78e6e2b4-compaction-6, action: created, model: claude-sonnet-4-6 }
---
# Kimi K2 Routing Evaluation for ACIS Regulatory Scraper

**Date:** 2026-06-12  
**Status:** Research — pending pricing verification  
**Queue item:** #612

---

## Context

The ACIS regulatory scraper (`src/agents/scraper.ts`) uses `claude-sonnet-4-6` to score every regulatory document ingested from five sources. At typical regulatory velocity (50–150 documents per day during active rulemaking periods), this is the highest-volume Claude call in the system. Each call scores one document: risk level, impacted field, summary, remediation step, deadline — roughly 800 input tokens + 400 output tokens per document.

**Current cost estimate:**
- Sonnet 4.6: $3.00/1M input + $15.00/1M output
- 100 docs/day × (800 input + 400 output) = 120K tokens/day
- ~$0.26/day, ~$8/month

This is not a material cost at current scale. The question is whether Kimi K2 (Moonshot AI) offers equivalent quality at meaningfully lower cost — specifically for the classification task the scraper performs.

---

## Kimi K2 Overview (as of 2026)

**Kimi K2** is Moonshot AI's flagship model, open-sourced in June 2026. Key characteristics:
- 1T total parameters, 32B active (MoE architecture)
- 128K context window
- Strong performance on code, math, and agentic reasoning tasks (matches or beats GPT-4o on several benchmarks)
- Available via Moonshot AI's API (`api.moonshot.cn`) and self-hostable
- No native tool-use or structured output parity with Claude's official SDKs — requires prompt engineering for JSON output

**Pricing (verify at time of use — these change):**
- Kimi K2 API: substantially cheaper than frontier Claude for bulk inference tasks
- The API supports OpenAI-compatible endpoints — can be called with a simple fetch, no SDK required

---

## Task Fitness Analysis

The scraper's scoring prompt asks Claude to produce a structured JSON object from unstructured regulatory text:

```json
{
  "risk_level": "High" | "Medium" | "Low",
  "impacted_field": "RxDC" | "GagClause" | "HIPAA" | "GeneralSecurity" | "Other",
  "summary": "...",
  "remediation_step": "...",
  "deadline": "..." | null
}
```

**Criteria for Kimi routing suitability:**
| Criterion | Assessment |
|---|---|
| Structured JSON output | AMBER — requires system prompt discipline; no native JSON mode confirmed |
| Regulatory domain knowledge | GREEN — Kimi K2 shows strong document classification capability |
| Context window | GREEN — 128K context handles any regulatory document |
| Latency | AMBER — Moonshot API servers are Asia-Pacific optimized; EU/US latency may be higher |
| SDK availability | AMBER — OpenAI-compatible only; would need raw fetch in the Worker |
| Fail-over behavior | RED — no Anthropic fallback built in; silent failures must be handled manually |

---

## Architecture Options

### Option A: Hard-switch scraper to Kimi K2

Replace `claude-sonnet-4-6` in `scoreWithClaude()` with a Kimi K2 call via the OpenAI-compatible endpoint.

**Pros:** Maximum cost savings  
**Cons:** Single point of failure (no fallback), JSON reliability unknown, latency unknown from Cloudflare Workers

### Option B: Kimi as primary, Claude Haiku as fallback

Call Kimi K2 first. If the response fails JSON validation or times out, fall back to `claude-haiku-4-5` for the same document.

**Pros:** Lower cost at scale, maintains reliability  
**Cons:** Adds latency on failure path, two API keys to manage, more complex error handling

### Option C: Keep Claude Sonnet, re-evaluate at 1K docs/day

At current regulatory volume, the savings are ~$8/month. Below a threshold where switching costs (engineering time, reliability risk, monitoring) justify the change.

**Pros:** No complexity added, maintains current quality baseline  
**Cons:** Leaves money on the table at higher scale

---

## Recommendation

**Do Option C for now. Revisit when regulatory volume exceeds 500 docs/day or cost exceeds $50/month.**

The ACIS scraper's priority is data quality and reliable JSON output — a misclassified event (High → Medium) that misses an email notification has higher cost than $8/month in API fees. `claude-sonnet-4-6` is the right model for this task at current scale.

**If pursuing Kimi at scale:**
1. Test JSON output consistency on a sample of 50 ACIS regulatory documents before switching
2. Implement Option B (Kimi primary + Haiku fallback) to maintain reliability
3. Add `KIMI_API_KEY` as a Worker secret
4. Use raw fetch with `Authorization: Bearer ${env.KIMI_API_KEY}` (no SDK required)
5. Validate JSON with `JSON.parse()` + type guard before writing to D1

---

## Queue Decision

Close #612 as **Won't Do (for now)** — the economic case doesn't hold at current scale. Reopened when volume or cost warrant it. The analysis above serves as the design document if we ever proceed.
