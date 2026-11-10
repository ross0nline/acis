# Euler Memory Index

- [Engine results API research](engine-results-api-research.md) — #1210 recommendation: container /backtest + BacktestJobs DO first, edge PineRT later (PineRT now = #1217 compiler, not Dynamic Worker + PineTS)
- [AOT is not a general runtime](aot-not-general-runtime.md) — /engine = one pre-compiled v04.01.01; any-script lives in Vela browser, container, parity-run
- [Container is lite by default](container-instance-type-lite.md) — no instance_type → 1/16 vCPU, 256 MiB; resize before full-window runs
- [v04.02 current strategy](strategy-v0402-current.md) — RESULT maxDD, TRADE lines, engine is reference, OLI owns Pine, MNQ only
- [Platform map + OLI bridge](ref-platform-map-and-oli-bridge.md) — gap list doc, tools/oli-bridge, parity-run env
- [Lead magnet #1215](ref-lead-magnet-1215.md) — engine-api-cold-start seed for #1209–#1214
- [PineRT compiler spike #1217](pinert-compiler-spike.md) — GO staged; series+broker bit-exact vs PineTS, ×45–130; v04.02 parity 14–21 agent-days
- [PineTS oracle semantics](pinets-oracle-semantics.md) — transpiledCode, minified fn names (ta/broker/compare), 1e10 precision + 1e-10 eps rules
