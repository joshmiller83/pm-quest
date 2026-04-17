# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PM Quest is a turn-based, text-driven RPG where the player navigates PMI project management processes. It's a teaching tool: players learn ITTO (Inputs, Tools, Techniques, Outputs) by crafting artifacts, fighting enemies, and talking to NPCs — all built on PMI process logic.

## Architecture: Two-File System

| File | Purpose |
|---|---|
| `pm_quest.html` | Static game engine — UI, all game systems, save state. Changes rarely. |
| `chapter_XX.json` | All content for one chapter. New chapters require no engine changes. |

The engine has **no hardcoded content**. Every string, item, enemy, and recipe comes from the loaded chapter JSON. The HTML file fetches a chapter JSON at runtime and injects it into game state.

## File Structure

```
pm_quest/
├── index.html          # Loading/chapter-select screen (entry point)
├── pm_quest.html       # Game engine (loads a chapter and runs the game)
├── spec/
│   └── itto_rpg_spec.md        # Full game design spec and JSON schema
├── docs/
│   └── frontend_discovery.md   # Engine/visual direction research notes
└── chapters/
    ├── index.json               # Chapter manifest (titles, status, file paths)
    └── chapter_01.json          # Chapter content (items, recipes, nodes, enemies, NPCs)
```

## Running the Game

No build system or package manager. Because chapter JSON is loaded via `fetch()`, you'll need a local HTTP server to avoid CORS errors:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

`index.html` is the entry point (chapter select + save slots). It loads `pm_quest.html` with the selected chapter via `sessionStorage`.

## Chapter JSON Schema

Full schema is in `spec/itto_rpg_spec.md`. Key top-level fields:

```json
{
  "chapter": 1,
  "title": "...",
  "process_group": "Initiating",
  "intro_text": "...",
  "starting_items": ["item_id"],
  "carryover_items": ["item_id"],
  "items": [...],
  "techniques": [...],
  "recipes": [...],
  "nodes": [...],
  "enemies": [...],
  "npcs": [...],
  "eefs": [...],
  "oracle": {...},
  "win_condition": { "type": "hold_item", "item_id": "...", "victory_text": "...", "next_chapter": "chapter_02.json" }
}
```

### Crafting (Recipes)

The core mechanic maps to PMI process logic: **Input A + Input B + Technique → Output**

```json
{
  "id": "recipe_001",
  "inputs": ["business_case"],
  "technique": "expert_judgment",
  "output": "project_charter",
  "consume_inputs": false,
  "success_dialog": "...",
  "failure_hints": { "wrong_technique": "...", "wrong_inputs": "..." }
}
```

Multiple recipes can produce the same output (different input/technique combos are all valid PMI paths).

### Nodes

Locations the player navigates between (6–10 per chapter):

```json
{
  "id": "apothecary",
  "is_crafting_station": true,
  "is_starting_node": false,
  "enemy_id": null,
  "npc_id": "apothecary_npc",
  "locked": false,
  "unlock_condition_item": null,
  "grants_item_on_visit": "stakeholder_interviews"  // optional
}
```

### NPCs

Three types: `standard`, `opa`, `oracle`. OPA NPCs grant items and impose recipe constraints. The oracle NPC uses a tiered hint system (3 tiers per missing item, escalating specificity).

NPCs support `grants_item_on_talk` and `conditional_dialog` (array of `{condition_item, dialog}` objects).

### Enemies

Turn-based combat: weakness item defeats outright, partial items reduce HP, immune items trigger teaching dialog.

```json
{
  "id": "undocumented_stakeholder",
  "hp": 30,
  "damage_per_turn": 8,
  "weakness_item": "stakeholder_register",
  "partial_items": ["project_charter"],
  "immune_items": ["business_case"],
  "partial_dialog": { "project_charter": "..." },
  "immune_dialog": { "business_case": "..." },
  "drops_item": null
}
```

### EEFs (Enterprise Environmental Factors)

Node or global conditions that modify recipe requirements or item availability. Not characters — map state.

```json
{
  "id": "eef_01",
  "type": "regulatory",
  "scope": "node",
  "affected_node": "node_id",
  "effect": { "type": "required_input", "recipe_ids": ["recipe_001"], "additional_required_input": "item_id" }
}
```

## Engine Systems (What `pm_quest.html` Must Implement)

- **State**: inventory, HP, current node, chapter progress, Oracle hint tier per missing item
- **Chapter loader**: fetch JSON, parse, inject into state
- **Node map**: render nodes, handle movement, check `locked`/`unlock_condition_item`, apply EEF overlays
- **Apothecary UI**: item selector + technique selector → recipe lookup → success/failure dialog; enforce OPA constraints
- **Combat loop**: action menu (USE ITEM / STALL / RETREAT), HP tracking, result dialog, Try Again on defeat
- **Dialog renderer**: NPC name + text + continue button; evaluates `conditional_dialog` against inventory
- **Oracle UI**: tracks consult count per missing item, advances tier 1→2→3
- **OPA resolver**: on recipe attempt, checks for NPC-imposed `imposes_constraint` and enforces additional inputs
- **EEF resolver**: on node entry and recipe attempt, checks active EEF effects
- **Save state**: localStorage snapshot of all mutable state
- **Chapter transitions**: victory screen → merge `carryover_items` → load next chapter JSON

## Design Principles (Non-Negotiable)

1. **Every failure teaches.** Wrong recipes and immune items always explain themselves in PMI terms — never silent dead ends.
2. **Engine is dumb, chapters are smart.** The HTML file must never need changes to support new chapter content.
3. **The Oracle hints, never solves.** Three escalating tiers — but the player always closes the last gap themselves.
4. **Try Again, always.** No permanent failure. Inventory preserved on defeat; player respawns at last safe node.
5. **Puns are load-bearing.** Tone keeps the material from feeling like studying.
6. **OPAs help and constrain simultaneously.** Gerald gives you something, then makes your life harder. That's accurate.
7. **EEFs are the world, not a character.** Players don't negotiate with EEFs — they adapt.

## Chapter Roadmap

| # | Process Group | Boss |
|---|---|---|
| 01 | Initiating | The Undocumented Stakeholder + Scope Phantom |
| 02 | Planning (Scope) | Scope Creep |
| 03 | Planning (Schedule/Cost) | The Eternal Estimate |
| 04 | Planning (Risk) | Unknown Unknown |
| 05 | Executing | The Disengaged Team |
| 06 | M&C | Variance the Destroyer |
| 07 | Closing | The Orphaned Lesson |
