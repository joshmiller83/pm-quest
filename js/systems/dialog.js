// ── PM Quest: Dialog System ──────────────────────────────────

import { state, getNpc, hasItem } from '../state.js';
import { addItem } from './inventory.js';

// ── Dialog bar ───────────────────────────────────────────────

let _onContinue = null;

export function showDialog(npcName, text, avatarChar, onContinue) {
  const bar = document.getElementById('dialog-bar');
  const nameEl = document.getElementById('dialog-npc-name');
  const textEl = document.getElementById('dialog-text');
  const avatarEl = document.getElementById('dialog-avatar');

  if (!bar) return;

  nameEl.textContent = npcName;
  textEl.textContent = text;
  avatarEl.textContent = avatarChar ?? npcName.charAt(0).toUpperCase();
  _onContinue = onContinue ?? null;
  bar.classList.remove('hidden');

  // Ensure game area has padding for the fixed dialog bar
  document.getElementById('game-area').style.paddingBottom = '80px';
}

export function hideDialog() {
  const bar = document.getElementById('dialog-bar');
  if (bar) bar.classList.add('hidden');
  document.getElementById('game-area').style.paddingBottom = '';
  _onContinue = null;
}

export function handleDialogContinue() {
  const cb = _onContinue;
  hideDialog();
  if (cb) cb();
}

// ── NPC dialog ───────────────────────────────────────────────

export function showNpcDialog(npcId) {
  const npc = getNpc(npcId);
  if (!npc) return;

  // Evaluate conditional dialog (first match wins)
  let text = npc.default_dialog ?? '';
  if (npc.conditional_dialog?.length) {
    for (const entry of npc.conditional_dialog) {
      if (hasItem(entry.condition_item)) {
        text = entry.dialog;
        break;
      }
    }
  }

  // Grant item on first talk
  if (npc.grants_item_on_talk && !hasItem(npc.grants_item_on_talk)) {
    addItem(npc.grants_item_on_talk);
  }

  const avatar = npc.type === 'oracle' ? '✦' : npc.name.charAt(0).toUpperCase();

  // Build NPC type label
  let nameDisplay = npc.name;
  if (npc.type === 'opa') nameDisplay += ' (OPA)';

  showDialog(nameDisplay, text, avatar, () => {
    // After dialog: if OPA with constraint, show info box
    if (npc.type === 'opa' && npc.imposes_constraint) {
      const input = npc.imposes_constraint.required_additional_input;
      const itemData = state.chapter.items.find(i => i.id === input);
      const itemName = itemData?.name ?? input;
      showInfo(
        '⚠ PMO Constraint Active',
        `${npc.name} has imposed an organizational requirement: <strong>${itemName}</strong> must be included when performing certain recipes. Visit the Apothecary — you'll see a warning when it applies.`
      );
    }
  });
}

// ── Info modal ───────────────────────────────────────────────

export function showInfo(title, bodyHtml, icon = 'ℹ️') {
  const modal = document.getElementById('info-modal');
  if (!modal) return;
  document.getElementById('info-icon').textContent = icon;
  document.getElementById('info-title').textContent = title;
  document.getElementById('info-body').innerHTML = bodyHtml;
  modal.classList.add('open');
}

export function closeInfo() {
  document.getElementById('info-modal')?.classList.remove('open');
}
