---
name: pinets-oracle-semantics
description: "How to read PineTS 0.13.1 internals: transpiled code, ta/broker function names in the minified bundle, the precision/eps rules"
metadata:
  type: reference
---

**Transpiled code:** after `await pineTS.run(src)`, read `String(pineTS.transpiledCode)`. Comparisons appear as `$.pine.math.__gt` etc., and ta calls are hoisted into `temp_N`.

**Bundle:** `engine/node_modules/pinets/dist/pinets.min.es.js`. Dump a function with `node dump.cjs <bundle> <fnName>`, which slices from `'function '+name+'('`.

Function map:

| Area | Names |
|---|---|
| ta | ema=o0, rma=nb, sma=lb, tr=yb, highest=c0, change=Hg, crossover=i0, crossunder=r0 |
| Window helper | `xe` / class `L_`; ring class `wa` (double-double prefix sums) |
| Precision | `precision(x)` = round to 1e10 |
| Comparisons | __eq=W_, __ge=K_, __gt=G_, __le=Y_, __lt=Z_, __neq=J_ |
| round_to_mintick | w_ (with helpers x_, v_) |

Broker:
- `ih`: entry fills.
- `rs`: exit fills.
- `ix`: exit on the entry bar.
- `ch`: exit qty allocation by `_seq`.
- `ka`/`Sn`/`bi`: fill, open trade, close trade.
- `qi`: slippage.
- `Aa`: commission.

**How to apply:** when a compiled result differs from PineTS, read the PineTS function rather than guessing. PineTS is the oracle, even where it differs from the TradingView docs.
