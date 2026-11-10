---
name: strategy-v0402-current
description: v04.02 is the current strategy; RESULT ends "| maxDD xR", per-piece TRADE lines; our engine is the reference; OLI owns Pine; MNQ-only
metadata:
  type: project
---

The current strategy is `engine/scripts/sma200-first-cross-v0402.pine`.
- Its RESULT line ends with `| maxDD xR`.
- With `TRADES=1`, parity-run prints per-piece TRADE lines: `TRADE | piece | exit id | side | entry UTC | exit UTC | entry | exit | contracts | exit comment | R share | R own | trade R so far | last piece`.
- Baseline (preset Off, TV window, 13,800 bars): 113 trades, +28.7R, maxDD 14.05R.
- Full 26.1k bars: 114 trades, +32R.

Rules:
- **Our engine is the reference.** No TradingView parity chasing (Ross, 2026-11-09).
- **OLI owns all Pine scripts.** Never edit `.pine`; Cori and Euler code the platform.
- Focus is **MNQ only**: KV `MNQ:1:1min`, MNQZ6, America/Chicago.

**How to apply:** Use v04.02 as the default test script for engine and API work. Ask OLI, through Cori, for any script-side change, such as machine-readable R or a `TRADE_COLUMNS` header.
