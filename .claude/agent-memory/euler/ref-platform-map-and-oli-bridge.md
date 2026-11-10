---
name: ref-platform-map-and-oli-bridge
description: Where the verified platform map/gap list and the OLI relay tool live
metadata:
  type: reference
---

- `ccc-trading/research/architecture/platform-map-2026-11-09.md` has the layers, the Worker routes and a verified gap list (gaps 1–10). Cori wrote it.
- `ccc-trading/tools/oli-bridge/` (`oli.mjs`, `calls/`, `inbox/`) is the Playwright-MCP relay to the OLI chat tab. Calls are status/read/since/send/wait, plus file download.
- `ccc-trading/engine/parity-run.mjs` is the local research runner. Env vars: SCRIPT, PRESET, PASTE, FULL, QUIET, TRADES.
