// ── PM Quest: Save / Load ────────────────────────────────────

import { state, getNode } from './state.js';

export function getSaveKey() {
  return `pm_quest_save_ch${state.chapter.chapter}`;
}

export function saveGame() {
  if (!state.chapter) return;
  const node = getNode(state.currentNode);
  const save = {
    chapter: `chapter_0${state.chapter.chapter}`,
    chapterFile: state.chapterFile,
    chapterTitle: state.chapter.title,
    node: state.currentNode,
    nodeName: node?.name ?? state.currentNode,
    inventory: [...state.inventory],
    hp: state.hp,
    maxHp: state.maxHp,
    oracleHintTiers: { ...state.oracleHintTiers },
    visitedNodes: [...state.visitedNodes],
    defeatedEnemies: [...state.defeatedEnemies],
    lastSafeNode: state.lastSafeNode,
    timestamp: new Date().toISOString(),
  };
  try {
    localStorage.setItem(getSaveKey(), JSON.stringify(save));
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

export function loadSave(saveData) {
  state.chapterFile  = saveData.chapterFile;
  state.currentNode  = saveData.node;
  state.inventory    = saveData.inventory ?? [];
  state.hp           = saveData.hp ?? 100;
  state.maxHp        = saveData.maxHp ?? 100;
  state.oracleHintTiers = saveData.oracleHintTiers ?? {};
  state.visitedNodes = saveData.visitedNodes ?? [saveData.node];
  state.defeatedEnemies = saveData.defeatedEnemies ?? [];
  state.lastSafeNode = saveData.lastSafeNode ?? saveData.node;
  state.activeCombat = null;
}
