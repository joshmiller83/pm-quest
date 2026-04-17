# PM Quest — Frontend Discovery

**Date:** April 2026  
**Status:** Decision made — ready for implementation

This document records the research and decisions made on how PM Quest should be built as a browser application. It covers engine choice, visual design direction, UI patterns for each game system, and asset strategy.

---

## 1. Engine Decision: Vanilla HTML/CSS/JS

### Evaluated Options

| Engine | Fit | Notes |
|---|---|---|
| **Twine / SugarCube** | 6/10 | Strong for branching dialog but combat, crafting, and node-map navigation require heavy custom workarounds. JSON chapter loading is not idiomatic. |
| **Ink / Inkle** | 6/10 | Excellent narrative state machine, but it's a compiler+language, not a UI framework. All game systems still need to be built from scratch. |
| **Narrat** | 8/10 | Designed for narrative RPGs with built-in inventory, dialog, and skill checks. Best framework option. Worth revisiting if vanilla complexity grows. |
| **Phaser.js** | 4/10 | 670KB+ graphics engine; overkill for a text-driven game. Designed for sprite-based rendering, not document UIs. |
| **Kaboom.js / LittleJS** | 4/10 | Lightweight but wrong category — action/arcade game engines, not narrative RPG tools. |
| **RPG Maker MZ (web)** | 3/10 | Heavy, graphics-focused, requires asset pipeline, doesn't support dynamic JSON loading without plugins. |
| **Ren'Py (web export)** | 5/10 | Beta-quality web export, designed for visual novels, weak on game mechanics. |
| **Vanilla HTML/CSS/JS** | ✅ **9.5/10** | **Selected.** |

### Why Vanilla Wins

- **No build step** — matches the project constraint; open `index.html` and it works
- **JSON chapters load via `fetch()`** — the architecture is already designed this way
- **Full UI control** — every dialog box, card, modal, and HP bar is a DOM element; CSS handles all visual styling
- **Simple state machine** — one central `gameState` object, event listeners on buttons, render on state change
- **Easy localStorage** — save/load is three lines of `JSON.stringify` / `JSON.parse`
- **Zero dependency hell** — nothing to update, break, or bundle

The only real cost is writing more code than a framework provides. Given the well-defined JSON schema and clear system boundaries, this is acceptable and the code stays readable.

**If complexity grows significantly** (e.g., the game needs animation, a visual node map, or illustrated scenes), Narrat would be the first thing to reconsider.

---

## 2. Visual Direction: Card-Based Document UI

**Decision: Card-based document UI with a professional palette.**

### Rationale

The player is a project manager. Their inventory is literally a briefcase of documents. The "card as document" metaphor is thematically accurate, not just aesthetically convenient. It also matches how information actually exists in the JSON — each item, node, and NPC is a discrete record that maps cleanly to a card.

### Palette

```
Navy:      #1a2744   (backgrounds, headers)
Slate:     #4a5568   (secondary elements, borders)
Gold:      #c9a84c   (accents, badges, highlights)
Parchment: #f5f0e8   (card backgrounds, text areas)
White:     #ffffff   (primary text on dark)
Dark text: #2d2d2d   (primary text on light)
```

### Typography

- **Primary:** `system-ui, -apple-system, sans-serif` — clean and readable
- **Monospace:** `'Courier New', monospace` — used only for item IDs, codes, or "terminal" flavor moments
- No web font dependencies

### Alternatives Considered and Rejected

**Terminal / dark console:** Fun conceptually (legacy PMO tooling aesthetic) but makes long narrative text harder to read. Better as an easter egg or alternate theme than a primary UI.

**Illustrated / visual novel style:** Would add atmosphere but requires art assets. Ruled out for v1; the card UI is designed to accept illustrations later (portrait slots in NPC dialog boxes, card art areas) without restructuring.

**Pixel art / top-down map:** Wrong genre signal. This is a document-driven game, not an action RPG. A spatial map would set wrong expectations.

---

## 3. Layout

### Main Game Layout (Two-Column)

```
┌──────────────────────────────────────────────────────────────┐
│  PM QUEST  ·  Chapter 1: The Initiating Wilds    HP ████░░  │
├──────────────────────────────────────┬───────────────────────┤
│                                      │                       │
│  LOCATION: The Sponsor's Office      │  ☰ BRIEFCASE          │
│  ─────────────────────────────────   │  ─────────────────── │
│  A corner office with a view and a   │  [All] [Artifacts]   │
│  very full calendar. The Sponsor's   │  [Resources] [Junk]  │
│  signature is the only thing that    │                       │
│  makes your charter official.        │  ┌───────────────┐   │
│                                      │  │ 📄 Business   │   │
│  ── TRAVEL TO ──────────────────     │  │    Case       │   │
│  ┌─────────────────────────────┐     │  │  ARTIFACT     │   │
│  │ → The Apothecary            │     │  └───────────────┘   │
│  │ → The Field                 │     │                       │
│  │ → Oracle's Grove            │     │                       │
│  │ 🔒 The Charter Hall         │     │                       │
│  └─────────────────────────────┘     │                       │
│                                      │                       │
│  ── ACTIONS ───────────────────      │                       │
│  [ Talk to The Sponsor ]             │                       │
│                                      │                       │
├──────────────────────────────────────┴───────────────────────┤
│  NPC: The Sponsor                                            │
│  "I believe in this project. Now go develop the charter..."  │
│                                                  [Continue]  │
└──────────────────────────────────────────────────────────────┘
```

- Left panel: narrative (location name + description), navigation cards, action buttons
- Right sidebar: tabbed inventory (briefcase)
- Bottom bar: dialog renderer (NPC name + text + continue button), hidden when no active dialog
- Top bar: chapter title + HP bar

---

## 4. Inventory UI (The Briefcase)

**Metaphor:** The player's inventory is a briefcase of documents. Each item is a card.

### Item Card Structure

```
┌──────────────────────┐
│ 📄                   │   ← icon (emoji, swappable for SVG later)
│  Business Case       │   ← item name
│                      │
│  ARTIFACT  ·  ⚔ 1   │   ← type badge + combat power (if > 0)
└──────────────────────┘
```

- Click card → expand to show full `description` text
- Tabs filter by type: **All | Artifacts | Resources | Junk**
- Junk items shown with a muted/grayed style
- `combat_power: 0` items don't show the combat stat

### Icons by Type (Phase 1 — emoji, no asset requirement)

| Type | Icon |
|---|---|
| artifact | 📄 |
| resource | 🪨 |
| junk | 🗑️ |

---

## 5. Node Navigation

Nodes are rendered as a **clickable list of destination cards**, not a spatial map. This matches the spec's "board" framing (6–10 named stops per chapter).

- **Current node:** highlighted with gold left border
- **Locked node:** grayed out, padlock icon, `unlock_condition_item` shown as tooltip/hint
- **Visited node:** subtle indicator (checkmark or lighter weight text)
- **Node with enemy:** ⚔ icon
- **Crafting station:** ⚗ icon

A visual overworld map is not needed for v1 and would add art dependencies. The card list is clean, fast, and readable.

---

## 6. Combat UI

Rendered as a **full-screen modal overlay** that darkens the main view.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  ⚔  THE UNDOCUMENTED STAKEHOLDER                    │
│  HP: ████████████████████████████░░░░  30/30        │
│                                                      │
│  "You didn't even know I existed, did you..."        │
│                                                      │
│  ──────────────────────────────────────────          │
│                                                      │
│  [ USE ITEM ]      [ STALL ]      [ RETREAT ]        │
│                                                      │
│  ──────────────────────────────────────────          │
│  Result: The charter names the project but           │
│  does not name me. The Stakeholder's HP: 22.         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- **USE ITEM** → opens a mini inventory picker (same card style); selecting an item resolves the turn
- **STALL** → enemy deals damage, dialog plays ("STALL damages your project, not the enemy")
- **RETREAT** → close modal, return to node map; enemy resets HP on re-entry
- HP bar animates on damage
- Result dialog appears after each action before the next turn prompt

---

## 7. Crafting (Apothecary) UI

Also a **full-screen modal**. Only available on nodes with `is_crafting_station: true`.

```
┌──────────────────────────────────────────────────────┐
│  THE APOTHECARY                                      │
│  "Bring me inputs and a technique. I'll do the rest."│
│                                                      │
│  INPUT 1          INPUT 2          TECHNIQUE         │
│  ┌─────────┐      ┌─────────┐      ┌─────────────┐   │
│  │ 📄       │      │ (none)  │      │ Expert      │   │
│  │ Business │      │         │      │ Judgment    │   │
│  │ Case     │      │ [Pick]  │      │ [▾]         │   │
│  └─────────┘      └─────────┘      └─────────────┘   │
│                                                      │
│  ⚠ OPA Constraint: Approved Charter Template also    │
│    required (see Gerald from the PMO)                │
│                                                      │
│              [ ATTEMPT CRAFT ]                       │
│                                                      │
│  OUTPUT                                              │
│  ┌────────────────────────────────────────────┐     │
│  │ ✓ Project Charter (Draft)                  │     │
│  │ "You laid out the Business Case..."        │     │
│  └────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

- Input slots: click to open inventory picker; selected item shown as card
- Technique: dropdown of all available techniques
- OPA constraint warning shown if an NPC has imposed `imposes_constraint` on a matching recipe
- Result area shows success card or failure dialog after attempt

---

## 8. Dialog Renderer

Anchored at the **bottom of the left panel**. Hidden when no dialog is active.

- Portrait area: initials/icon for now (designed to accept an image later)
- NPC name as header
- Dialog text (evaluates `conditional_dialog` against current inventory before displaying `default_dialog`)
- `[Continue]` button advances through multi-part dialog; dismisses on last line
- For Oracle: shows tier indicator ("Consulting the Oracle — Tier 2 of 3")

---

## 9. Save/Load Architecture

**localStorage keys:** `pm_quest_save_ch1`, `pm_quest_save_ch2`, etc.

**Saved state shape:**

```json
{
  "chapter": "chapter_01",
  "chapterFile": "chapters/chapter_01.json",
  "node": "stakeholder_thicket",
  "inventory": ["business_case", "project_charter", "stakeholder_interviews"],
  "hp": 85,
  "maxHp": 100,
  "oracleHintTiers": { "stakeholder_register": 1 },
  "visitedNodes": ["sponsors_office", "field_interviews", "apothecary"],
  "defeatedEnemies": [],
  "timestamp": "2026-04-16T20:00:00Z"
}
```

The loading screen (`index.html`) scans `localStorage` for all `pm_quest_save_*` keys and renders one save card per result.

---

## 10. Loading Screen Design

See implementation in `index.html`. Key elements:

- **Chapter grid:** one card per entry in `chapters/index.json`
  - Available chapters: full color, "▶ New Game" button
  - Coming soon: muted, lock icon, no button
- **Saved Games section:** only rendered if at least one save exists
  - Shows: chapter name, last node, item count, timestamp, "▶ Continue" button
- **Data flow:** chapter selection passes `chapterFile` path via `sessionStorage` to `pm_quest.html`

---

## 11. Asset Strategy

**Phase 1 (current):** Pure CSS + emoji icons. No external images or fonts required.

**Phase 2 (future):** SVG icons can replace emoji per-card without changing card structure. Illustrated NPC portraits can drop into the pre-built portrait slot in the dialog renderer. Chapter cover art can populate a designed slot in chapter cards on the loading screen.

The card structure is intentionally art-ready: placeholder areas exist for images, and adding them is purely additive (no restructuring required).
