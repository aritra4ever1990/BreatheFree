// BreatheFree — features: craving timer (adjustable), achievements w/ metadata,
// stacked toasts, confetti, analytics + sparkline, streaks (configurable)
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
    const eventsList = $('eventsList');
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
    function exportCSV() {
      const events = loadEvents();
      const rows = [['id', 'timestamp', 'date']];
      events.forEach(e => rows.push([e.id, e.ts, e.ts.slice(0, 10)]));
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'breathefree-events.csv'; a.click(); URL.revokeObjectURL(url);
    }

    // Craving timer logic
    function cravingDurationMs() { const s = loadSettings(); return Math.max(1, parseFloat(s.cravingDuration) || 5) * 60 * 1000; }
    function isCravingActive() { const c = loadCraving(); return c && c.endTs && (new Date(c.endTs).getTime() > Date.now()); }
    function remainingMs() { const c = loadCraving(); if (!c || !c.endTs) return 0; return Math.max(0, new Date(c.endTs).getTime() - Date.now()); }
    function formatMMSS(ms) { const tot = Math.ceil(ms / 1000); const mm = Math.floor(tot / 60); const ss = tot % 60; return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; }

    function startCraving() {
      const endTs = Date.now() + cravingDurationMs();
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
      showToast('Craving started', { timeout: 2500 });
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

    // Confetti (lightweight)
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

    // Analytics & charts
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
        for (let i = 6; i >= 0; i--) { const day = isoDate(new Date(Date.now() - i * 24 * 3600 * 1000)); labels7.push(day.slice(5)); data7.push(counts7[day] || 0); }
        const target = parseFloat(settings.dailyTarget) || 0; const targetData = new Array(labels7.length).fill(target);
        if (!weeklyChart) {
          weeklyChart = new Chart(weeklyCanvas.getContext('2d'), {
            type: 'bar',
            data: { labels: labels7, datasets: [{ label: 'Cigarettes', data: data7, backgroundColor: 'rgba(0,168,255,0.85)' }, { label: 'Target', data: targetData, type: 'line', borderColor: 'rgba(255,125,85,0.95)', borderWidth: 2, pointRadius: 0, fill: false }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
          });
        } else {
          weeklyChart.data.labels = labels7; weeklyChart.data.datasets[0].data = data7; weeklyChart.data.datasets[1].data = targetData; weeklyChart.update();
        }
      }

      // monthly chart
      if (monthlyCanvas) {
        const labels30 = []; const data30 = []; const counts30map = countsLastNDays(30);
        for (let i = 29; i >= 0; i--) { const day = isoDate(new Date(Date.now() - i * 24 * 3600 * 1000)); labels30.push(day); data30.push(counts30map[day] || 0); }
        if (!monthlyChart) {
          monthlyChart = new Chart(monthlyCanvas.getContext('2d'), {
            type: 'line',
            data: { labels: labels30, datasets: [{ label: 'Cigarettes', data: data30, borderColor: 'rgba(0,168,255,0.9)', backgroundColor: 'rgba(0,168,255,0.08)', fill: true, pointRadius: 1 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { beginAtZero: true } } }
          });
        } else {
          monthlyChart.data.labels = labels30; monthlyChart.data.datasets[0].data = data30; monthlyChart.update();
        }
      }

      // sparkline for achievements per day (last 7 days)
      if (sparklineCanvas) {
        const ach = loadAchievements();
        const map = {}; for (let i = 0; i < 7; i++) { const day = isoDate(new Date(Date.now() - i * 24 * 3600 * 1000)); map[day] = 0; }
        ach.forEach(a => { const d = a.ts.slice(0, 10); if (d in map) map[d]++; });
        const labels = []; const data = [];
        for (let i = 6; i >= 0; i--) { const day = isoDate(new Date(Date.now() - i * 24 * 3600 * 1000)); labels.push(day.slice(5)); data.push(map[day] || 0); }
        if (!sparkChart) {
          sparkChart = new Chart(sparklineCanvas.getContext('2d'), {
            type: 'line',
            data: { labels, datasets: [{ data, borderColor: 'rgba(123,97,255,0.9)', backgroundColor: 'rgba(123,97,255,0.08)', fill: true, pointRadius: 0 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { line: { tension: 0.4 } } }
          });
        } else {
          sparkChart.data.labels = labels; sparkChart.data.datasets[0].data = data; sparkChart.update();
        }
      }
    }

    // Streaks
    function computeStreaks() {
      const ach = loadAchievements();
      if (!ach.length) return { current: 0, best: 0 };
      const dates = Array.from(new Set(ach.map(a => a.ts.slice(0, 10)))).sort();
      const set = new Set(dates);
      // current streak ending today
      let cur = 0; let day = new Date();
      while (true) { const dstr = isoDate(day); if (set.has(dstr)) { cur++; day.setDate(day.getDate() - 1); } else break; }
      // best streak
      let best = 0; let streak = 0; let prev = null;
      const uniq = dates.map(d => new Date(d));
      for (let i = 0; i < uniq.length; i++) {
        if (i === 0) { streak = 1; prev = uniq[0]; }
        else {
          const diffDays = Math.round((uniq[i] - prev) / (24 * 3600 * 1000));
          if (diffDays === 1) { streak++; prev = uniq[i]; }
          else { best = Math.max(best, streak); streak = 1; prev = uniq[i]; }
        }
      }
      best = Math.max(best, streak);
      return { current: cur, best };
    }
    function renderAnalytics() {
      const ach = loadAchievements();
      const today = isoDate();
      const todayCount = ach.filter(a => a.ts.slice(0, 10) === today).length;
      const weekCount = ach.filter(a => {
        const d = new Date(a.ts);
        const diffDays = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / (24 * 3600 * 1000));
        return diffDays >= 0 && diffDays < 7;
      }).length;
      if (cravingsTodayEl) cravingsTodayEl.textContent = todayCount;
      if (cravingsWeekEl) cravingsWeekEl.textContent = weekCount;
      const st = computeStreaks();
      if (currentStreakEl) currentStreakEl.textContent = st.current;
      if (bestStreakEl) bestStreakEl.textContent = st.best;
    }

    // UI: events list
    function renderEventsList() {
      if (!eventsList) return;
      const events = loadEvents(); eventsList.innerHTML = '';
      if (!events.length) { const li = document.createElement('li'); li.className = 'event-item'; li.textContent = 'No events yet — click "Log Now" to start tracking.'; eventsList.appendChild(li); return; }
      events.forEach(e => {
        const li = document.createElement('li'); li.className = 'event-item';
        const left = document.createElement('div'); left.className = 'event-left';
        const day = document.createElement('div'); day.className = 'event-day'; day.textContent = e.ts.slice(0, 10);
        const when = document.createElement('div'); when.className = 'event-time'; when.textContent = new Date(e.ts).toLocaleString();
        left.appendChild(day); left.appendChild(when);
        const right = document.createElement('div'); right.className = 'event-actions';
        const del = document.createElement('button'); del.className = 'btn outline'; del.textContent = 'Delete'; del.addEventListener('click', () => { if (confirm('Delete this event?')) removeEvent(e.id); });
        right.appendChild(del); li.appendChild(left); li.appendChild(right); eventsList.appendChild(li);
      });
    }

    // UI: achievements
    function renderAchievements() {
      const ach = loadAchievements();
      if (achCount) achCount.textContent = ach.length;
      if (!awardsList) return;
      awardsList.innerHTML = '';
      if (!ach.length) {
        const li = document.createElement('li'); li.textContent = 'No achievements yet — complete a craving to earn one.'; awardsList.appendChild(li); return;
      }
      ach.slice(0, 50).forEach(a => {
        const li = document.createElement('li');
        li.textContent = `${a.ts.slice(0, 10)} • ${new Date(a.ts).toLocaleTimeString()}${a.reason ? ` • ${a.reason}` : ''}${a.location ? ` • ${a.location}` : ''}`;
        const edit = document.createElement('button'); edit.className = 'btn outline'; edit.textContent = 'Edit'; edit.style.marginLeft = '8px';
        edit.addEventListener('click', () => openAchModal(a.id));
        li.appendChild(edit);
        awardsList.appendChild(li);
      });
    }

    function updateCravingUI() {
      const active = isCravingActive();
      if (cravingTimerEl) { cravingTimerEl.textContent = active ? ('Remaining: ' + formatMMSS(remainingMs())) : ''; }
      [addNowBtn, incrementBtn, addAtBtn].forEach(el => { if (el) el.disabled = active; });
      if (startCravingBtn) startCravingBtn.disabled = active;
      if (stopCravingBtn) stopCravingBtn.disabled = !active;
    }

    function render() {
      if (dateInput) dateInput.value = isoDate();
      renderEventsList();
      renderAchievements();
      renderAnalytics();
      updateStatsAndCharts();
      updateCravingUI();
      if (undoBtn) undoBtn.disabled = !localStorage.getItem(UNDO_KEY);
    }

    // wiring controls
    if (addNowBtn) addNowBtn.addEventListener('click', () => addEvent(new Date().toISOString()));
    if (incrementBtn) incrementBtn.addEventListener('click', () => addEvent(new Date().toISOString()));
    if (decrementBtn) decrementBtn.addEventListener('click', () => {
      const events = loadEvents(); const date = dateInput ? (dateInput.value || isoDate()) : isoDate();
      const match = events.find(e => e.ts.slice(0, 10) === date);
      if (!match) return alert('No events on selected date to remove.');
      if (!confirm('Remove the most recent event for this date?')) return; removeEvent(match.id);
    });
    if (addAtBtn) addAtBtn.addEventListener('click', () => { if (!datetimeInput || !datetimeInput.value) return alert('Pick date & time to add.'); addEvent(new Date(datetimeInput.value).toISOString()); datetimeInput.value = ''; });
    if (exportBtn) exportBtn.addEventListener('click', exportCSV);
    if (exportEventsBtn) exportEventsBtn.addEventListener('click', exportCSV);
    if (fileImport) fileImport.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; if (!confirm(`Import ${f.name}?`)) return; importCSV(f); e.target.value = ''; });
    if (clearBtn) clearBtn.addEventListener('click', () => { if (!confirm('Clear all events?')) return; clearAll(); });
    if (undoBtn) undoBtn.addEventListener('click', () => {
      const payload = popUndo(); if (!payload) return showToast('Nothing to undo', {});
      if (payload.action === 'delete') { const events = loadEvents(); events.push(payload.event); events.sort((a, b) => new Date(b.ts) - new Date(a.ts)); saveEvents(events); render(); }
      else if (payload.action === 'clear') { saveEvents(payload.events || []); render(); }
    });

    if (startCravingBtn) startCravingBtn.addEventListener('click', () => { if (isCravingActive()) return; startCraving(); });
    if (stopCravingBtn) stopCravingBtn.addEventListener('click', () => { if (!isCravingActive()) return; if (confirm('Stop craving early? You will not earn the achievement.')) stopCraving(); });

    // settings modal wiring
    if (openSettingsBtn) openSettingsBtn.addEventListener('click', () => {
      const s = loadSettings();
      if (cigPriceInput) cigPriceInput.value = s.price;
      if (dailyTargetInput) dailyTargetInput.value = s.dailyTarget;
      if (currencyInput) currencyInput.value = s.currency;
      if (cravingDurationInput) cravingDurationInput.value = s.cravingDuration;
      if (streakTargetInput) streakTargetInput.value = s.streakTarget;
      if (settingsModal) { settingsModal.classList.remove('hidden'); settingsModal.setAttribute('aria-hidden', 'false'); }
    });
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => { if (settingsModal) { settingsModal.classList.add('hidden'); settingsModal.setAttribute('aria-hidden', 'true'); } });
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
      const settings = {
        price: parseFloat(cigPriceInput && cigPriceInput.value) || 0,
        dailyTarget: parseInt(dailyTargetInput && dailyTargetInput.value, 10) || 0,
        currency: (currencyInput && currencyInput.value) || '$',
        cravingDuration: parseInt(cravingDurationInput && cravingDurationInput.value, 10) || 5,
        streakTarget: parseInt(streakTargetInput && streakTargetInput.value, 10) || 7
      };
      saveSettings(settings);
      if (settingsModal) { settingsModal.classList.add('hidden'); settingsModal.setAttribute('aria-hidden', 'true'); }
      showToast('Settings saved', { timeout: 2000 });
      render();
    });
    if (resetSettingsBtn) resetSettingsBtn.addEventListener('click', () => { if (!confirm('Reset settings to defaults?')) return; saveSettings({ ...defaultSettings }); render(); });

    // Ach modal
    if (closeAchModalBtn) closeAchModalBtn.addEventListener('click', () => closeAchModalFunc());
    if (cancelAchBtn) cancelAchBtn.addEventListener('click', () => closeAchModalFunc());
    if (saveAchBtn) saveAchBtn.addEventListener('click', () => saveAchDetails());

    // keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'N' || e.key === 'n') && document.activeElement.tagName !== 'INPUT') addEvent(new Date().toISOString());
      if ((e.key === 'U' || e.key === 'u') && (!undoBtn || !undoBtn.disabled)) undoBtn && undoBtn.click();
      if ((e.key === 'E' || e.key === 'e') && document.activeElement.tagName !== 'INPUT') exportBtn && exportBtn.click();
    });

    // resume craving if active on load
    (function resumeCraving() {
      const c = loadCraving();
      if (c && c.endTs && (new Date(c.endTs).getTime() > Date.now())) {
        if (lastCravingTimerInterval) clearInterval(lastCravingTimerInterval);
        lastCravingTimerInterval = setInterval(() => {
          updateCravingUI();
          if (!isCravingActive()) { clearInterval(lastCravingTimerInterval); lastCravingTimerInterval = null; completeCraving(); }
        }, 1000);
      } else saveCraving({ endTs: null });
    })();

    // initial render
    render();

    // expose some debug helpers if needed
    window._breathefree = { addEvent, loadEvents, loadSettings, loadAchievements, startCraving, stopCraving, showToast };
  }); // DOMContentLoaded
})();
