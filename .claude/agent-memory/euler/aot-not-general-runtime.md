---
name: aot-not-general-runtime
description: AOT /engine is ONE pre-compiled strategy (v04.01.01), not a general Pine runtime; where any-script execution lives today
metadata:
  type: project
---

The AOT is not a general runtime.
- `worker/build-engine.cjs` compiles exactly `sma200-first-cross-v040101.pine` at deploy time into `compiled-sma200.js`.
- `pine-engine.ts` registers it as `__pinePrecompiled.main`.
- `pinets-patched.js` uses that instead of `new Function`.
- `SCRIPTS = new Set(['sma200-first-cross-v040101'])`.

Any script runs today in three places:
- (a) the browser, via the Vela chart (`vela/playground/qoq.ts`, `@luxalgo/vela-pinets`, CCCBarsProvider → Worker `/bars`);
- (b) the CF container, via `/run` and `/run-source` (`engine/src/runner.ts`). The consumer must POST the bars and gets chart data only; the timeframe is hard-coded to `'tick'`;
- (c) locally, via `engine/parity-run.mjs` (RESULT line; `TRADES=1` gives TRADE lines).

**Why:** Workers forbid eval/new Function, and PineTS executes transpiled code through new Function. Transpile itself (Pine → JS string, ~290 ms) is pure JS and has no eval.

**How to apply:** Don't call the AOT "PineRT". Generalising it means transpiling at request time and running in a Dynamic Worker (#1214). That run is memory-bound: about 5k bars max at 128 MB, which is why `/engine` defaults to `limit=5000`.
