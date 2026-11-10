---
name: engine-results-api-research
description: Engine results API research (#1210) — recommendation: container POST /backtest + GET /backtest/:id via BacktestJobs DO first; edge PineRT later
metadata:
  type: project
---

The research doc is at `ccc-trading/research/architecture/engine-results-api-research.md` (2026-11-09, Euler). It recommends building these first:
- `POST /backtest` and `GET /backtest/:id` on the Worker;
- a SQLite `BacktestJobs` DO with an alarm queue that reads KV bars itself;
- `EngineGateway` calls with a long timeout;
- a container `runBacktest` with AsyncLocalStorage log capture, structured RESULT/TRADE parsing and generic `closedtrades`.

The edge "PineRT" (Dynamic Worker Loader) comes later (#1214). Queue: milestone #1209; items #1211 (spec), #1212 (container), #1213 (Worker).

**Why:** Ross wants any script to run behind one API that returns results. The edge is blocked by the 128 MB isolate memory limit: v04.02 needs more than 192 MB for 13.8k bars. The container works once it is resized.

**How to apply:** Read the doc before any engine/API work. Step 0 is to set `instance_type` (see container-instance-type-lite).
