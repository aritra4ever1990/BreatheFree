
// BreatheFree — craving timer, achievements, stacked toasts, confetti,
// charts, streaks, AI-like insights (local), Excel export (.xls)
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    // Keys
    const EVENTS_KEY = 'breathefree:events';
    const SETTINGS_KEY = 'breathefree:settings';
    const UNDO_KEY = 'breathefree:undo';
    const ACH_KEY = 'breathefree:achievements';
    const CRAVING_KEY = 'breathefree:craving';

    // Helpers
    const $ = id => document.getElementById(id);
    const isoDate = (d = new Date()) => d.toISOString().slice(0, 10);
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const escapeHTML = (s='') => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

    // DOM
    const dateInput = $('dateInput');
    const countNumber = $('countNumber');
    const decrementBtn = $('decrementBtn');
    const incrementBtn = $('incrementBtn');
    const addNowBtn = $('addNowBtn');
    const datetimeInput = $('datetimeInput');
    const addAtBtn = $('addAtBtn');
    const exportBtn = $('exportBtn');
    const fileImport = $('fileImport');
    const clearBtn = $('clearBtn');
    const undoBtn = $('undoBtn');
    const avg7El = $('avg7');
    const avg30El = $('avg30');
    const totalLoggedEl = $('totalLogged');
    const moneySpentEl = $('moneySpent');
    const savedAmountEl = $('savedAmount');

    const startCravingBtn = $('startCravingBtn');
    const stopCravingBtn = $('stopCravingBtn');
    const cravingTimerEl = $('cravingTimer');

    const awardsList = $('awardsList');
    const achCount = $('achCount');
    const cravingsTodayEl = $('cravingsToday');
    const cravingsWeekEl = $('cravingsWeek');
    const currentStreakEl = $('currentStreak');
    const bestStreakEl = $('bestStreak');

    // Ach modal elements
    const achModal = $('achModal');
    const closeAchModalBtn = $('closeAchModal');
    const saveAchBtn = $('saveAchBtn');
    const cancelAchBtn = $('cancelAchBtn');
    const achReasonInput = $('achReason');
    const achLocationInput = $('achLocation');

    // Settings modal elements
    const openSettingsBtn = $('openSettingsBtn');
    const settingsModal = $('settingsModal');
    const closeSettingsBtn = $('closeSettingsBtn');
    const saveSettingsBtn = $('saveSettingsBtn');
    const resetSettingsBtn = $('resetSettingsBtn');
    const cigPriceInput = $('cigPrice');
    const dailyTargetInput = $('dailyTarget');
    const currencyInput = $('currency');
    const cravingDurationInput = $('cravingDuration');
    const streakTargetInput = $('streakTarget');

    // charts
    const weeklyCanvas = $('weeklyChart');
    const monthlyCanvas = $('monthlyChart');
    const sparklineCanvas = $('sparkline');
    let weeklyChart = null;
    let monthlyChart = null;
    let sparkChart = null;

    // insights
    const insightsList = $('insightsList');
    const refreshInsightsBtn = $('refreshInsightsBtn');

    // export to Excel
    const exportExcelBtn = $('exportExcelBtn');

    // toast container
    const toastContainer = $('toastContainer');

    let lastCravingTimerInterval = null;
    let activeAchievementId = null;

    // Storage helpers
    const loadEvents = () => { try { const r = localStorage.getItem(EVENTS_KEY); return r ? JSON.parse(r) : []; } catch { return []; } };
    const saveEvents = (e) => localStorage.setItem(EVENTS_KEY, JSON.stringify(e));

    const defaultSettings = { price: 0.5, dailyTarget: 10, currency: '$', cravingDuration: 5, streakTarget: 7 };
    const loadSettings = () => { try { const r = localStorage.getItem(SETTINGS_KEY); return r ? Object.assign({}, defaultSettings, JSON.parse(r)) : { ...defaultSettings }; } catch { return { ...defaultSettings }; } };
    const saveSettings = (s) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

    const loadAchievements = () => { try { const r = localStorage.getItem(ACH_KEY); return r ? JSON.parse(r) : []; } catch { return []; } };
    const saveAchievements = (a) => localStorage.setItem(ACH_KEY, JSON.stringify(a));

    const loadCraving = () => { try { const r = localStorage.getItem(CRAVING_KEY); return r ? JSON.parse(r) : { endTs: null }; } catch { return { endTs: null }; } };
    const saveCraving = (c) => localStorage.setItem(CRAVING_KEY, JSON.stringify(c));

    const pushUndo = (p) => { localStorage.setItem(UNDO_KEY, JSON.stringify({ payload: p, ts: new Date().toISOString() })); if (undoBtn) undoBtn.disabled = false; };
    const popUndo = () => { const r = localStorage.getItem(UNDO_KEY); if (!r) return null; localStorage.removeItem(UNDO_KEY); if (undoBtn) undoBtn.disabled = true; return JSON.parse(r).payload; };

    // Toasts (stacking)
    function showToast(message, { timeout = 5000, actionText = null, action = null } = {}) {
      if (!toastContainer) return;
      const t = document.createElement('div'); t.className = 'toast';
      const msg = document.createElement('div'); msg.className = 'msg'; msg.textContent = message;
      const actions = document.createElement('div'); actions.className = 'actions';
      if (actionText && action) {
        const btn = document.createElement('button'); btn.className = 'btn-small-primary'; btn.textContent = actionText;
        btn.addEventListener('click', () => { action(); remove(); });
        actions.appendChild(btn);
      }
      const close = document.createElement('button'); close.className = 'btn-small-outline'; close.textContent = 'Close';
      close.addEventListener('click', remove);
      actions.appendChild(close);
      t.appendChild(msg); t.appendChild(actions);
      toastContainer.prepend(t);
      let dismissed = false;
      function remove() { if (dismissed) return; dismissed = true; t.style.opacity = 0; setTimeout(() => { try { toastContainer.removeChild(t); } catch { } }, 220); }
      setTimeout(remove, timeout);
      return t;
    }
    window.showToast = showToast; // optional for debugging

    // Events
    function addEvent(ts = new Date().toISOString()) {
      if (isCravingActive()) { showToast('Craving active — cannot log now.', { timeout: 3000 }); return; }
      const events = loadEvents();
      events.push({ id: uid(), ts });
      events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
      saveEvents(events);
      render();
    }
    function removeEvent(id) {
      const events = loadEvents(); const idx = events.findIndex(e => e.id === id); if (idx === -1) return;
      const removed = events.splice(idx, 1)[0]; pushUndo({ action: 'delete', event: removed }); saveEvents(events); render();
    }
    function clearAll() {
      const events = loadEvents(); if (!events.length) return;
      pushUndo({ action: 'clear', events }); localStorage.removeItem(EVENTS_KEY); render();
    }

    // CSV
    function importCSVLove the direction! I’ve implemented all three changes and packed them into **fully replaceable files** you can drop into your repo (root level):

- ✅ **Remove Recent events list** and show only an **Export to Excel** button (creates a real Excel-compatible `.xls` file—no extra libs).
- ✅ **Add an “AI Insights (local)” section** with motivating, data‑driven insights based on your logs, streaks, and savings (all computed locally—no network/AI calls).
- ✅ **Move “Achievements & Craving analytics” into its own section** below the smoke log for a balanced layout.
- ✅ Keep the **animated background** and **larger, tappable buttons**.

> **Files to paste** (root):
