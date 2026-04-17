// ── PM Quest: Win Condition & Victory ────────────────────────

import { state } from '../state.js';
import { saveGame } from '../save.js';

let _transitionFn = null;

// Called from main.js to inject the chapter-transition function
// (avoids a circular import between win.js and loader.js)
export function registerTransitionFn(fn) {
  _transitionFn = fn;
}

export function checkWinCondition() {
  if (!state.chapter) return;
  const wc = state.chapter.win_condition;
  if (!wc) return;

  let won = false;
  if (wc.type === 'hold_item') {
    won = state.inventory.includes(wc.item_id);
  }

  if (won) showVictory(wc);
}

function showVictory(wc) {
  const el = document.getElementById('victory-text');
  if (el) el.textContent = wc.victory_text ?? 'You have completed this chapter!';

  // Wire the "next chapter" button
  const btn = document.querySelector('[data-action="next-chapter"]');
  if (btn) {
    // Replace with a fresh clone to remove any old listeners
    const clone = btn.cloneNode(true);
    btn.replaceWith(clone);
    clone.addEventListener('click', async () => {
      if (!wc.next_chapter) {
        clone.textContent = '✓ That\'s all for now — more chapters coming soon!';
        clone.disabled = true;
        return;
      }
      if (_transitionFn) {
        closeModal('victory-modal');
        await _transitionFn(`chapters/${wc.next_chapter}`);
      }
    });
  }

  openModal('victory-modal');
  saveGame();

  // Disable all in-game interaction
  document.querySelectorAll('.node-card, .action-btn').forEach(el => {
    el.style.pointerEvents = 'none';
    el.style.opacity = '0.4';
  });
}

// ── Modal helpers (duplicated here to avoid import cycle) ────

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}
