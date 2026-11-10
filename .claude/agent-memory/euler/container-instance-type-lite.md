---
name: container-instance-type-lite
description: EngineGateway container has no instance_type in wrangler.toml → defaults to lite (1/16 vCPU, 256 MiB); too small for full-window v04.02
metadata:
  type: project
---

The `worker/wrangler.toml` `[[containers]]` block has no `instance_type`. The Wrangler default is `lite`: 1/16 vCPU, 256 MiB.

Local v04.02 measurements:
- 13.8k bars: about 600 MB RSS and 10.5 s of CPU. On `lite` that likely OOMs, or takes about 170 s and blows the 55 s DO timeout.
- 26.1k bars: about 900 MB RSS.

This is inferred, not verified live (as of 2026-11-09).

**Why:** It explains the "25–35 s for 582 bars" cold runs.

**How to apply:** Before any large container run, set `instance_type = "standard-1"` (4 GiB, 1/2 vCPU) or `"standard-2"`, which needs Ross's OK. Do a WSL full deploy, then time one full-window run to confirm.
