
// BreatheFree — craving timer, achievements, stacked toasts, analytics + sparkline, Excel export
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    // Storage keys
    const EVENTS_KEY   = 'breathefree:events';
    const SETTINGS_KEY = 'breathefree:settings';
    const UNDO_KEY     = 'breathefree:undo';
    const ACH_KEY      = 'breathefree:achievements';
    const CRAVING_KEY  = 'breathefree:craving';

    // Helpers
    const $ = id => document.getElementById(id);
    const isoDate = (d = new Date()) => d.toISOString().slice(0, 10);
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const clamp = (n, a, b)=> Math.max(a, Math.min(b, n));

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

    const insightsList = $('insightsList');
    const insightCravingBtn = $('insightCravingBtn');
    const insightExportBtn = $('insightExportBtn');

    // Modal
    const achModal = $('achModal');
    const closeAchModalBtn = $('closeAchModal');
    const saveAchBtn = $('saveAchBtn');
    const cancelAchBtn = $('cancelAchBtn');
    const achReasonInput = $('achReason');
    const achLocationInput = $('achLocation');

    // Settings modal
    const openSettingsBtn = $('openSettingsBtn');
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

    // toast container
    const toastContainer = $('toastContainer');

    let lastCravingTimerInterval = null;
    let activeAchievementId = null;

    // Storage helpers
    const loadJSON = (k, fallback) => { try{ const r = localStorage.getItem(k); return r? JSON.parse(r): fallback; }catch{ return fallback; } };
    const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

    const loadEvents = () => loadJSON(EVENTS_KEY, []);
    const saveEvents = e => saveJSON(EVENTS_KEY, e);

    const defaultSettings = { price: 0.5, dailyTarget: 10, currency: '$', cravingDuration: 5, streakTarget: 7 };
    const loadSettings = () => Object.assign({}, defaultSettings, loadJSON(SETTINGS_KEY, {}));
    const saveSettings = s => saveJSON(SETTINGS_KEY, s);

    const loadAchievements = () => loadJSON(ACH_KEY, []);
    const saveAchievements = a => saveJSON(ACH_KEY, a);

    const loadCraving = () => loadJSON(CRAVING_KEY, { endTs: null });
    const saveCraving = c => saveJSON(CRAVING_KEY, c);

    const pushUndo = p => { saveJSON(UNDO_KEY, { payload:p, ts:new Date().toISOString() }); if(undoBtn) undoBtn.disabled=false; };
    const popUndo  = () => { const r=loadJSON(UNDO_KEY,null); localStorage.removeItem(UNDO_KEY); if(undoBtn) undoBtn.disabled=true; return r?r.payload:null; };

    // Toasts
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

    // Events
    function addEvent(ts = new Date().toISOString()) {
      if (isCravingActive()) { showToast('Craving active — cannot log now.', { timeout: 3000 }); return; }
      const events = loadEvents();
      events.push({ id: uid(), ts });
      events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
      saveEvents(events);
      render();
    }
    function removeEvent(id) { // kept for internal use if needed
      const events = loadEvents(); const idx = events.findIndex(e => e.id === id); if (idx === -1) return;
      const removed = events.splice(idx, 1)[0]; pushUndo({ action: 'delete', event: removed }); saveEvents(events); render();
    }
    function clearAll() {
      const events = loadEvents(); if (!events.length) return;
      pushUndo({ action: 'clear', events }); localStorage.removeItem(EVENTS_KEY); render();
    }

    // CSV import (kept)
    function importCSV(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (!lines.length) { showToast('CSV empty or invalid'); return; }
        const first = lines[0].toLowerCase();
        if (first.includes('timestamp') || first.includes('id')) lines.shift();
        const events = loadEvents(); let count = 0;
        lines.forEach(line => {
          const cols = line.split(',');
          const ts = (cols[1] || cols[0] || '').replace(/^"|"$/g, '');
          const d = new Date(ts); if (!ts || isNaN(d.getTime())) return;
          events.push({ id: uid(), ts: d.toISOString() }); count++;
        });
        events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
        saveEvents(events);
        showToast(`Imported ${count} events`, { timeout: 3000 });
        render();
      };
      reader.readAsText(file);
    }

    // Excel export (.xlsx) — events + achievements in one workbook
    function exportExcel() {
      const events = loadEvents();
      const achievements = loadAchievements();
      const settings = loadSettings();

      const eventsRows = [['id','timestamp','date','hour']];
      events.forEach(e => {
        const d = new Date(e.ts);
        eventsRows.push([e.id, e.ts, e.ts.slice(0,10), String(d.getHours()).padStart(2,'0') + ':00']);
      });

      const achRows = [['id','timestamp','date','reason','location']];
      achievements.forEach(a => achRows.push([a.id, a.ts, a.ts.slice(0,10), a.reason||'', a.location||'']));

      const settingsRows = [['key','value'],
        ['price_per_stick', settings.price],
        ['daily_target', settings.dailyTarget],
        ['currency', settings.currency],
        ['craving_duration_min', settings.cravingDuration],
        ['streak_target_days', settings.streakTarget],
        ['exported_at', new Date().toISOString()]
      ];

      const wb = XLSX.utils.book_new();
      const wsEvents = XLSX.utils.aoa_to_sheet(eventsRows);
      const wsAch = XLSX.utils.aoa_to_sheet(achRows);
      const wsSettings = XLSX.utils.aoa_to_sheet(settingsRows);
      XLSX.utils.book_append_sheet(wb, wsEvents, 'Events');
      XLSX.utils.book_append_sheet(wb, wsAch, 'Achievements');
      XLSX.utils.book_append_sheet(wb, wsSettings, 'Settings');

      XLSX.writeFile(wb, 'breathefree-data.xlsx');
      showToast('Excel exported', { timeout: 1800 });
    }

    // Craving timer logic
    function cravingDurationMs() { const s = loadSettings(); return clamp(parseInt(s.cravingDuration,10)||5,1,60) * 60 * 1000; }
    function isCravingActive() { const c = loadCraving(); return c && c.endTs && (new Date(c.endTs).getTime() > Date.now()); }
    function remainingMs() { const c = loadCraving(); if (!c || !c.endTs) return 0; return Math.max(0, new Date(c.endTs).getTime() - Date.now()); }
    function formatMMSS(ms) { const tot = Math.ceil(ms / 1000); const mm = Math.floor(tot / 60); const ss = tot % 60; return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; }

    function startCraving(customMin = null) {
      const minutes = customMin ? clamp(customMin,1,60) : (parseInt(loadSettings().cravingDuration,10) || 5);
      const endTs = Date.now() + minutes * 60 * 1000;
      saveCraving({ endTs });
      updateCravingUI();
      if (lastCravingTimerInterval) clearInterval(lastCravingTimerInterval);
      lastCravingTimerInterval = setInterval(() => {
        updateCravingUI();
        if (!isCravingActive()) {
          clearInterval(lastCravingTimerInterval);
          lastCravingTimerInterval = null;
          completeCraving();
        }
      }, 1000);
      showToast(`Craving started (${minutes} min)`, { timeout: 2500 });
    }
    function stopCraving() {
      saveCraving({ endTs: null });
      if (lastCravingTimerInterval) { clearInterval(lastCravingTimerInterval); lastCravingTimerInterval = null; }
      updateCravingUI();
      showToast('Craving stopped', { timeout: 2000 });
    }
    function completeCraving() {
      const ach = loadAchievements();
      const now = new Date().toISOString();
      const newAch = { id: uid(), ts: now, reason: '', location: '' };
      ach.unshift(newAch);
      saveAchievements(ach);
      saveCraving({ endTs: null });
      updateCravingUI();
      render();
      startConfetti();
      showToast('Achievement unlocked! + saved 1 cigarette', {
        timeout: 7000,
        actionText: 'Add details',
        action: () => openAchModal(newAch.id)
      });
      renderAnalytics();
    }

    // Ach modal functions
    function openAchModal(achId) {
      activeAchievementId = achId;
      const ach = loadAchievements().find(a => a.id === achId);
      if (!ach) return;
      achReasonInput.value = ach.reason || '';
      achLocationInput.value = ach.location || '';
      achModal.classList.remove('hidden'); achModal.setAttribute('aria-hidden', 'false');
    }
    function closeAchModalFunc() {
      achModal.classList.add('hidden'); achModal.setAttribute('aria-hidden', 'true'); activeAchievementId = null;
    }
    function saveAchDetails() {
      if (!activeAchievementId) return closeAchModalFunc();
      const achArr = loadAchievements();
      const a = achArr.find(x => x.id === activeAchievementId);
      if (!a) return closeAchModalFunc();
      a.reason = (achReasonInput.value || '').trim();
      a.location = (achLocationInput.value || '').trim();
      saveAchievements(achArr);
      closeAchModalFunc();
      renderAchievements();
      renderAnalytics();
      showToast('Achievement details saved', { timeout: 2200 });
    }

    // Confetti
    let confettiActive = false;
    function startConfetti() {
      if (confettiActive) return; confettiActive = true;
      const cv = document.createElement('canvas'); cv.id = 'confetti-canvas'; cv.width = window.innerWidth; cv.height = window.innerHeight; document.body.appendChild(cv);
      const ctx = cv.getContext('2d');
      const colors = ['#ff7a59', '#00a8ff', '#7b61ff', '#ffd56b', '#22c55e'];
      const pieces = []; const num = Math.floor(Math.max(24, window.innerWidth / 30));
      for (let i = 0; i < num; i++) {
        pieces.push({
          x: Math.random() * cv.width, y: Math.random() * -cv.height * 0.5,
          w: 8 + Math.random() * 10, h: 8 + Math.random() * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() * Math.PI * 2, velX: (Math.random() - 0.5) * 4,
          velY: 2 + Math.random() * 6, spin: (Math.random() - 0.5) * 0.2
        });
      }
      let t0 = null; const duration = 2200;
      function step(ts) {
        if (!t0) t0 = ts; const elapsed = ts - t0; ctx.clearRect(0, 0, cv.width, cv.height);
        pieces.forEach(p => { p.x += p.velX; p.y += p.velY; p.velY += 0.15; p.rot += p.spin; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
        if (elapsed < duration) requestAnimationFrame(step);
        else {
          let fade = 1;
          const fadeStep = () => {
            fade -= 0.06; ctx.fillStyle = `rgba(255,255,255,${1 - fade})`; ctx.fillRect(0, 0, cv.width, cv.height);
            if (fade > 0) requestAnimationFrame(fadeStep); else { confettiActive = false; try { document.body.removeChild(cv); } catch { } }
          };
          requestAnimationFrame(fadeStep);
        }
      }
      requestAnimationFrame(step);
      const onResize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
      window.addEventListener('resize', onResize, { once: false });
      setTimeout(() => window.removeEventListener('resize', onResize), duration + 600);
    }

    // Analytics, charts, stats
    function countsLastNDays(n) {
      const events = loadEvents();
      const counts = {};
      for (let i = 0; i < n; i++) { const day = isoDate(new Date(Date.now() - i * 24 * 3600 * 1000)); counts[day] = 0; }
      events.forEach(e => { const d = e.ts.slice(0, 10); if (d in counts) counts[d]++; });
      return counts;
    }

    function updateStatsAndCharts() {
      const settings = loadSettings();
      const counts7 = countsLastNDays(7);
      const counts30 = countsLastNDays(30);
      const todayISO = isoDate();
      const todayCount = counts7[todayISO] || 0;
      if (countNumber) countNumber.textContent = todayCount;
      const sum7 = Object.values(counts7).reduce((a, b) => a + b, 0);
      const sum30 = Object.values(counts30).reduce((a, b) => a + b, 0);
      if (avg7El) avg7El.textContent = (sum7 / 7).toFixed(1);
      if (avg30El) avg30El.textContent = (sum30 / 30).toFixed(1);
      const events = loadEvents(); if (totalLoggedEl) totalLoggedEl.textContent = events.length;
      const moneySpent = (events.length * (parseFloat(settings.price) || 0)); if (moneySpentEl) moneySpentEl.textContent = `${settings.currency || '$'}${moneySpent.toFixed(2)}`;
      const ach = loadAchievements(); const saved = (ach.length * (parseFloat(settings.price) || 0)); if (savedAmountEl) savedAmountEl.textContent = `${settings.currency || '$'}${saved.toFixed(2)}`;

      // weekly chart
      if (weeklyCanvas) {
        const labels7 = []; const data7 = [];
