// ── PM Quest: Crafting / Apothecary System ───────────────────

import { state, getItem, getNpc, hasItem } from '../state.js';
import { saveGame } from '../save.js';
import { addItem, removeItem } from './inventory.js';
import { openItemPicker } from './combat.js';

let _slot1 = null; // item id or null
let _slot2 = null; // item id or null

// ── Open apothecary ──────────────────────────────────────────

export function openApothecary() {
  _slot1 = null;
  _slot2 = null;

  // Populate technique dropdown
  const select = document.getElementById('craft-technique');
  select.innerHTML = '<option value="">— Select Technique —</option>';
  (state.chapter.techniques ?? []).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    select.appendChild(opt);
  });

  // Set apothecary NPC dialog flavor
  const apothNpc = state.chapter.npcs?.find(n => n.id === 'apothecary_npc');
  const flavorEl = document.getElementById('apothecary-npc-dialog');
  if (flavorEl && apothNpc) {
    let text = apothNpc.default_dialog;
    if (apothNpc.conditional_dialog?.length) {
      for (const cd of apothNpc.conditional_dialog) {
        if (hasItem(cd.condition_item)) { text = cd.dialog; break; }
      }
    }
    flavorEl.textContent = `"${text}"`;
  }

  resetSlotUI('slot-input1', null);
  resetSlotUI('slot-input2', null);
  document.getElementById('craft-output').className = 'craft-output';
  document.getElementById('craft-output').textContent = 'Select inputs and a technique, then attempt the craft.';
  document.getElementById('opa-warning').classList.add('hidden');

  document.getElementById('crafting-modal').classList.add('open');
}

export function closeCrafting() {
  document.getElementById('crafting-modal')?.classList.remove('open');
}

// ── Slot picking ─────────────────────────────────────────────

export function pickInput(slotNumber) {
  const inventoryItems = state.inventory.map(id => getItem(id)).filter(Boolean);
  const allowEmpty = slotNumber === 2;
  const title = slotNumber === 1 ? 'Choose Input 1:' : 'Choose Input 2 (or none):';

  openItemPicker(title, inventoryItems, (itemId) => {
    if (slotNumber === 1) {
      _slot1 = itemId;
      resetSlotUI('slot-input1', itemId);
    } else {
      _slot2 = itemId;
      resetSlotUI('slot-input2', itemId);
    }
    updateOpaWarning();
  }, allowEmpty);
}

function resetSlotUI(slotId, itemId) {
  const btn = document.getElementById(slotId);
  if (!btn) return;
  if (!itemId) {
    btn.className = 'craft-slot-btn';
    btn.innerHTML = '<span>+ Pick Item</span>';
  } else {
    const item = getItem(itemId);
    const icon = item?.type === 'artifact' ? '📄' : item?.type === 'resource' ? '🪨' : '🗑️';
    btn.className = 'craft-slot-btn slot-filled';
    btn.innerHTML = `
      <span class="craft-slot-filled-icon">${icon}</span>
      <span class="craft-slot-filled-name">${item?.name ?? itemId}</span>
    `;
  }
}

// ── OPA warning display ──────────────────────────────────────

function updateOpaWarning() {
  const warningEl = document.getElementById('opa-warning');
  const techniqueId = document.getElementById('craft-technique').value;

  const warnings = getActiveOpaConstraints();
  if (warnings.length === 0) {
    warningEl.classList.add('hidden');
    return;
  }
  warningEl.classList.remove('hidden');
  warningEl.innerHTML = warnings.map(w =>
    `⚠ <strong>${w.npcName}</strong> requires <strong>${w.itemName}</strong> for certain recipes.`
  ).join('<br>');
}

function getActiveOpaConstraints() {
  const results = [];
  (state.chapter.npcs ?? []).forEach(npc => {
    if (!npc.imposes_constraint) return;
    const { required_additional_input } = npc.imposes_constraint;
    if (!hasItem(required_additional_input)) {
      const itemData = getItem(required_additional_input);
      results.push({ npcName: npc.name, itemName: itemData?.name ?? required_additional_input });
    }
  });
  return results;
}

// ── Attempt craft ────────────────────────────────────────────

export function attemptCraft() {
  const techniqueId = document.getElementById('craft-technique').value;
  const outputEl = document.getElementById('craft-output');

  if (!_slot1) {
    showCraftOutput('fail', null, 'Select at least one input item before crafting.');
    return;
  }
  if (!techniqueId) {
    showCraftOutput('fail', null, 'Select a technique before crafting.');
    return;
  }

  const inputs = [_slot1, _slot2].filter(Boolean);
  const recipe = lookupRecipe(inputs, techniqueId);

  if (!recipe) {
    const hint = getFailureHint(inputs, techniqueId);
    showCraftOutput('fail', null, hint);
    return;
  }

  // OPA constraint check
  for (const npc of (state.chapter.npcs ?? [])) {
    if (!npc.imposes_constraint) continue;
    const { recipe_id, required_additional_input } = npc.imposes_constraint;
    if (recipe_id === recipe.id && !hasItem(required_additional_input)) {
      const item = getItem(required_additional_input);
      showCraftOutput('fail', null,
        `⚠ ${npc.name} requires ${item?.name ?? required_additional_input} for this process. Visit ${npc.name} first.`
      );
      return;
    }
  }

  // EEF constraint check
  const activeEefs = getActiveEefs();
  for (const eef of activeEefs) {
    if (eef.effect?.type === 'required_input') {
      if (eef.effect.recipe_ids?.includes(recipe.id)) {
        const extra = eef.effect.additional_required_input;
        if (!hasItem(extra)) {
          const item = getItem(extra);
          showCraftOutput('fail', null,
            `${eef.name}: ${eef.flavor_text ?? `You need ${item?.name ?? extra} to proceed.`}`
          );
          return;
        }
      }
    }
  }

  // Success!
  addItem(recipe.output);
  if (recipe.consume_inputs) {
    inputs.forEach(id => removeItem(id));
    _slot1 = null;
    _slot2 = null;
    resetSlotUI('slot-input1', null);
    resetSlotUI('slot-input2', null);
  }
  saveGame();

  const outItem = getItem(recipe.output);
  showCraftOutput('success', outItem, recipe.success_dialog ?? `${outItem?.name ?? recipe.output} created!`);
}

// ── Recipe lookup ─────────────────────────────────────────────

function lookupRecipe(inputs, technique) {
  const sortedInputs = [...inputs].sort();
  return (state.chapter.recipes ?? []).find(r => {
    const recipeInputs = [...r.inputs].sort();
    return (
      recipeInputs.join(',') === sortedInputs.join(',') &&
      r.technique === technique
    );
  }) ?? null;
}

// ── Failure hints ─────────────────────────────────────────────

function getFailureHint(inputs, techniqueId) {
  const sortedInputs = [...inputs].sort();
  const recipes = state.chapter.recipes ?? [];

  // Inputs match but technique is wrong
  const wrongTech = recipes.find(r =>
    [...r.inputs].sort().join(',') === sortedInputs.join(',')
  );
  if (wrongTech) return wrongTech.failure_hints?.wrong_technique
    ?? 'Those inputs are part of a real process, but you\'re using the wrong technique.';

  // Technique matches but inputs are wrong
  const wrongInputs = recipes.find(r => r.technique === techniqueId);
  if (wrongInputs) return wrongInputs.failure_hints?.wrong_inputs
    ?? 'That technique applies to a real process, but those aren\'t the right inputs.';

  return 'That combination doesn\'t produce anything. Think about which PMI process you\'re trying to perform.';
}

// ── EEF helpers ──────────────────────────────────────────────

function getActiveEefs() {
  return (state.chapter.eefs ?? []).filter(eef => {
    if (eef.scope === 'global') return true;
    if (eef.scope === 'node') return eef.affected_node === state.currentNode;
    return false;
  });
}

export function getActiveEefsForNode(nodeId) {
  return (state.chapter.eefs ?? []).filter(eef => {
    if (eef.scope === 'global') return true;
    if (eef.scope === 'node') return eef.affected_node === nodeId;
    return false;
  });
}

// ── Output display ────────────────────────────────────────────

function showCraftOutput(type, item, message) {
  const el = document.getElementById('craft-output');
  if (type === 'success') {
    const icon = item?.type === 'artifact' ? '📄' : item?.type === 'resource' ? '🪨' : '📋';
    el.className = 'craft-output output-success';
    el.innerHTML = `
      <div class="craft-output-title">✓ ${icon} ${item?.name ?? 'Item Created'}</div>
      <div class="craft-output-dialog">${message}</div>
    `;
  } else {
    el.className = 'craft-output output-fail';
    el.innerHTML = `
      <div>⚠ That didn't work.</div>
      <div class="craft-output-dialog">${message}</div>
    `;
  }
}
