// ── PM Quest: Main Entry Point ───────────────────────────────
// Bootstraps the game, wires up all systems, and handles
// event delegation for the entire UI.

import { state } from './state.js';
import { loadSave, saveGame } from './save.js';
import { fetchChapter, startNewGame, transitionToNextChapter } from './systems/loader.js';
import { renderAll } from './render.js';
import { renderInventory } from './systems/inventory.js';
import { navigateTo, registerNavigationDeps } from './systems/navigation.js';
import { showNpcDialog, handleDialogContinue, closeInfo } from './systems/dialog.js';
import { showOracleConsult, handleOracleBack, closeOracle } from './systems/oracle.js';
import { openApothecary, closeCrafting, pickInput, attemptCraft } from './systems/crafting.js';
import { startCombat, combatUseItem, combatStall, combatRetreat, closeItemPicker, registerCombatDeps } from './systems/combat.js';
import { registerTransitionFn } from './systems/win.js';

// ── Bootstrap ─────────────────────────────────────────────────

async function init() {
  // Wire cross-system dependencies (avoids circular imports)
  registerNavigationDeps(renderAll, startCombat);
  registerCombatDeps(renderAll);
  registerTransitionFn(async (nextFile) => {
    try {
      await transitionToNextChapter(nextFile);
      // renderAll fires after the player clicks Begin in the intro modal
    } catch (err) {
      console.error('Chapter transition failed:', err);
      showNoNextChapter();
    }
  });

  const resumeKey   = sessionStorage.getItem('pm_quest_resume');
  const chapterFile = sessionStorage.getItem('pm_quest_chapter');

  if (resumeKey) {
    const raw = localStorage.getItem(resumeKey);
    if (raw) {
      try {
        const save = JSON.parse(raw);
        const chapter = await fetchChapter(save.chapterFile);
        state.chapter = chapter;
        loadSave(save);
        renderAll();
        return;
      } catch (err) {
        console.error('Failed to load save:', err);
      }
    }
  }

  if (chapterFile) {
    try {
      const chapter = await fetchChapter(chapterFile);
      startNewGame(chapter, chapterFile);
    } catch (err) {
      showLoadError(err);
    }
    return;
  }

  // No session data (e.g. page refresh) — try the most recent localStorage save
  const latestSave = getMostRecentSave();
  if (latestSave) {
    try {
      const chapter = await fetchChapter(latestSave.chapterFile);
      state.chapter = chapter;
      loadSave(latestSave);
      renderAll();
      return;
    } catch (err) {
      console.error('Failed to restore save on refresh:', err);
    }
  }

  // Nothing to load — go home
  window.location.href = 'index.html';
}

// ── Event delegation ──────────────────────────────────────────

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    // Navigation
    case 'navigate':
      navigateTo(el.dataset.nodeId);
      break;

    // NPC / Oracle
    case 'talk-npc': {
      const npcId = el.dataset.npcId;
      const npc = state.chapter?.npcs?.find(n => n.id === npcId);
      if (npc?.type === 'oracle') {
        showOracleConsult(npcId);
      } else {
        showNpcDialog(npcId);
      }
      break;
    }

    // Dialog bar
    case 'dialog-continue':
      handleDialogContinue();
      break;

    // Apothecary
    case 'open-apothecary':
      openApothecary();
      break;
    case 'close-crafting':
      closeCrafting();
      break;
    case 'pick-input1':
      pickInput(1);
      break;
    case 'pick-input2':
      pickInput(2);
      break;
    case 'attempt-craft':
      attemptCraft();
      break;

    // Combat
    case 'combat-use-item':
      combatUseItem();
      break;
    case 'combat-stall':
      combatStall();
      break;
    case 'combat-retreat':
      combatRetreat();
      break;
    case 'close-item-picker':
      closeItemPicker();
      break;

    // Oracle
    case 'oracle-back':
      handleOracleBack();
      break;
    case 'close-oracle':
      closeOracle();
      break;

    // Info / modals
    case 'close-info':
      closeInfo();
      break;

    // Intro modal
    case 'begin-game':
      document.getElementById('intro-modal')?.classList.remove('open');
      renderAll();
      break;

    // Defeat
    case 'defeat-to-map':
      document.getElementById('defeat-modal')?.classList.remove('open');
      renderAll();
      break;
    // defeat-try-again is wired directly by combat.js

    // Next chapter (wired by win.js on demand)
    // case 'next-chapter': — handled by win.js
  }
});

// Inventory tab switching
document.getElementById('inventory-tabs')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.activeInventoryTab = btn.dataset.tab;
  renderInventory();
});

// Close modals on overlay click (except item-picker — too easy to mis-click)
['info-modal', 'oracle-modal', 'victory-modal'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.remove('open');
    }
  });
});

// Keyboard: Escape closes top-most open modal
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const modals = [...document.querySelectorAll('.modal-overlay.open')];
  if (modals.length > 0) {
    // Close the one with the highest z-index last (item picker is 300)
    const top = modals.sort((a, b) =>
      parseInt(getComputedStyle(b).zIndex || 200) -
      parseInt(getComputedStyle(a).zIndex || 200)
    )[0];
    // Don't let Escape close combat or victory
    if (!['combat-modal', 'victory-modal'].includes(top.id)) {
      top.classList.remove('open');
    }
  }
});

// ── Error states ──────────────────────────────────────────────

function showLoadError(err) {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;padding:2rem;">
      <div class="error-state" style="max-width:480px;text-align:center;">
        <div style="font-size:2rem;margin-bottom:1rem">⚠️</div>
        <strong>Failed to load chapter</strong><br><br>
        ${err.message}<br><br>
        Make sure you're running a local server:<br>
        <code>python3 -m http.server 8000</code><br><br>
        <a href="index.html" style="color:var(--gold)">← Back to menu</a>
      </div>
    </div>`;
}

function getMostRecentSave() {
  const saves = Object.keys(localStorage)
    .filter(k => k.startsWith('pm_quest_save_'))
    .map(k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } })
    .filter(s => s?.chapterFile);
  if (saves.length === 0) return null;
  saves.sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
  return saves[0];
}

function showNoNextChapter() {
  const btn = document.querySelector('[data-action="next-chapter"]');
  if (btn) {
    btn.textContent = '✓ More chapters coming soon!';
    btn.disabled = true;
  }
}

// ── Start ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
