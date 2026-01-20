
// BreatheFree — craving timer, achievements, analytics, AI insights, Excel/CSV export
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    // Storage keys
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
    const exportBtn = $('exportBtn');                // CSV (top bar)
    const exportEventsBtn = $('exportEventsBtn');    // Excel (data card)
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

    const achModal = $('achModal');
    const closeAchModalBtn = $('closeAchModal');
    const saveAchBtn = $('saveAchBtn');
    const cancelAchBtn = $('cancelAchBtn');
    const achReasonInput = $('achReason');
    const achLocationInput = $('achLocation');

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

    const weeklyCanvas = $('weeklyChart');
    const monthlyCanvas = $('monthlyChart');
    const sparklineCanvas = $('sparkline');
    let weeklyChart = null;
    let monthlyChart = null;
    let sparkChart = null;

    const toastContainer = $('toastContainer');

    // AI Insights
    const insightsList = $('insightsList');
    const aiStart2Min = $('aiStart2Min');
    const aiStart5Min = $('aiStart5Min');
    const aiOpenSettings = $('aiOpenSettings');

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
    window.showToast = showToast; // for debugging

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

    // CSV (top bar)
    function exportCSV() {
      const events = loadEvents();
      const rows = [['id', 'timestamp', 'date']];
      events.forEach(e => rows.push([e.id, e.ts, e.ts.slice(0, 10)]));
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'breathefree-events.csv'; a.click(); URL.revokeObjectURL(url);
      showToast('Exported CSV', { timeout: 2200 });
    }

    // Excel (.xlsx) — SheetJS via CDN; fallback to CSV if blocked
    function exportXLSX() {
      const events = loadEvents();
      if (!events.length) { showToast('No events to export'); return; }
      const rows = events.map(e => {
        const d = new Date(e.ts);
        const weekday = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
        return {
          id: e.id,
          timestamp_iso: e.ts,
          date: e.ts.slice(0,10),
          time: d.toLocaleTimeString(),
          hour: d.getHours(),
          weekday
        };
      });
      try {
        if (window.XLSX) {
          const ws = window.XLSX.utils.json_to_sheet(rows);
          const wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, 'events');
          window.XLSX.writeFile(wb, 'breathefree-events.xlsx');
          showToast('Exported Excel (.xlsx)', { timeout: 2200 });
        } else {
          exportCSV();
        }
      } catch (e) {
        console.error(e);
        exportCSV();
      }
    }

    // Craving timer
    function cravingDurationMs() { const s = loadSettings(); return Math.max(1, parseFloat(s.cravingDuration) || 5) * 60 * 1000; }
    function isCravingActive() { const c = loadCraving(); return c && c.endTs && (new Date(c.endTs).getTime() > Date.now()); }
    function remainingMs() { const c = loadCraving(); if (!c || !c.endTs) return 0; return Math.max(0, new Date(c.endTs).getTime() - Date.now()); }
    function formatMMSS(ms) { const tot = Math.ceil(ms / 1000); const mm = Math.floor(tot / 60); const ss = tot % 60; return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; }

    function startCraving(customMinutes) {
      const duration = customMinutes ? Math.max(1, parseInt(customMinutes,10)) * 60 * 1000 : cravingDurationMs();
      const endTs = Date.now() + duration;
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
      showToast('Craving started', { timeout: 2000 });
    }
    function stopCraving() {
      saveCraving({ endTs: null });
      if (lastCravingTimerInterval) { clearInterval(lastCravingTimerInterval); lastCravingTimerInterval = null; }
      updateCravingUI();
      showToast('Craving stopped', { timeout: 1800 });
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
        timeout: 6000,
        actionText: 'Add details',
        action: () => openAchModal(newAch.id)
      });
      renderAnalytics();
    }

    // Ach modal
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
      showToast('Achievement details saved', { timeout: 2000 });
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
      let cur = 0; let day = new Date();
      while (true) { const dstr = isoDate(day); if (set.has(dstr)) { cur++; day.setDate(day.getDate() - 1); } else break; }
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

    // Achievements UI
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

    // AI Insights (local-only heuristics)
    function generateInsights() {
      const s = loadSettings();
      const events = loadEvents();
      const ach = loadAchievements();
      const today = isoDate();

      // Today pace vs typical
      const byHour = Array(24).fill(0);
      const last7 = countsLastNDays(7);
      const todayCount = last7[today] || 0;
      events.forEach(e => { const d = new Date(e.ts); byHour[d.getHours()]++; });

      const busiestHour = byHour.indexOf(Math.max(...byHour));
      const sum7 = Object.values(last7).reduce((a,b)=>a+b,0);
      const avg7 = sum7 / 7;
      const st = computeStreaks();

      // Money saved this week (achievements x price)
      const weekSaved = ach.filter(a => {
        const d = new Date(a.ts);
        const diffDays = Math.floor((new Date().setHours(0,0,0,0) - new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime())/(24*3600*1000));
        return diffDays >= 0 && diffDays < 7;
      }).length * (parseFloat(s.price)||0);

      const cur = s.currency || '$';
      const tips = [
        `You’ve logged ${todayCount} today. Your 7‑day average is ${avg7.toFixed(1)} — ${todayCount <= avg7 ? 'ahead 👍' : 'you can still steer it 💪'}.`,
        `Your trickiest hour lately: ${String(busiestHour).padStart(2,'0')}:00. Plan a 2‑min craving or water break then.`,
        `Savings this week: ${cur}${weekSaved.toFixed(2)} — treat yourself to something healthy.`,
        `Current streak: ${st.current} day(s). Best: ${st.best}. Keep it going — small wins add up.`,
        `Beat your target (${s.dailyTarget}/day)? Consider dropping it by 1 tomorrow. If not, no stress — try a 2‑min craving at your tricky hour.`
      ];
      return tips;
    }
    function renderInsights() {
      if (!insightsList) return;
      insightsList.innerHTML = '';
      generateInsights().forEach(t => {
        const li = document.createElement('li'); li.textContent = t; insightsList.appendChild(li);
      });
    }

    // UI updates
    function updateCravingUI() {
      const active = isCravingActive();
      if (cravingTimerEl) { cravingTimerEl.textContent = active ? ('Remaining: ' + formatMMSS(remainingMs())) : ''; }
      [addNowBtn, incrementBtn, addAtBtn].forEach(el => { if (el) el.disabled = active; });
      if (startCravingBtn) startCravingBtn.disabled = active;
      if (stopCravingBtn) stopCravingBtn.disabled = !active;
    }

    function render() {
      if (dateInput) dateInput.value = isoDate();
      renderAchievements();
      renderAnalytics();
      updateStatsAndCharts();
      renderInsights();
      updateCravingUI();
      if (undoBtn) undoBtn.disabled = !localStorage.getItem(UNDO_KEY);
    }

    // Wiring
    if (addNowBtn) addNowBtn.addEventListener('click', () => addEvent(new Date().toISOString()));
    if (incrementBtn) incrementBtn.addEventListener('click', () => addEvent(new Date().toISOString()));
    if (decrementBtn) decrementBtn.addEventListener('click', () => {
      const events = loadEvents(); const date = dateInput ? (dateInput.value || isoDate()) : isoDate();
      const matchIdx = events.findIndex(e => e.ts.slice(0, 10) === date);
      if (matchIdx === -1) return alert('No events on selected date to remove.');
      if (!confirm('Remove the most recent event for this date?')) return;
      const removed = events.splice(matchIdx, 1)[0];
      pushUndo({ action: 'delete', event: removed }); saveEvents(events); render();
    });
    if (addAtBtn) addAtBtn.addEventListener('click', () => { if (!datetimeInput || !datetimeInput.value) return alert('Pick date & time to add.'); addEvent(new Date(datetimeInput.value).toISOString()); datetimeInput.value = ''; });
    if (exportBtn) exportBtn.addEventListener('click', exportCSV);
    if (exportEventsBtn) exportEventsBtn.addEventListener('click', exportXLSX);
    if (fileImport) fileImport.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; if (!confirm(`Import ${f.name}?`)) return; importCSV(f); e.target.value = ''; });
    if (clearBtn) clearBtn.addEventListener('click', () => { if (!confirm('Clear all events?')) return; clearAll(); });
    if (undoBtn) undoBtn.addEventListener('click', () => {
     Amazing—shipping the updated app as **fully replaceable files**.  
Your requested changes are implemented:

1. **Removed Recent Events list** and added a **single “Export Events (Excel)”** button in its own card.  
2. Added a dedicated **AI Insights** section (local-only, privacy-friendly) that gives motivating, actionable tips.  
3. Moved **Achievements & Craving Analytics** to a **separate full‑width card below the Smoke Log**, for a more balanced layout.  
4. Included the **Hourly Heatmap** (30 days × 24 hours) and a **Progress Ring** around today’s count (targets feel tangible).  
5. Kept your animated background and bigger buttons.

> **How to update:** Replace your repo’s four files at the root with the versions below and re-deploy GitHub Pages.

---

## `index.html`
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>BreatheFree — Cigarette Tracker</title>
  <meta name="description" content="Track your daily cigarette intake locally in your browser. Craving timer, achievements, charts, and Excel/CSV export." />
  <meta name="theme-color" content="#00a8ff" />

  <!-- Favicon & Styles -->
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="styles.css" />

  <!-- Chart.js (for charts) -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

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
        <img src="favicon.svg" class="logo" alt="" />
        <div class="title-wrap">
          <h1>BreatheFree</h1>
          <p class="subtitle">Track your daily cigarette intake — stored locally</p>
        </div>
      </div>

      <div class="top-actions">
        <button id="openSettingsBtn" class="btn circle" title="Settings" aria-label="Open settings">⚙</button>
        <label for="fileImport" class="btn outline" role="button" aria-label="Import from CSV">Import</label>
        <input id="fileImport" type="file" accept=".csv" hidden>
        <button id="exportBtn" class="btn outline" title="Export CSV">Export CSV</button>
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
            <div class="ring-stack">
              <!-- Progress Ring -->
              <svg class="progress-ring" width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
                <circle class="ring-bg" cx="60" cy="60" r="52"></circle>
                <circle class="ring-fg" id="ringFg" cx="60" cy="60" r="52"></circle>
              </svg>
              <div class="count-wrap">
                <div class="big-count" id="countNumber">0</div>
                <div class="small-label">Cigarettes today</div>
              </div>
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
          <canvas id="weeklyChart" height="140"></canvas>

          <h3 class="chart-heading mt">Monthly trend (30 days)</h3>
          <canvas id="monthlyChart" height="140"></canvas>

          <div class="card-compact mt">
            <h3 class="chart-heading">Hourly Heatmap (last 30 days)</h3>
            <div id="hourHeatmap" class="heatmap" aria-label="Hourly heatmap of smoking events"></div>
          </div>
        </div>
      </section>

      <!-- ===== Row 2: Achievements & Craving Analytics (full width) ===== -->
      <section class="card mt" id="ach-analytics-section">
        <div class="ach-analytics-grid">
          <div class="ach-col">
            <div class="ach-header">
              <strong>Achievements</strong>
              <small id="achCount">0</small>
            </div>
            <ul id="awardsList" class="awards-list"></ul>
          </div>

          <div class="analytics-col">
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
              <canvas id="sparkline" height="50"></canvas>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Row 3: AI Insights ===== -->
      <section class="card mt">
        <div class="ai-header">
          <h2 class="ai-title">AI Insights</h2>
          <span class="ai-sub">Personalized, on-device tips to help you smoke less</span>
        </div>
        <ul id="insightsList" class="insights-list">
          <!-- Populated by JS -->
        </ul>
      </section>

      <!-- ===== Row 4: Export (no recent events list) ===== -->
      <section class="card mt">
        <div class="history-header">
          <h2>Export your data</h2>
          <div class="history-actions">
            <button id="exportExcelBtn" class="btn primary">Export Events (Excel)</button>
          </div>
        </div>
        <p class="muted">This exports your logs into an Excel-compatible file. CSV export is also available from the top bar.</p>
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
