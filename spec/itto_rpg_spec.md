# PM Quest: The ITTO RPG
### Design Specification — v1.1

---

## Concept

A turn-based, text-driven RPG where the player is a newly assigned Project Manager navigating a world that runs entirely on PMI process logic. Progress is gated by knowledge: to defeat enemies, unlock areas, and advance the project, the player must craft the right artifacts using correct inputs and techniques. The game is a teaching tool wearing a dungeon-crawler costume.

The world is organized into **Chapters** — each Chapter corresponds to a process group (Initiating, Planning, Executing, Monitoring & Controlling, Closing). The core HTML game engine is static and permanent. Chapters are external JSON files loaded at runtime, meaning new content can be produced without touching the engine.

---

## Architecture

### Two-File System

| File | Purpose | Changes over time? |
|---|---|---|
| `pm_quest.html` | Game engine: UI, combat, crafting, inventory, dialog, save state | Rarely — only for engine improvements |
| `chapter_XX.json` | All content for one chapter: enemies, recipes, items, dialog, map nodes | Yes — new chapters added freely |

The HTML file loads a chapter JSON on start (or on chapter transition). Everything the engine needs to run a chapter — enemies, what items they're weak to, crafting recipes, NPC dialog, node descriptions — lives in the JSON.

### Chapter JSON Structure (Overview)

```json
{
  "chapter": 1,
  "title": "The Initiating Wilds",
  "process_group": "Initiating",
  "intro_text": "...",
  "items": [ ... ],
  "recipes": [ ... ],
  "nodes": [ ... ],
  "enemies": [ ... ],
  "npcs": [ ... ],
  "eefs": [ ... ],
  "oracle": { ... },
  "win_condition": { ... }
}
```

Full schema definitions follow in later sections.

---

## World Structure

### Nodes

The world is a lightweight **node map** — a small set of named locations the player can navigate between. Each node is a place. Think of it less like an open world and more like a board — 6 to 10 named stops per chapter.

Example nodes for Chapter 1 (Initiating):

- **The Sponsor's Office** — starting point; receive your quest
- **The Apothecary** — crafting station; mix inputs and apply techniques
- **The Stakeholder Thicket** — enemy encounter area
- **The Charter Hall** — boss chamber
- **The Registry** — shop/resource node; acquire base items

Nodes can have:
- A description (flavor text)
- An enemy encounter (optional)
- An NPC (optional)
- A crafting station flag (boolean)
- A locked flag (unlocked when a condition is met — e.g., player holds a specific item)

---

## Items

Every PMI artifact, document, and resource becomes an inventory item. Items have:

- `id` — unique string key
- `name` — display name (can be punny)
- `description` — what it is in PMI terms, written in-world
- `type` — `artifact`, `resource`, `junk`, `debuff_item`
- `combat_power` — optional integer; some items can be used in battle directly

### Starting Items

Each chapter defines one or more items the player begins with. In Chapter 1 this is just the Project Charter. Later chapters should reflect what a PM would realistically carry forward — the outputs of prior process groups become the starting inventory of the next.

> **Project Charter** — *"A sacred document, signed by your Sponsor. Without it, you are just a person with opinions."*

The `starting_items` array in the chapter JSON is authoritative. The engine merges these with any items carried over from the previous chapter's win state, so players who completed earlier chapters arrive with a richer inventory than new players jumping in mid-game. Chapter authors should document which carryover items their recipes assume exist.

### Junk Items

If the player enters a bad recipe (wrong combination), they may produce a **junk item**. Junk items are in-world jokes about bad project management:

- **Scope Creep** — *"Nobody asked for this, but here it is anyway."*
- **Gold-Plated Deliverable** — *"Beautiful. Unnecessary. Very expensive."*
- **The Undocumented Assumption** — *"Looked real enough at the time."*

Junk items have no combat use but are kept in inventory. Some NPCs may have dialog that reacts to junk in your pack.

---

## The Apothecary (Crafting)

The Apothecary is the game's central learning mechanic. It maps directly to PMI process logic:

> **Input A + Input B + Technique → Output**

This is an ITTO recipe. The player selects two items from their inventory, selects a technique from a list, and attempts the craft. 

### Techniques

Techniques are not items — they are selectable methods the player chooses at the Apothecary. They map to PMI tools & techniques:

- Expert Judgment
- Data Analysis
- Meetings
- Interpersonal & Team Skills
- Data Representation
- Decision Making
- ...etc. (defined per chapter in JSON)

Techniques are always available once unlocked — they don't get "used up." The combination of items + technique determines the output.

### Recipe Logic

Each recipe in the chapter JSON specifies:

```json
{
  "inputs": ["project_charter", "stakeholder_interviews"],
  "technique": "data_analysis",
  "output": "stakeholder_register",
  "consume_inputs": true,
  "dialog": "You've documented who's who and what they want. The Stakeholder Register crystallizes from the mist."
}
```

- `consume_inputs` — if true, input items are removed from inventory on craft (mirrors real-world: you don't un-have a charter, but some resources get spent)
- `dialog` — short flavor text explaining *why this worked*, surfacing the learning moment

### Failed Recipes

If no matching recipe exists for the selected combination:

1. Nothing is consumed
2. A short dialog explains the mismatch in-world (this is a key teaching opportunity)
3. A "Try Again" button returns the player to the Apothecary

Example failure dialog:
> *"You place your Risk Register on the counter next to your Project Charter and ask for Scope Baseline. The Apothecary squints. 'Risks don't define scope, friend. You need to Define the Scope before you can baseline it. Come back when you've got your requirements sorted.'"*

This is more valuable than a silent failure — the NPC explains the logic gap.

---

## The Oracle

The Oracle is a special NPC available in every chapter — the one character who will always talk to you, no matter how lost you are. She doesn't give answers. She gives direction.

Her hints are written in PMI-flavored riddles that point toward the right process without naming the recipe. The player still has to figure out the combination.

**Example Oracle hints:**

- *"The Undocumented Stakeholder cannot be named by charter alone. You must first go out and find them."* → nudges toward stakeholder interviews before the register
- *"Scope does not define itself. Someone has to collect what is wanted before anyone can say what is in."* → hints at Collect Requirements before Define Scope
- *"A register full of risks means nothing until each one has somewhere to go."* → Plan Risk Responses needs the Risk Register first

The Oracle has a **hint tier system**:

| Tier | What it gives |
|---|---|
| 1 (first ask) | Vague, atmospheric — points at the problem space |
| 2 (second ask) | More specific — names the process group or type of artifact needed |
| 3 (third ask) | Direct — names the output you're trying to craft, but not the recipe |

The Oracle never names inputs or techniques directly. That's the player's job.

### Oracle Schema

```json
{
  "id": "oracle",
  "name": "The Oracle of Process",
  "flavor": "She speaks only in questions, which is somehow still more helpful than your last PMO.",
  "hints": [
    {
      "trigger_missing_item": "stakeholder_register",
      "tier_1": "The unseen shape the outcome as much as the seen. Have you looked for all who have a stake?",
      "tier_2": "Before you can document them, you must find them. Go out. Ask questions.",
      "tier_3": "You need a Stakeholder Register. The inputs are out there in the world."
    }
  ]
}
```

The engine tracks how many times the player has consulted the Oracle about a given missing item and advances the tier accordingly.

---

## OPAs — Organizational Process Assets (Guild Friends)

OPAs are in-world as **guild members, mentors, or institutional allies** — characters who represent your organization's accumulated knowledge and process requirements. They are friendly, but they come with strings attached.

An OPA character might:
- **Hand you a required item** — *"Per PMO policy, all projects must use the Approved Charter Template. Here's yours."* The player receives an item they didn't have to craft, but it may be a required input to a recipe.
- **Impose a recipe constraint** — *"The organization requires Expert Judgment on all risk assessments."* This means a recipe that might work with Data Analysis alone now requires Expert Judgment as the technique.
- **Unlock a historical artifact** — *"We ran a project like this three years ago. Here are the lessons learned."* Grants a special item usable as a crafting input.

OPAs are not enemies. They don't fight. But ignoring their requirements can make recipes fail — an OPA-imposed constraint acts as an additional required input or a forced technique choice.

### OPA NPC Schema

```json
{
  "id": "pmo_rep",
  "name": "Gerald from the PMO",
  "type": "opa",
  "flavor": "Gerald has been with the organization for 23 years and remembers when people used paper.",
  "grants_item": "approved_charter_template",
  "imposes_constraint": {
    "recipe_id": "recipe_003",
    "required_additional_input": "approved_charter_template"
  },
  "default_dialog": "Everything must go through the PMO. That's just how we do things here.",
  "conditional_dialog": [
    {
      "condition_item": "approved_charter_template",
      "dialog": "Good. You have the template. Don't lose it."
    }
  ]
}
```

### OPA Node Placement

OPA characters live on specific nodes — usually at an organizational hub node (PMO Office, Archive Room, Lessons Learned Library). The player must visit them to receive their grants or learn their constraints. Skipping an OPA node can leave the player with an incomplete recipe later.

---

## EEFs — Enterprise Environmental Factors (The World Itself)

EEFs are not characters — they are **conditions on the map**. They represent the environment the project operates within: regulations, market conditions, organizational culture, infrastructure, and external constraints.

EEFs manifest as **node modifiers** or **regional conditions** that affect what's possible in that area.

### Types of EEF Effects

| EEF Type | In-World Form | Mechanical Effect |
|---|---|---|
| Regulatory | A "Compliance Zone" node overlay | Certain techniques unavailable; specific inputs become mandatory |
| Market | Scarcity event on a resource node | A normally available item is temporarily missing from the world |
| Cultural | Dialog modifier on NPCs in a region | NPCs react differently; some won't engage without certain artifacts |
| Infrastructure | A locked node type | A node is inaccessible until an infrastructure item is crafted |
| Favorable | A "Tailwind" condition on a node | One technique costs nothing or produces a bonus output |

### EEF Schema

EEFs are defined at the chapter level and attached to nodes or applied globally:

```json
{
  "eefs": [
    {
      "id": "regulatory_eef_01",
      "name": "The Compliance Mandate",
      "description": "Regional regulators require environmental review before any site work begins.",
      "type": "regulatory",
      "scope": "node",
      "affected_node": "site_assessment_node",
      "effect": {
        "type": "required_input",
        "recipe_ids": ["recipe_005", "recipe_006"],
        "additional_required_input": "environmental_clearance"
      },
      "flavor_text": "A sign on the node reads: NO WORK WITHOUT CLEARANCE. It is not a suggestion."
    },
    {
      "id": "market_eef_01",
      "name": "The Supply Shortage",
      "description": "Resource constraints mean contractor availability is limited.",
      "type": "market",
      "scope": "global",
      "effect": {
        "type": "item_unavailable",
        "item_id": "contractor_resource",
        "until_condition": "hold_item:procurement_plan"
      },
      "flavor_text": "The contractor node is bare. A note reads: Back when we have a plan."
    }
  ]
}
```

### OPA vs. EEF — The Distinction in Play

| | OPA | EEF |
|---|---|---|
| Source | Your organization | The external world |
| Form | NPC / ally character | Node condition / map state |
| Tone | Helpful but bureaucratic | Neutral or obstructive |
| Interaction | You visit them | They exist; you work around them |
| PMI concept | Templates, policies, historical data | Market, culture, regulations, infrastructure |

The player learns this distinction naturally through play: Gerald from the PMO is someone you talk to; the Compliance Mandate is something the map just has.

---



Combat is **turn-based** with a simple action menu. It is not meant to be mechanically deep — the game's challenge is knowing what to bring to a fight, not executing a complex battle system.

### Combat Flow

```
[Enemy appears with intro dialog]
    ↓
Player selects action:
  → USE ITEM (select from inventory)
  → STALL (lose a turn; enemy gains strength — equivalent to doing nothing on a project)
  → RETREAT (exit encounter, return to node map; can retry)
    ↓
[Result dialog plays]
    ↓
[Enemy defeated → drops item or unlocks node]
 OR
[Player loses → failure screen with Try Again]
```

### Enemy Weaknesses

Each enemy has:
- A **weakness item** — the artifact that defeats them outright
- A **partial item** — reduces enemy HP but doesn't finish them
- **Immune items** — wrong tools; enemy mocks you with a teaching moment

Example:

**Enemy: The Undocumented Stakeholder**
- Weakness: `stakeholder_register`
- Partial: `project_charter`
- Immune: `risk_register` → dialog: *"A Risk Register? I'm not a risk, I'm a person. An ignored person."*

### HP & Damage

The player has HP. Enemies deal damage each turn the player doesn't resolve the fight. This creates mild urgency without making the game punishing — the player can always retreat, reconsider, go craft the right item, and return.

### Try Again

On player defeat (HP reaches 0):
- Brief "you blacked out" screen
- Inventory is preserved
- Player respawns at the last safe node
- **"Try Again"** button returns them to the encounter

No penalty beyond a small HP cost to restart. The goal is learning, not punishment.

---

## Dialog System

Dialog is a first-class feature. It serves the teaching function.

Every meaningful event triggers a dialog box:

- **NPC conversations** (narrative, hints, lore)
- **Craft success** (explains *why* the recipe worked in PMI terms)
- **Craft failure** (explains what's missing or out of sequence)
- **Combat events** (enemy taunts reveal what they're immune to and why)
- **Item acquisition** (flavor text + brief PMI definition)
- **Boss intros** (sets up the concept being tested)

Dialog entries in the chapter JSON support a simple branching flag — an NPC can say different things depending on whether the player holds a specific item.

```json
{
  "npc_id": "apothecary_npc",
  "default_dialog": "Bring me inputs and a technique. I'll do the rest.",
  "conditional_dialog": [
    {
      "condition_item": "scope_creep",
      "dialog": "I see you've been doing some... unplanned work. We've all been there."
    }
  ]
}
```

---

## Chapter JSON Full Schema

```json
{
  "chapter": 1,
  "title": "The Initiating Wilds",
  "process_group": "Initiating",
  "intro_text": "String — shown when chapter loads",

  "items": [
    {
      "id": "stakeholder_register",
      "name": "Stakeholder Register",
      "description": "A living document cataloging every soul with skin in this game.",
      "type": "artifact",
      "combat_power": 2
    }
  ],

  "techniques": [
    { "id": "expert_judgment", "name": "Expert Judgment" },
    { "id": "data_analysis", "name": "Data Analysis" },
    { "id": "meetings", "name": "Meetings" }
  ],

  "recipes": [
    {
      "id": "recipe_001",
      "inputs": ["project_charter", "stakeholder_interviews"],
      "technique": "data_analysis",
      "output": "stakeholder_register",
      "consume_inputs": false,
      "success_dialog": "...",
      "failure_hints": {
        "wrong_technique": "Data doesn't analyze itself. Try a different technique.",
        "wrong_inputs": "You need to actually talk to stakeholders before you can register them."
      }
    }
  ],

  "nodes": [
    {
      "id": "apothecary",
      "name": "The Apothecary",
      "description": "Smells like scope and old coffee.",
      "is_crafting_station": true,
      "enemy_id": null,
      "npc_id": "apothecary_npc",
      "locked": false,
      "unlock_condition_item": null
    }
  ],

  "enemies": [
    {
      "id": "undocumented_stakeholder",
      "name": "The Undocumented Stakeholder",
      "hp": 30,
      "damage_per_turn": 5,
      "weakness_item": "stakeholder_register",
      "partial_items": ["project_charter"],
      "immune_items": ["risk_register"],
      "intro_dialog": "You didn't even know I existed, did you.",
      "immune_dialog": {
        "risk_register": "A Risk Register? I'm not a risk, I'm a person. An ignored person."
      },
      "defeat_dialog": "Fine. Put me in the register. Third row.",
      "drops_item": "stakeholder_interviews"
    }
  ],

  "npcs": [
    {
      "id": "apothecary_npc",
      "name": "Old Procurement Pete",
      "type": "standard",
      "default_dialog": "Bring me inputs and a technique. I'll do the rest.",
      "conditional_dialog": [
        {
          "condition_item": "scope_creep",
          "dialog": "I see you've been doing some unplanned work. We've all been there."
        }
      ]
    },
    {
      "id": "pmo_rep",
      "name": "Gerald from the PMO",
      "type": "opa",
      "flavor": "Gerald has been here for 23 years and remembers when people used paper.",
      "grants_item": "approved_charter_template",
      "imposes_constraint": {
        "recipe_id": "recipe_001",
        "required_additional_input": "approved_charter_template"
      },
      "default_dialog": "Everything must go through the PMO. That's just how we do things here.",
      "conditional_dialog": [
        {
          "condition_item": "approved_charter_template",
          "dialog": "Good. You have the template. Don't lose it."
        }
      ]
    }
  ],

  "starting_items": ["project_charter", "approved_charter_template"],
  "carryover_items": ["project_charter"],

  "oracle": {
    "id": "oracle",
    "name": "The Oracle of Process",
    "flavor": "She speaks only in questions, which is somehow still more helpful than your last PMO.",
    "hints": [
      {
        "trigger_missing_item": "stakeholder_register",
        "tier_1": "The unseen shape the outcome as much as the seen. Have you looked for all who have a stake?",
        "tier_2": "Before you can document them, you must find them. Go out. Ask questions.",
        "tier_3": "You need a Stakeholder Register. The inputs are out there in the world."
      }
    ]
  },

  "eefs": [
    {
      "id": "regulatory_eef_01",
      "name": "The Compliance Mandate",
      "type": "regulatory",
      "scope": "node",
      "affected_node": "charter_hall",
      "effect": {
        "type": "required_input",
        "recipe_ids": ["recipe_001"],
        "additional_required_input": "environmental_clearance"
      },
      "flavor_text": "A sign reads: NO WORK WITHOUT CLEARANCE. It is not a suggestion."
    }
  ],
    "type": "hold_item",
    "item_id": "signed_project_charter",
    "victory_text": "The Initiating Wilds are tamed. Your charter is signed. Planning awaits.",
    "next_chapter": "chapter_02.json"
  }
}
```

---

## Engine Responsibilities (HTML File)

The engine handles everything that doesn't change between chapters:

| System | Description |
|---|---|
| **State management** | Inventory, HP, current node, chapter progress, Oracle hint tier tracking |
| **Node navigation** | Render node map, handle movement, check locks, apply EEF overlays |
| **Apothecary UI** | Item selector, technique selector, craft button, result dialog, OPA constraint enforcement |
| **Combat UI** | Turn loop, action menu, HP display, item use, retreat/try again |
| **Dialog renderer** | Box with NPC name, text, and continue/choice buttons |
| **Oracle UI** | Tiered hint display; tracks consult count per missing item |
| **OPA resolver** | On recipe attempt, checks for OPA-imposed constraints and enforces additional inputs |
| **EEF resolver** | On node entry and recipe attempt, checks for active EEF conditions and applies effects |
| **Chapter loader** | Fetch a JSON file by name, parse, and inject into game state |
| **Save state** | LocalStorage snapshot of inventory, HP, chapter progress, Oracle tier state |
| **Chapter transitions** | Victory screen, merge carryover items, load next chapter JSON |

The engine has no hardcoded content. Every string, item, enemy, and recipe comes from the loaded chapter JSON.

---

## Chapter Roadmap (Planned)

| Chapter | Process Group | Boss | Key Recipes |
|---|---|---|---|
| 01 | Initiating | The Undocumented Stakeholder | Charter + Interviews → Stakeholder Register |
| 02 | Planning (Scope) | Scope Creep | Requirements + WBS → Scope Baseline |
| 03 | Planning (Schedule/Cost) | The Eternal Estimate | Scope Baseline + Resources → Schedule + Budget |
| 04 | Planning (Risk) | Unknown Unknown | Risk Register + Analysis → Risk Response Plan |
| 05 | Executing | The Disengaged Team | Multiple execution artifacts |
| 06 | M&C | Variance the Destroyer | EVM artifacts, change requests |
| 07 | Closing | The Orphaned Lesson | Lessons Learned + final acceptance |

---

## Design Principles

1. **Every failure teaches.** No silent dead ends. Wrong recipes and immune items always explain themselves in PMI terms.
2. **The game is the flashcard.** Recipes *are* ITTOs. You learn them by doing them, not by reading a list.
3. **Puns are load-bearing.** The tone keeps the material from feeling like studying. Enemy names and NPC quips should be groan-worthy.
4. **Engine is dumb, chapters are smart.** The HTML file should need no changes to support new content. All chapter-specific logic lives in JSON.
5. **Try Again, always.** No permanent failure states. The player can always go back, recraft, and return.
6. **The Oracle hints, never solves.** Three tiers of escalating specificity — but the player always has to close the last gap themselves.
7. **OPAs help and constrain simultaneously.** Gerald from the PMO gives you something, then immediately makes your life harder. That's accurate.
8. **EEFs are the world, not a character.** Players don't negotiate with EEFs. They adapt to them — exactly as in real project management.
