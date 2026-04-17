// ── PM Quest: Inventory System ───────────────────────────────

import { state, getItem } from '../state.js';
import { saveGame } from '../save.js';
import { checkWinCondition } from './win.js';

const TYPE_ICONS = {
  artifact: '📄',
  resource: '🪨',
  junk:     '🗑️',
  debuff_item: '⚠️',
};

// ── Mutation helpers ─────────────────────────────────────────

export function addItem(itemId) {
  if (state.inventory.includes(itemId)) return; // de-duplicate
  state.inventory.push(itemId);
  saveGame();
  renderInventory();
  checkWinCondition();

  // Show toast
  const itemData = getItem(itemId);
  if (itemData) showToast(`📥 ${itemData.name} added to briefcase`);
}

export function removeItem(itemId) {
  const idx = state.inventory.indexOf(itemId);
  if (idx !== -1) state.inventory.splice(idx, 1);
}

// ── Render ───────────────────────────────────────────────────

export function renderInventory() {
  const container = document.getElementById('inventory-list');
  if (!container || !state.chapter) return;

  const tab = state.activeInventoryTab ?? 'all';
  const items = state.inventory
    .map(id => getItem(id))
    .filter(Boolean)
    .filter(item => tab === 'all' || item.type === tab);

  container.innerHTML = '';

  if (items.length === 0) {
    container.innerHTML = `<div id="inventory-empty">${
      tab === 'all'
        ? 'Your briefcase is empty.'
        : `No ${tab}s yet.`
    }</div>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = `item-card${item.type === 'junk' ? ' junk' : ''}`;
    card.dataset.itemId = item.id;

    const icon = TYPE_ICONS[item.type] ?? '📋';
    const power = (item.combat_power ?? 0) > 0
      ? `<span class="item-power">⚔ ${item.combat_power}</span>`
      : '';

    card.innerHTML = `
      <div class="item-card-top">
        <span class="item-icon">${icon}</span>
        <span class="item-name">${item.name}</span>
        <div class="item-meta">
          ${power}
          <span class="badge badge-${item.type}">${item.type}</span>
        </div>
      </div>
      <div class="item-description">${item.description ?? ''}</div>
    `;

    card.addEventListener('click', () => card.classList.toggle('expanded'));
    container.appendChild(card);
  });
}

// ── Toast ────────────────────────────────────────────────────

export function showToast(message) {
  // Remove any existing toast
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2600);
}
