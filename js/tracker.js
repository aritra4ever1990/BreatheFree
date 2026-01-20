
// BreatheFree — craving timer, achievements, AI insights, charts, CSV export
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

    // DOM
    const dateInput = $('dateInput');
    const countNumber = $('countNumber');
    const decrementBtn = $('decrementBtn');
    const incrementBtn = $('incrementBtn');
    const addNowBtn = $('addNowBtn');
    const datetimeInput = $('datetimeInput');
    const addAtBtn = $('addAtBtn');
    const exportBtn = $('exportBtn');
    const exportEventsToolbarBtn = $('exportEventsBtn');
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

    // Ach modal
    const achModal = $('achModal');
    const closeAchModalBtn = $('closeAchModal');
    const saveAchBtn = $('saveAchBtn');
    const cancelAchBtn = $('cancelAchBtn');
    const achReasonInput = $('achReason');
    const achLocationInput = $('achLocation');

    // Settings modal
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

    // AI
    const aiList = $('aiList');
    const ai2minBtn = $('ai2minBtn');

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
    window.showToast = showToast;

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

    // CSV (Excel-compatible)
    function exportCSV() {
      const events = loadEvents();
      const rows = [['id', 'timestamp', 'date',Absolutely, Aritra—here are the **fully replaceable files** with your requested updates:

- ✅ **Recent events list removed** — only a clean **Export to Excel** button remains.
- ✅ **AI Insights** section added (local-only, motivational & actionable).
- ✅ **Achievements & Craving Analytics** moved to a **separate section below the Smoke Log** for a balanced layout.
- ✅ Keeps the **animated background** and **bigger buttons**.
- ✅ Adds **Export to Excel (.xlsx)** using a client-side library (no server needed).

> Copy these four files into your repo root and re-deploy GitHub Pages.

---

## `index.html`
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>BreatheFree — Cigarette Tracker</title>
  <meta name="description" content="Track your daily cigarette intake locally. Craving timer, achievements, charts, AI insights, and Excel export." />
  <meta name="theme-color" content="#00a8ff" />

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="favicon.svg" />
  <!-- Styles -->
  <link rel="stylesheet" href="styles.css" />

  <!-- Chart.js (charts) -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <!-- SheetJS (Excel export) -->
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>

  <!-- App script -->
  <script src="tracker.js" defer></script>
</head>
<body>
  <!-- Bright animated background (decorative only) -->
  <div class="bg-anim" aria-hidden="true">
    <span class="blob b1"></span>
    <span class="blob b2"></span>
    <span class="blob b3"></span>
    <span class="blob b4"></span>
    <span class="blob b5"></span>
  </div>

  <div class="app">
    <header class="topbar">
      <div class="brand">
        <img src="favicon.svg" class="logo" alt="BreatheFree logo" />
        <div class="title-wrap">
          <h1>BreatheFree</h1>
          <p class="subtitle">Track your daily cigarette intake — stored locally</p>
        </div>
      </div>

      <div class="top-actions">
        <button id="openSettingsBtn" class="btn circle" title="Settings" aria-label="Open settings">⚙</button>
        <label for="fileImport" class="btn outline" role="button" aria-label="Import from CSV">Import</label>
        <input id="fileImport" type="file" accept=".csv" hidden>
        <button id="exportBtn" class="btn outline">Export Excel</button>
      </div>
    </header>

    <!-- ===== Row 1: Smoke Log (left) + Charts (right) ===== -->
    <main class="main">
      <section class="hero">
        <!-- Smoke Log -->
        <div class="hero-left card">
          <div class="date-row">
            <label for="dateInput">Date</label>
            <input id="dateInput" type="date" />
          </div>

          <div class="counter-display">
            <div>
              <div class="big-count" id="countNumber">0</div>
              <div class="small-label">Cigarettes today</div>
            </div>

            <div class="money-box card-compact">
              <div class="muted">Money spent</div>
              <div id="moneySpent" class="money-amount">$0.00</div>
              <div class="muted">Saved</div>
              <div id="savedAmount" class="money-amount">$0.00</div>
            </div>
          </div>

          <div class="controls">
            <button id="decrementBtn" class="btn huge secondary" aria-label="Remove last for selected date">−</button>
            <button id="addNowBtn" class="btn huge primary">Log Now</button>
            <button id="incrementBtn" class="btn huge secondary" aria-label="Log another now">+</button>
          </div>

          <!-- Craving controls -->
          <div class="craving-row">
            <button id="startCravingBtn" class="btn huge accent">Start Craving</button>
            <button id="stopCravingBtn" class="btn huge outline" disabled>Stop</button>
            <div id="cravingTimer" class="craving-timer" aria-live="polite"></div>
          </div>

          <div class="manual-row">
            <input id="datetimeInput" type="datetime-local" />
            <button id="addAtBtn" class="btn large">Add at time</button>
            <button id="undoBtn" class="btn large outline" disabled>Undo</button>
            <button id="clearBtn" class="btn large danger">Clear</button>
          </div>

          <div class="quick-stats">
            <div>
              <div class="stat-label">7-day avg</div>
              <div class="stat-value" id="avg7">0</div>
            </div>
            <div>
              <div class="stat-label">30-day avg</div>
              <div class="stat-value" id="avg30">0</div>
            </div>
            <div>
              <div class="stat-label">Total logged</div>
              <div class="stat-value" id="totalLogged">0</div>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div class="hero-right card">
          <h3 class="chart-heading">Progress (last 7 days)</h3>
