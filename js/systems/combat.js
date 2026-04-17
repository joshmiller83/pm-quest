// ── PM Quest: Combat System ──────────────────────────────────

import { state, getEnemy, getItem, hasItem } from '../state.js';
import { saveGame } from '../save.js';
import { addItem, removeItem, showToast } from './inventory.js';
import { showInfo } from './dialog.js';

const TYPE_ICONS = { artifact: '📄', resource: '🪨', junk: '🗑️', debuff_item: '⚠️' };

let _renderAll = null;
export function registerCombatDeps(renderAll) { _renderAll = renderAll; }

// ── Open combat ──────────────────────────────────────────────

export function startCombat(enemyId) {
  const enemy = getEnemy(enemyId);
  if (!enemy) return;

  state.activeCombat = { enemyId, currentHp: enemy.hp };

  // Populate modal
  document.getElementById('combat-enemy-name').textContent = enemy.name;
  setCombatHp(enemy.hp, enemy.hp);
  document.getElementById('combat-dialog').textContent = enemy.intro_dialog ?? '';
  document.getElementById('combat-result').textContent = '';
  document.getElementById('combat-result').className = 'combat-result';
  setActionsEnabled(true);

  document.getElementById('combat-modal').classList.add('open');
}

// ── Player actions ───────────────────────────────────────────

export function combatUseItem() {
  const enemy = getEnemy(state.activeCombat.enemyId);
  openItemPicker(
    'Choose an item to use in combat:',
    state.inventory.map(id => getItem(id)).filter(Boolean),
    (itemId) => resolveItemUse(itemId, enemy)
  );
}

function resolveItemUse(itemId, enemy) {
  const item = getItem(itemId);
  if (!item) return;

  let resultText = '';
  let resultClass = '';
  let damage = 0;
  let combatEnded = false;

  if (itemId === enemy.weakness_item) {
    // One-shot weakness
    damage = state.activeCombat.currentHp;
    resultText = `✓ ${item.name} strikes true. ${enemy.name} collapses.`;
    resultClass = 'result-good';
    state.activeCombat.currentHp = 0;
    combatEnded = true;
  } else if (enemy.partial_items?.includes(itemId)) {
    // Partial damage
    damage = Math.max(1, item.combat_power ?? 1);
    state.activeCombat.currentHp = Math.max(0, state.activeCombat.currentHp - damage);
    const partialDialog = enemy.partial_dialog?.[itemId] ?? `${item.name} deals ${damage} damage.`;
    resultText = partialDialog;
    resultClass = 'result-warn';
    if (state.activeCombat.currentHp <= 0) combatEnded = true;
  } else if (enemy.immune_items?.includes(itemId)) {
    // Immune — teaching moment
    const immuneDialog = enemy.immune_dialog?.[itemId] ?? `${enemy.name} is immune to ${item.name}.`;
    resultText = immuneDialog;
    resultClass = 'result-bad';
    damage = 0;
  } else {
    // Generic combat power
    damage = Math.max(1, item.combat_power ?? 1);
    state.activeCombat.currentHp = Math.max(0, state.activeCombat.currentHp - damage);
    resultText = `${item.name} deals ${damage} damage.`;
    resultClass = damage > 0 ? 'result-warn' : 'result-bad';
    if (state.activeCombat.currentHp <= 0) combatEnded = true;
  }

  setCombatHp(state.activeCombat.currentHp, enemy.hp);
  setResultText(resultText, resultClass);

  if (combatEnded) {
    setActionsEnabled(false);
    setTimeout(() => resolveEnemyDefeat(enemy), 1200);
    return;
  }

  // Enemy counter-attacks after a delay
  setTimeout(() => enemyAttack(enemy), 900);
}

export function combatStall() {
  const enemy = getEnemy(state.activeCombat.enemyId);
  const dialog = document.getElementById('combat-dialog');
  if (dialog) dialog.textContent = `${enemy.name} grows impatient while you do nothing.`;
  setResultText(`You stall. ${enemy.name} deals ${enemy.damage_per_turn} damage.`, 'result-bad');
  setTimeout(() => enemyAttack(enemy), 900);
}

export function combatRetreat() {
  state.activeCombat = null;
  document.getElementById('combat-modal').classList.remove('open');
  if (_renderAll) _renderAll();
}

// ── Enemy turn ───────────────────────────────────────────────

function enemyAttack(enemy) {
  state.hp = Math.max(0, state.hp - enemy.damage_per_turn);
  updateHpBar();
  saveGame();

  if (state.hp <= 0) {
    resolvePlayerDefeat(enemy);
  }
  // Otherwise player takes their next turn (actions remain enabled)
}

// ── Victory ──────────────────────────────────────────────────

function resolveEnemyDefeat(enemy) {
  state.defeatedEnemies.push(enemy.id);

  const dialog = document.getElementById('combat-dialog');
  if (dialog) dialog.textContent = enemy.defeat_dialog ?? `${enemy.name} has been defeated!`;
  setResultText('', '');
  setActionsEnabled(false);

  // Show a "Continue" button inside combat
  const actionsEl = document.getElementById('combat-actions');
  actionsEl.innerHTML = `<button class="btn btn-primary" id="combat-continue-btn">Continue →</button>`;
  document.getElementById('combat-continue-btn').addEventListener('click', () => {
    document.getElementById('combat-modal').classList.remove('open');

    // Drop item
    if (enemy.drops_item) {
      addItem(enemy.drops_item);
    }

    state.activeCombat = null;
    saveGame();
    if (_renderAll) _renderAll();
  });
}

// ── Defeat ───────────────────────────────────────────────────

function resolvePlayerDefeat(enemy) {
  setActionsEnabled(false);
  document.getElementById('combat-modal').classList.remove('open');

  // Restore HP and return to safe node
  state.hp = state.maxHp;
  state.currentNode = state.lastSafeNode ?? state.currentNode;
  state.activeCombat = null;
  saveGame();

  // Wire up the Try Again button before opening defeat modal
  const tryAgainBtn = document.getElementById('defeat-try-again');
  if (tryAgainBtn) {
    const fresh = tryAgainBtn.cloneNode(true);
    tryAgainBtn.replaceWith(fresh);
    fresh.addEventListener('click', () => {
      document.getElementById('defeat-modal').classList.remove('open');
      // Re-enter the same combat
      startCombat(enemy.id);
    });
  }

  if (_renderAll) _renderAll();
  document.getElementById('defeat-modal').classList.add('open');
}

// ── Item picker (shared with crafting) ───────────────────────

let _pickerCallback = null;

export function openItemPicker(title, items, onSelect, allowEmpty = false) {
  const modal = document.getElementById('item-picker-modal');
  const titleEl = document.getElementById('item-picker-title');
  const grid = document.getElementById('item-picker-grid');

  titleEl.textContent = title;
  grid.innerHTML = '';
  _pickerCallback = onSelect;

  if (allowEmpty) {
    const noneBtn = document.createElement('button');
    noneBtn.className = 'picker-item';
    noneBtn.innerHTML = `<span class="picker-item-icon">∅</span><span class="picker-item-name">None (single-input craft)</span>`;
    noneBtn.addEventListener('click', () => {
      closeItemPicker();
      onSelect(null);
    });
    grid.appendChild(noneBtn);
  }

  items.forEach(item => {
    const icon = TYPE_ICONS[item.type] ?? '📋';
    const power = (item.combat_power ?? 0) > 0 ? `⚔ ${item.combat_power}` : '';

    const btn = document.createElement('button');
    btn.className = 'picker-item';
    btn.innerHTML = `
      <span class="picker-item-icon">${icon}</span>
      <span class="picker-item-name">${item.name}</span>
      <span class="picker-item-power">${power}</span>
    `;
    btn.addEventListener('click', () => {
      closeItemPicker();
      onSelect(item.id);
    });
    grid.appendChild(btn);
  });

  if (items.length === 0 && !allowEmpty) {
    grid.innerHTML = `<div style="text-align:center;padding:1rem;color:var(--muted)">No items available.</div>`;
  }

  modal.classList.add('open');
}

export function closeItemPicker() {
  document.getElementById('item-picker-modal')?.classList.remove('open');
  _pickerCallback = null;
}

// ── UI helpers ───────────────────────────────────────────────

function setCombatHp(current, max) {
  const fill = document.getElementById('combat-hp-fill');
  const text = document.getElementById('combat-hp-text');
  if (fill) fill.style.width = `${Math.max(0, (current / max) * 100)}%`;
  if (text) text.textContent = `${Math.max(0, current)} / ${max} HP`;
}

function setResultText(text, cls) {
  const el = document.getElementById('combat-result');
  if (!el) return;
  el.textContent = text;
  el.className = `combat-result${cls ? ' ' + cls : ''}`;
}

function setActionsEnabled(enabled) {
  const btns = document.querySelectorAll('#combat-actions .btn');
  btns.forEach(b => { b.disabled = !enabled; });
}

function updateHpBar() {
  const fill = document.getElementById('hp-bar-fill');
  const text = document.getElementById('hp-text');
  if (!fill || !text) return;
  const pct = (state.hp / state.maxHp) * 100;
  fill.style.width = `${pct}%`;
  fill.className = 'hp-bar-fill' + (pct > 60 ? '' : pct > 30 ? ' hp-mid' : ' hp-low');
  text.textContent = `${state.hp} / ${state.maxHp}`;
}
