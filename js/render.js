// ── PM Quest: Render Pipeline ────────────────────────────────

import { state, getNode, getItem, getEnemy, getNpc, currentNode, isEnemyDefeated } from './state.js';
import { renderInventory } from './systems/inventory.js';
import { checkWinCondition } from './systems/win.js';
import { getActiveEefsForNode } from './systems/crafting.js';

// ── Master render ────────────────────────────────────────────

export function renderAll() {
  if (!state.chapter) return;
  renderTopBar();
  renderLeftPanel();
  renderInventory();
  checkWinCondition();
}

// ── Top bar ──────────────────────────────────────────────────

function renderTopBar() {
  const titleEl = document.getElementById('chapter-title-display');
  if (titleEl) titleEl.textContent = state.chapter.title;

  const fill = document.getElementById('hp-bar-fill');
  const text = document.getElementById('hp-text');
  if (!fill || !text) return;

  const pct = (state.hp / state.maxHp) * 100;
  fill.style.width = `${Math.max(0, pct)}%`;
  fill.className = 'hp-bar-fill' + (pct > 60 ? '' : pct > 30 ? ' hp-mid' : ' hp-low');
  text.textContent = `${state.hp} / ${state.maxHp}`;
}

// ── Left panel ───────────────────────────────────────────────

function renderLeftPanel() {
  const node = currentNode();
  if (!node) return;

  // Location
  document.getElementById('location-name').textContent = node.name;
  document.getElementById('location-description').textContent = node.description ?? '';

  // EEF flavor
  const eefs = getActiveEefsForNode(node.id).filter(e => e.flavor_text);
  const eefBox = document.getElementById('eef-box');
  if (eefs.length > 0) {
    eefBox.classList.remove('hidden');
    eefBox.textContent = eefs.map(e => e.flavor_text).join(' · ');
  } else {
    eefBox.classList.add('hidden');
  }

  // Navigation cards (all other nodes)
  renderNodeList(node);

  // Action buttons
  renderActionButtons(node);
}

function renderNodeList(currentNodeData) {
  const list = document.getElementById('node-list');
  if (!list) return;
  list.innerHTML = '';

  const otherNodes = state.chapter.nodes.filter(n => n.id !== currentNodeData.id);

  otherNodes.forEach(n => {
    const isLocked = n.locked && !state.inventory.includes(n.unlock_condition_item ?? '');
    const hasEnemy = n.enemy_id && !isEnemyDefeated(n.enemy_id);
    const isCrafting = n.is_crafting_station;
    const isVisited = state.visitedNodes.includes(n.id);

    let icon = '→';
    if (isLocked) icon = '🔒';
    else if (hasEnemy) icon = '⚔';
    else if (isCrafting) icon = '⚗';

    const lockHint = isLocked && n.unlock_condition_item
      ? `Requires: ${getItem(n.unlock_condition_item)?.name ?? n.unlock_condition_item}`
      : '';

    const card = document.createElement('div');
    card.className = `node-card${isLocked ? ' node-locked' : ''}${hasEnemy ? ' node-enemy' : ''}`;
    card.dataset.action = 'navigate';
    card.dataset.nodeId = n.id;

    card.innerHTML = `
      <span class="node-icon">${icon}</span>
      <span class="node-name">${n.name}${isVisited && !isLocked ? ' <span style="font-size:0.65rem;color:var(--muted)">·</span>' : ''}</span>
      ${lockHint ? `<span class="node-lock-hint">${lockHint}</span>` : ''}
      ${!isLocked ? '<span class="node-arrow">›</span>' : ''}
    `;
    list.appendChild(card);
  });

  if (otherNodes.length === 0) {
    list.innerHTML = `<div style="color:var(--muted);font-size:0.82rem;font-style:italic;">No other locations accessible.</div>`;
  }
}

function renderActionButtons(node) {
  const list = document.getElementById('action-list');
  if (!list) return;
  list.innerHTML = '';

  // Talk to NPC
  if (node.npc_id) {
    const npc = getNpc(node.npc_id);
    if (npc) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary action-btn';
      btn.dataset.action = 'talk-npc';
      btn.dataset.npcId = node.npc_id;

      const prefix = npc.type === 'oracle' ? '✦ Consult' : '💬 Talk to';
      btn.textContent = `${prefix} ${npc.name}`;
      list.appendChild(btn);
    }
  }

  // Open Apothecary
  if (node.is_crafting_station) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary action-btn';
    btn.dataset.action = 'open-apothecary';
    btn.textContent = '⚗ Open Apothecary';
    list.appendChild(btn);
  }

  if (list.children.length === 0) {
    list.innerHTML = `<div style="color:var(--muted);font-size:0.82rem;font-style:italic;">Nothing to do here — travel to another location.</div>`;
  }
}
