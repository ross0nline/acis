---
name: pinert-compiler-spike
description: "#1217 PineRT compiler spike: GO, staged. Series and bracket broker are bit-exact vs PineTS at 45–130× speed; full v04.02 parity is estimated at 14–21 agent-days"
metadata:
  type: project
---

The verdict on #1217 (2026-11-09) is **GO, staged**.
- Doc: `ccc-trading/research/architecture/pinert-compiler-spike.md` has the surface map (§3), PineTS semantics (§2), broker design (§4), Workers sizing (§5), fallback (§6) and plan (§7).
- Code: `ccc-trading/engine/pinert/`.

Measured on 26,100 MNQ bars:
- **Series:** 23 v04.02 series are bit-exact. PineTS takes 5.7 s and ~535 MB; compiled takes ~40–65 ms and ~80 MB. 1M bars run at 1.1–1.8 M bars/s.
- **Broker:** bracket and TP1 strategy rows match 254/254 and 508/508 with bit-exact profit. Time goes from 435 ms to ~10 ms.
- **v04.02 PineTS reference:** 13.8k bars take 10.9 s; 26.1k bars take 19.2 s.

Not verified:
- full v04.02 compiled parity;
- stop entries and tick (`loss`/`profit`) exits;
- eps-compare cases (none in the data);
- running in workerd.

**Why:** Ross wants research at scale, with speed coming from quality decisions. PineTS is the oracle.

**How to apply:**
- Rerun `spike.mjs` and `broker-spike.mjs` before changing the compiler.
- Copy PineTS semantics, not the TradingView manual: ta results are rounded to 1e10 (assignments are not), comparisons use eps 1e-10 with na → false, and windows skip na.
- Fan out across parameter sets, not time chunks: EMA/RMA and equity state are not exactly chunkable.
- Unsupported constructs fall back to PineTS through an oracle gate per script hash.
