---
title: "lead-magnet"
created_model: claude-sonnet-4-6
created_session: 78e6e2b4-34df-4c73-852c-d71397a90c55
sweep_count: 0
---

# /lead-magnet — Context Seed Loader

Load a curated context packet for a specific topic. Use before briefing a sub-agent,
running a model comparison test, starting a focused session, or onboarding a new model
to the Sovereign Duo system.

## Usage

```
/lead-magnet <topic>
/lead-magnet use-cases
/lead-magnet watch
/lead-magnet monetization
/lead-magnet sub-agent testing
/lead-magnet qoq system
```

## Steps

### 1. Find the matching lead magnet

```powershell
$h = @{ Authorization = "Bearer $env:QOQ_ADMIN_TOKEN" }
$base = "https://ccc-qoq.rossonlineservices.workers.dev"

# Get LEAD MAGNETS tree (root ID: 554)
$tree = Invoke-RestMethod "$base/items/554/tree" -Headers $h
$tree.data | Select-Object id, title, description | Format-Table -AutoSize
```

Fuzzy-match the argument against lead magnet titles. Report which one was matched.
If ambiguous, list candidates and ask. If no match, list all available magnets.

### 2. Pull the matched node's full data

```powershell
$lm = Invoke-RestMethod "$base/items/<matched-id>" -Headers $h
$lm.data | Select-Object id, title, description, linked_paths, metadata | Format-List
```

Parse `linked_paths` (JSON array) and `metadata` (JSON object with urls, key_turns,
recommended_model, tags).

### 3. Pull DNA records for linked files

For each path in linked_paths, look up its DNA record to show freshness:

```powershell
$dna = Invoke-RestMethod "$base/dna/files?path=<encoded-path>" -Headers $h
# Shows: status, sweep_count, last_indexed, created_model, created_session
```

### 4. Read key files (selective)

For files under 200 lines: read them directly to surface content in the brief.
For large files (system-design.md, ADRs): read only the first 50 lines + any
section headers. The goal is content awareness, not full ingestion.

### 5. Assemble and output the context packet

Format:

```
LEAD MAGNET: [name]
Recommended model: [model-id]
Tags: [tags]

=== FILES ===
[path] — [DNA status, sweep_count] — [what it seeds]
...

=== QUEUE CONTEXT ===
[Item #ID: title (stage)] — [relevance]
...

=== URLS ===
[url] — [what it covers]
...

=== KEY TURNS ===
[session:X, turn:Y — what happened / why it matters]
...

=== BRIEF FOR SUB-AGENT ===
[Self-contained briefing paragraph ready to paste into an agent prompt.
Includes: what the agent should know, what files to read, what it should produce,
what protocol to follow (DNA registration, stage updates, etc.)]
```

## Available Lead Magnets

| ID | Name | Best for |
|---|---|---|
| 555 | System Use Cases | Feature design, capability survey, sub-agent scope briefing |
| 556 | QOQ System Architecture | Schema work, API design, generation engine, new session orientation |
| 557 | Monetization and Platform | Revenue strategy, product scoping, pitch prep |
| 558 | Sovereign Duo Vision | Philosophy, long-horizon design, agent onboarding |
| 559 | Watch Architecture | ESP32-S3 firmware, BLE/WiFi transport, LVGL display |
| 560 | DNA Provenance Protocol | Sub-agents that write files, backfill ops, hook design |
| 561 | Sub-Agent Testing | Model comparison, template benchmarking, capability proofs |
| 562 | AIBuddy Identity | New model onboarding, persona grounding, session re-orientation |
| 563 | ACIS Compliance | Compliance module work, regulatory domain sessions |

## Enrichment fields (on each lead magnet item)

Each magnet's `metadata` JSON may contain:

```json
{
  "recommended_model": "claude-opus-4-7",
  "urls": ["https://..."],
  "key_turns": ["session:78e6e2b4 turn:42 — ADR-005 written"],
  "tags": ["architecture", "watch", "esp32"],
  "enrichment_notes": "Load synthesis-002 before firmware work — BLE-only constraint is critical"
}
```

`linked_paths` — JSON array of file paths relative to the ccc-qoq project root.

## After loading

- For sub-agent use: paste the `=== BRIEF FOR SUB-AGENT ===` block directly into the agent prompt
- For model comparison: run the same brief against two models; compare outputs
- For session warm-up: read the files listed under `=== FILES ===` before starting work
- For template testing: combine with agenttemplate-001 format; vary model and effort level

## Enrichment protocol (adding to a magnet)

When you discover a file, URL, turn, or queue item that should be part of a lead magnet:

```powershell
# Add a path to linked_paths
$item = Invoke-RestMethod "$base/items/<id>" -Headers $h
$paths = $item.data.linked_paths | ConvertFrom-Json
$paths += "new/path/to/file.md"
$body = '{"linked_paths":' + ($paths | ConvertTo-Json -Compress) + '}'
Invoke-RestMethod "$base/items/<id>" -Method PATCH -Headers $h -Body $body | Out-Null
```

For metadata (URLs, key_turns, recommended_model): PATCH metadata JSON directly.

## Key constants

| Resource | Value |
|---|---|
| LEAD MAGNETS root | Item #554 |
| ccc-qoq Worker | `https://ccc-qoq.rossonlineservices.workers.dev` |
| ADMIN_TOKEN | `$env:QOQ_ADMIN_TOKEN` (PS profile — never hardcode) |
