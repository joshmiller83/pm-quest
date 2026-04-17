// ── PM Quest: Node Navigation ────────────────────────────────

import { state, getNode, getItem, hasItem, isEnemyDefeated } from '../state.js';
import { saveGame } from '../save.js';
import { addItem } from './inventory.js';
import { showInfo } from './dialog.js';

// renderAll and startCombat injected from main.js to avoid circular imports
let _renderAll = null;
let _startCombat = null;

export function registerNavigationDeps(renderAll, startCombat) {
  _renderAll = renderAll;
  _startCombat = startCombat;
}

export function navigateTo(nodeId) {
  const node = getNode(nodeId);
  if (!node) return;

  // Check lock
  if (node.locked && node.unlock_condition_item) {
    if (!hasItem(node.unlock_condition_item)) {
      const lockItem = getItem(node.unlock_condition_item);
      showInfo(
        '🔒 Area Locked',
        `This area is inaccessible. You need <strong>${lockItem?.name ?? node.unlock_condition_item}</strong> to enter.`,
        '🔒'
      );
      return;
    }
    // Player has the key — allow entry (lock is implicitly lifted)
  }

  // Update state
  state.currentNode = nodeId;
  if (!state.visitedNodes.includes(nodeId)) {
    state.visitedNodes.push(nodeId);
  }

  // Track last safe node (a node without an active enemy is "safe")
  const hasActiveEnemy = node.enemy_id && !isEnemyDefeated(node.enemy_id);
  if (!hasActiveEnemy) {
    state.lastSafeNode = nodeId;
  }

  saveGame();
  if (_renderAll) _renderAll();

  // Grant item on first visit
  if (node.grants_item_on_visit && !hasItem(node.grants_item_on_visit)) {
    addItem(node.grants_item_on_visit);
  }

  // Auto-trigger combat
  if (hasActiveEnemy && _startCombat) {
    // Small delay so the render settles first
    setTimeout(() => _startCombat(node.enemy_id), 80);
  }
}
