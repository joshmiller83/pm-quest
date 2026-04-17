// ── PM Quest: Core Game State ────────────────────────────────
// Single source of truth. All systems import from here.

export const state = {
  chapter: null,             // full parsed chapter JSON
  chapterFile: null,         // e.g. "chapters/chapter_01.json"
  currentNode: null,         // node id string
  inventory: [],             // array of item id strings
  hp: 100,
  maxHp: 100,
  visitedNodes: [],          // array of node id strings
  defeatedEnemies: [],       // array of enemy id strings
  oracleHintTiers: {},       // { item_id: 1 | 2 | 3 }
  activeCombat: null,        // { enemyId, currentHp } | null
  lastSafeNode: null,        // node id of last non-combat node visited
  activeInventoryTab: 'all',
};

// ── Lookup helpers (pure, no side effects) ─────────────────

export function getNode(id) {
  return state.chapter?.nodes.find(n => n.id === id) ?? null;
}

export function getItem(id) {
  return state.chapter?.items.find(i => i.id === id) ?? null;
}

export function getEnemy(id) {
  return state.chapter?.enemies.find(e => e.id === id) ?? null;
}

export function getNpc(id) {
  return state.chapter?.npcs.find(n => n.id === id) ?? null;
}

export function currentNode() {
  return getNode(state.currentNode);
}

export function hasItem(itemId) {
  return state.inventory.includes(itemId);
}

export function isEnemyDefeated(enemyId) {
  return state.defeatedEnemies.includes(enemyId);
}
