// ── PM Quest: Chapter Loader ─────────────────────────────────

import { state } from '../state.js';
import { saveGame } from '../save.js';

export async function fetchChapter(file) {
  const resp = await fetch(file);
  if (!resp.ok) throw new Error(`Failed to load ${file}: HTTP ${resp.status}`);
  return resp.json();
}

export function startNewGame(chapterData, chapterFile, mergedInventory = null) {
  const startingNode = chapterData.nodes.find(n => n.is_starting_node);
  if (!startingNode) throw new Error('Chapter has no starting node (is_starting_node: true)');

  state.chapter      = chapterData;
  state.chapterFile  = chapterFile;
  state.currentNode  = startingNode.id;
  state.inventory    = mergedInventory
    ? deduplicate(mergedInventory)
    : [...(chapterData.starting_items ?? [])];
  state.hp           = chapterData.maxHp ?? 100;
  state.maxHp        = chapterData.maxHp ?? 100;
  state.visitedNodes = [startingNode.id];
  state.defeatedEnemies = [];
  state.oracleHintTiers = {};
  state.activeCombat = null;
  state.lastSafeNode = startingNode.id;

  // Show intro modal
  const titleEl = document.getElementById('intro-chapter-title');
  const textEl  = document.getElementById('intro-text');
  if (titleEl) titleEl.textContent = chapterData.title;
  if (textEl)  textEl.textContent  = chapterData.intro_text ?? '';
  document.getElementById('intro-modal')?.classList.add('open');

  saveGame();
}

export async function transitionToNextChapter(nextFile) {
  const carryover   = state.chapter.carryover_items ?? [];
  const chapterData = await fetchChapter(nextFile);
  const nextStarting = chapterData.starting_items ?? [];
  const merged = deduplicate([...carryover, ...nextStarting]);

  startNewGame(chapterData, nextFile, merged);

  // renderAll is called when the player clicks Begin in the intro modal
}

function deduplicate(arr) {
  return [...new Set(arr)];
}
