
// BreatheFree — minute-level tracking helpers, craving timer,
// achievements, charts, insights, Excel export (SpreadsheetML).
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
    const exportEventsBtn = $('exportEventsBtn');
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

    // Insights
    const refreshInsightsBtn = $('refreshInsightsBtn');
    const insightsList = $('insightsList');

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
    const hourHeatmapWrap = $('hourHeatmap');
    let weeklyChart = null;
    let monthlyChart = null;
    let sparkChart = null;

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

    // ===== Events =====
    function addEvent(ts = new Date().toISOString()) {
      if (isCravingActive()) { showToast('Craving active — cannot log now.', { timeout: 3000 }); return; }
      const events = loadEvents();
      events.push({ id: uid(), ts });
      events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
      saveEvents(events);
      render();
    }
    function removeEventForDate(dateISO){
      const events = loadEvents();
      const idx = events.findIndex(e => e.ts.slice(0,10) === dateISO);
      if (idx === -1) return false;
      const removed = events.splice(idx,1)[0];
      pushUndo({ action:'delete', event: removed });
      saveEvents(events);
      return true;
    }
    function clearAll() {
      const events = loadEvents(); if (!events.length) return;
      pushUndo({ action: 'clear', events }); localStorage.removeItem(EVENTS_KEY); render();
    }

    // ===== CSV / Excel export =====
    function exportCSV() {
      const events = loadEvents();
      const rows = [['id', 'timestamp', 'date']];
      events.forEach(e => rows.push([e.id, e.ts, e.ts.slice(0, 10)]));
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href =Absolutely, Aritra — here are your **fully updated, copy‑paste ready** files with:

- ✅ **Buttons fixed** (proper script tags & event wiring)
- ✅ **Recent events list hidden** — only a **single “Export to Excel”** button
- ✅ **New “AI Insights”** card (local, private, motivational insights)
- ✅ **New full‑width “Achievements & Craving Analytics”** card **below the Smoke Log**
- ✅ **Animated bright background** (CSS-only, performant)
- ✅ Optional **Hourly Heatmap** added (helps minute-level tracking)
- ✅ **Bigger buttons** and improved accessibility/contrast

> **Usage:** Create/replace these three files at your repo root:
> ```
> index.html
> styles.css
> tracker.js
> ```
> (Your existing `favicon.svg` still works.)

---

## `index.html`
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>BreatheFree — Cigarette Tracker</title>
  <meta name="description" content="Track your daily cigarette intake locally in your browser. Craving timer, achievements, charts, and Excel export." />
  <meta name="theme-color" content="#00a8ff" />

  <!-- Favicon -->
  <link rel="icon" href="favicon.svg" type="image/svg+xml"/>

  <!-- Styles -->
  <link rel="stylesheet" href="styles.css" />

  <!-- Chart.js (for charts) -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" defer></script>

  <!-- SheetJS (for Excel .xlsx export) -->
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" defer></script>

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
        <img src="favicon.svg" class="logo" alt="BreatheFree" />
        <div class="title-wrap">
          <h1>BreatheFree</h1>
          <p class="subtitle">Track your daily cigarette intake — stored locally</p>
        </div>
      </div>

      <div class="top-actions">
        <button id="openSettingsBtn" class="btn circle" title="Settings" aria-label="Open settings">⚙</button>
        <label for="fileImport" class="btn outline" role="button" aria-label="Import from CSV">Import</label>
        <input id="fileImport" type="file" accept=".csv" hidden>
        <button id="exportBtn" class="btn outline">Export CSV</button>
      </div>
    </header>

    <main class="main">
      <!-- ===== Row 1: Smoke Log (left) + Charts (right) ===== -->
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
          <canvas id="weeklyChart" height="140" aria-label="Weekly bar chart" role="img"></canvas>

          <h3 class="chart-heading mt">Monthly trend (30 days)</h3>
          <canvas id="monthlyChart" height="140" aria-label="Monthly line chart" role="img"></canvas>

          <div class="card-compact mt">
            <h3 class="chart-heading">Hourly Heatmap (last 30 days)</h3>
            <div id="hourHeatmap" class="heatmap" aria-label="Hourly heatmap"></div>
            <small class="muted">Darker = more logs in that hour.</small>
          </div>
        </div>
      </section>

      <!-- ===== Row 2: Achievements & Craving Analytics (full width) ===== -->
      <section class="card">
        <h2>Achievements &amp; Craving analytics</h2>

        <div class="awards card-compact mt">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>Achievements</strong>
            <small id="achCount">0</small>
          </div>
          <ul id="awardsList" class="awards-list"></ul>
        </div>

        <div class="analytics card-compact mt">
          <strong>Craving analytics</strong>
          <div class="analytics-row">
            <div>
              <div class="muted">Resisted today</div>
              <div id="cravingsToday" class="stat-value">0</div>
            </div>
            <div>
              <div class="muted">Resisted this week</div>
              <div id="cravingsWeek" class="stat-value">0</div>
            </div>
            <div>
              <div class="muted">Current streak</div>
              <div id="currentStreak" class="stat-value">0</div>
            </div>
            <div>
              <div class="muted">Best streak</div>
              <div id="bestStreak" class="stat-value">0</div>
            </div>
          </div>

          <div class="sparkline-row mt">
            <canvas id="sparkline" height="50" aria-label="Achievements sparkline" role="img"></canvas>
          </div>
        </div>
      </section>

      <!-- ===== Row 3: AI Insights ===== -->
      <section class="card">
        <h2>AI Insights</h2>
        <p class="muted">Private, on-device insights to help you reduce cravings and build streaks.</p>
        <ul id="aiInsightsList" class="insights-list"></ul>

        <div class="insight-actions">
          <button id="start2minBtn" class="btn primary large">Start 2‑min craving</button>
          <button id="start5minBtn" class="btn accent large">Start 5‑min craving</button>
        </div>
      </section>

      <!-- ===== Row 4: Data tools (no recent events list; export only) ===== -->
      <section class="card data-tools">
        <div class="data-tools-row">
          <div class="muted">Export your data</div>
          <div class="data-actions">
            <button id="exportXlsxBtn" class="btn primary">Export Events (Excel)</button>
            <button id="exportBtn2" class="btn outline">Export Events (CSV)</button>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">Stored locally in your browser • No external servers</footer>
  </div>

  <!-- Achievement details modal -->
  <div id="achModal" class="modal hidden" role="dialog" aria-modal="true" aria-hidden="true">
    <div class="modal-card">
      <header class="modal-header">
        <h3>Edit achievement</h3>
        <button id="closeAchModal" class="btn circle" aria-label="Close achievement modal">✕</button>
      </header>
      <div class="modal-body">
        <div class="form-row">
          <label for="achReason">Reason (optional)</label>
          <input id="achReason" type="text" placeholder="e.g. stress, after-meal" />
        </div>
        <div class="form-row">
          <label for="achLocation">Location (optional)</label>
          <input id="achLocation" type="text" placeholder="e.g. home, bar" />
        </div>
      </div>
      <footer class="modal-footer">
        <button id="saveAchBtn" class="btn primary">Save</button>
        <button id="cancelAchBtn" class="btn outline">Cancel</button>
      </footer>
    </div>
  </div>

  <!-- Settings Modal -->
  <div id="settingsModal" class="modal hidden" role="dialog" aria-modal="true" aria-hidden="true">
    <div class="modal-card">
      <header class="modal-header">
        <h3>Settings</h3>
        <button id="closeSettingsBtn" class="btn circle" aria-label="Close settings">✕</button>
      </header>

      <div class="modal-body">
        <div class="form-row">
          <label for="cigPrice">Cigarette price (per stick)</label>
          <input id="cigPrice" type="number" min="0" step="0.01" placeholder="0.50" />
        </div>

        <div class="form-row">
          <label for="dailyTarget">Daily target (sticks)</label>
          <input id="dailyTarget" type="number" min="0" step="1" placeholder="10" />
        </div>

        <div class="form-row">
          <label for="currency">Currency symbol</label>
          <input id="currency" type="text" maxlength="4" placeholder="$" />
        </div>

        <div class="form-row">
          <label for="cravingDuration">Craving duration (minutes)</label>
          <input id="cravingDuration" type="number" min="1" max="60" step="1" placeholder="5" />
        </div>

        <div class="form-row">
          <label for="streakTarget">Streak target (days for reward)</label>
          <input id="streakTarget" type="number" min="1" max="365" step="1" placeholder="7" />
        </div>
      </div>

      <footer class="modal-footer">
        <button id="saveSettingsBtn" class="btn primary huge">Save settings</button>
        <button id="resetSettingsBtn" class="btn large outline">Reset</button>
      </footer>
    </div>
  </div>

  <!-- Toast container (stacked toasts) -->
  <div id="toastContainer" aria-live="polite" aria-atomic="false"></div>
</body>
</html>
