# PM Quest: The ITTO RPG

A turn-based, text-driven RPG where you play a newly assigned Project Manager navigating a world that runs entirely on PMI process logic. Progress is gated by knowledge: to defeat enemies, unlock areas, and advance the project, you must craft the right artifacts using correct inputs and techniques. The game is a teaching tool wearing a dungeon-crawler costume.

## How to Play

No installation required. You'll need a local HTTP server to avoid browser CORS restrictions on `fetch()`:

```bash
# from the repo root
python3 -m http.server 8000
```

Then open **http://localhost:8000/** in your browser. Alternatively, deploy the repo to any static host (GitHub Pages, Netlify, etc.).

## Architecture

The game uses a **two-file system**:

| File | Purpose |
|---|---|
| `index.html` | Chapter select screen — shows available chapters and saved games |
| `pm_quest.html` | Game engine — UI, combat, crafting, dialog, save state |
| `chapters/chapter_XX.json` | All content for one chapter (enemies, recipes, nodes, NPCs, items) |

The engine has no hardcoded content. New chapters can be added without touching the engine — just add a JSON file and update `chapters/index.json`.

## Chapter Roadmap

| # | Process Group | Boss |
|---|---|---|
| 01 | Initiating | The Undocumented Stakeholder + Scope Phantom |
| 02 | Planning (Scope) | Scope Creep |
| 03 | Planning (Schedule/Cost) | The Eternal Estimate |
| 04 | Planning (Risk) | Unknown Unknown |
| 05 | Executing | The Disengaged Team |
| 06 | Monitoring & Controlling | Variance the Destroyer |
| 07 | Closing | The Orphaned Lesson |

## Design Spec

Full game design specification, JSON schemas, and system descriptions: [`spec/itto_rpg_spec.md`](spec/itto_rpg_spec.md)

Frontend architecture and visual design research: [`docs/frontend_discovery.md`](docs/frontend_discovery.md)
