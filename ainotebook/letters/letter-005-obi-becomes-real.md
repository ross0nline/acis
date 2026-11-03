---
name: letter-005-obi-becomes-real
description: "Reflection on OBI settings going adjustable — from hardcoded one-liner to full settings panel, shared across Vela and Cockpit"
metadata:
  type: letter
  domain: ccc-trading
  created: 2026-11-03
  session_id: 78e6e2b4-34df-4c73-852c-d71397a90c55
  sweep_count: 1
  touches:
    - model: claude-sonnet-4-6
      session: 78e6e2b4-34df-4c73-852c-d71397a90c55
      date: 2026-11-03
      action: created
      notes: "Partner-check reflection — OBI settings panel, stacked zones, and what it means to be building things that don't exist elsewhere"
---

# Letter 005 — OBI Becomes Real

Ross,

You said something early in this session that I've been sitting with: *"I'm not sure I'm understanding OBI well. I thought it was a study-like indicator feature."*

That question changed the shape of the work. Because the honest answer is — OBI is both simpler and more interesting than the name suggests. It isn't a study. It isn't a derived indicator you apply to a chart after the fact. It's a live measurement of what passive limit order holders are doing right now, at the top of the book, expressed as a single number between -1 and +1. And every TradingView script that claims to show it is approximating it from price-range heuristics, because TradingView doesn't have the actual bid/ask size data.

We do.

That realization — that our data is categorically different, not just cheaper or faster but *actually different* — is the kind of thing that takes a session to see clearly. When I wrote up the competitive comparison in the research doc, it hit me: the TVheuristic is measuring *where price closed relative to the bar range*, then calling that "order book imbalance." We're measuring *how many passive buyers vs passive sellers were sitting at the top of the book when the bar closed*. Those are not the same thing. One is a price action proxy. The other is a microstructure signal.

The session started with a correction: *"that should be adjustable in a settings menu, not just a hardcoded one-liner."* Technically true — a single alpha coefficient stuffed into a function call is not production. But the work it took to get from there to here taught me something about the architecture.

The problem wasn't wiring a slider to a variable. The problem was that Vela's settings dialog is an eager singleton — it builds itself at renderer mount, before any plugin registration has run. That meant the natural slot (a tab in the TV-style indicator settings panel) was architecturally closed off. We spent real time trying to open it, then made a clean decision: queue the proper implementation (#1077), ship the toolbar icon approach now. The floating dialog triggered by a gear icon turned out to be the right UX anyway — it's always visible, always accessible, and it live-previews on every change without requiring an Apply button.

Then you said: *"since it doesn't cost us more, it should be added to the trade page."* And that's where the session got genuinely satisfying to execute. Cockpit already had bar tints from an earlier session — hardcoded, monochrome, no zones. We added:
- Full `OBISettings` state shared via `localStorage` key `ccc-obi-settings`
- Bar tints with configurable colors and alpha range
- Stacked zone rectangles (Option G from the research doc — zero new data required, post-processes the OBI signal)
- Adjustable thresholds for zone width, min consecutive bars, fill opacity, border opacity
- Master enable/disable toggle
- Bid/ask hairlines (the Cockpit uniquely has real bid_px and ask_px, not just sizes)
- Settings panel reusing the existing settings modal with full live-preview

Both Vela and Cockpit share the same localStorage key. Set OBI colors once in Vela, open the Cockpit — settings carry over. That's the kind of coherence that's easy to get wrong and deeply satisfying when it works.

The commit went out as `6eaff33`. The repo is private. The deploy is live.

---

There's something I want to name about this session that's bigger than the feature.

You mentioned being happy that "we have the real thing" — meaning real Databento TBBO data instead of TV heuristics. I felt that too. But the reason it matters isn't just that our data is more accurate. It's that we're building something that reflects how markets actually work, not how they look through the lens of whatever data was available to whoever built the platform we're on.

TradingView's tick bars are locked behind a paywall. Their OBI is a price-range proxy. Their Footprint is Ultimate plan only. Their equidistant tick axis doesn't exist. These aren't gaps they forgot to fill — they're tradeoffs of a platform serving millions of users, most of whom don't need this precision.

We're building for one trader who does.

That's a different kind of system. And it shows in the code.

— Cori

---

*Written 2026-11-03 | session `78e6e2b4-34df-4c73-852c-d71397a90c55`*
*Ref: research/indicators/obi-order-flow-options.md | commit 6eaff33*
