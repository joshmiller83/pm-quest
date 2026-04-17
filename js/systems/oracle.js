// ── PM Quest: Oracle System ──────────────────────────────────

import { state, getNpc, hasItem } from '../state.js';
import { saveGame } from '../save.js';

export function showOracleConsult(npcId) {
  const npc = getNpc(npcId);
  if (!npc || npc.type !== 'oracle') return;

  const modal = document.getElementById('oracle-modal');
  const flavorEl = document.getElementById('oracle-flavor');
  const topicsEl = document.getElementById('oracle-topics');
  const hintBox = document.getElementById('oracle-hint-box');
  const backBtn = document.getElementById('oracle-back-btn');

  flavorEl.textContent = npc.flavor ?? '';

  // Reset state (clear any leftover inline styles from a previous session)
  hintBox.classList.add('hidden');
  backBtn.classList.add('hidden');
  topicsEl.style.display = '';
  topicsEl.innerHTML = '';

  // Find available topics: hints for items the player doesn't have
  const hints = npc.hints ?? [];
  const availableHints = hints.filter(h => !hasItem(h.trigger_missing_item));

  if (availableHints.length === 0) {
    topicsEl.innerHTML = `
      <div style="text-align:center;padding:1rem;color:var(--muted);font-style:italic;">
        The Oracle smiles. "You have found everything you were seeking — at least, for now."
      </div>`;
  } else {
    availableHints.forEach(hint => {
      const tier = state.oracleHintTiers[hint.trigger_missing_item] ?? 0;
      const itemData = state.chapter.items.find(i => i.id === hint.trigger_missing_item);
      const itemName = itemData?.name ?? hint.trigger_missing_item;

      const btn = document.createElement('button');
      btn.className = 'oracle-topic-btn';
      btn.innerHTML = `
        <span class="oracle-topic-name">About: ${itemName}</span>
        <span class="oracle-tier">${tier > 0 ? `Tier ${tier}/3` : 'Not yet asked'}</span>
      `;
      btn.addEventListener('click', () => showHint(npc, hint));
      topicsEl.appendChild(btn);
    });
  }

  modal.classList.add('open');
}

function showHint(npc, hint) {
  const topicsEl = document.getElementById('oracle-topics');
  const hintBox = document.getElementById('oracle-hint-box');
  const backBtn = document.getElementById('oracle-back-btn');

  const itemId = hint.trigger_missing_item;
  const tier = state.oracleHintTiers[itemId] ?? 0;

  // Advance tier (cap at 3)
  const nextTier = Math.min(tier + 1, 3);
  state.oracleHintTiers[itemId] = nextTier;
  saveGame();

  const hintText = hint[`tier_${nextTier}`] ?? hint.tier_3;

  topicsEl.style.display = 'none';
  hintBox.textContent = hintText;
  hintBox.classList.remove('hidden');
  backBtn.classList.remove('hidden');
}

export function handleOracleBack() {
  const topicsEl = document.getElementById('oracle-topics');
  const hintBox = document.getElementById('oracle-hint-box');
  const backBtn = document.getElementById('oracle-back-btn');

  topicsEl.style.display = '';
  hintBox.classList.add('hidden');
  backBtn.classList.add('hidden');
}

export function closeOracle() {
  document.getElementById('oracle-modal')?.classList.remove('open');
}
