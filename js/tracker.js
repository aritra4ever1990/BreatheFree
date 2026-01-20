// BreatheFree — enhanced with Craving timer, achievements, saved calculation
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    // Storage keys
    const EVENTS_KEY = 'breathefree:events';
    const SETTINGS_KEY = 'breathefree:settings';
    const UNDO_KEY = 'breathefree:undo';
    const ACH_KEY = 'breathefree:achievements';
    const CRAVING_KEY = 'breathefree:craving'; // stores { endTs: number | null }

    // DOM helpers
    const $ = id => document.getElementById(id);

    // Elements
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

    // charts
    const weeklyCanvas = $('weeklyChart');
    const monthlyCanvas = $('monthlyChart');
    let weeklyChart = null;
    let monthlyChart = null;

    // Storage helpers
    function loadEvents() {
      try {
        const raw = localStorage.getItem(EVENTS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) { console.error(e); return []; }
    }
    function saveEvents(events) { localStorage.setItem(EVENTS_KEY, JSON.stringify(events)); }

    function loadSettings() {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { price: 0.5, dailyTarget: 10, currency: '$' };
        return Object.assign({ price: 0.5, dailyTarget: 10, currency: '$' }, JSON.parse(raw));
      } catch (e) { return { price: 0.5, dailyTarget: 10, currency: '$' }; }
    }
    function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

    function loadAchievements() {
      try {
        const raw = localStorage.getItem(ACH_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    }
    function saveAchievements(a) { localStorage.setItem(ACH_KEY, JSON.stringify(a)); }

    function loadCraving() {
      try {
        const raw = localStorage.getItem(CRAVING_KEY);
        return raw ? JSON.parse(raw) : { endTs: null };
      } catch (e) { return { endTs: null }; }
    }
    function saveCraving(c) { localStorage.setItem(CRAVING_KEY, JSON.stringify(c)); }

    function pushUndo(payload) {
      localStorage.setItem(UNDO_KEY, JSON.stringify({ payload, ts: new Date().toISOString() }));
      if (undoBtn) undoBtn.disabled = false;
    }
    function popUndo() {
      const raw = localStorage.getItem(UNDO_KEY);
      if (!raw) return null;
      localStorage.removeItem(UNDO_KEY);
      if (undoBtn) undoBtn.disabled = true;
      return JSON.parse(raw).payload;
    }

    function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

    // Add event (guarded by craving)
    function addEvent(ts = new Date().toISOString()) {
      if (isCravingActive()) {
        alert('Craving in progress — please wait until the timer finishes or stop it before logging a smoke.');
        return;
      }
      const events = loadEvents();
      events.push({ id: uid(), ts });
      events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
      saveEvents(events);
      render();
    }

    // Remove event
    function removeEvent(id) {
      const events = loadEvents();
      const idx = events.findIndex(e => e.id === id);
      if (idx === -1) return;
      const removed = events.splice(idx, 1)[0];
      pushUndo({ action: 'delete', event: removed });
      saveEvents(events);
      render();
    }

    function clearAll() {
      const events = loadEvents();
      if (!events.length) return;
      pushUndo({ action: 'clear', events });
      localStorage.removeItem(EVENTS_KEY);
      render();
    }

    // CSV import/export (same behavior as before)
    function importCSV(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (!lines.length) return alert('Empty or invalid CSV.');
        const first = lines[0].toLowerCase();
        if (first.includes('timestamp') || first.includes('id')) lines.shift();
        const events = loadEvents();
        let count = 0;
        lines.forEach(line => {
          const cols = line.split(',');
          const ts = (cols[1] || cols[0] || '').replace(/^"|"$/g, '');
          const d = new Date(ts);
          if (!ts) return;
          if (isNaN(d.getTime())) return;
          events.push({ id: uid(), ts: d.toISOString() });
          count++;
        });
        events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
        saveEvents(events);
        alert(`Imported ${count} events`);
        render();
      };
      reader.readAsText(file);
    }

    function exportCSV() {
      const events = loadEvents();
      const rows = [['id','timestamp','date']];
      events.forEach(e => rows.push([e.id, e.ts, e.ts.slice(0,10)]));
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'breathefree-events.csv'; a.click(); URL.revokeObjectURL(url);
    }

    // Craving helpers
    const CRAVING_DURATION_MS = 5 * 60 * 1000; // 5 minutes
    let cravingInterval = null;

    function isCravingActive() {
      const c = loadCraving();
      return c && c.endTs && (new Date(c.endTs).getTime() > Date.now());
    }

    function startCraving() {
      // set end timestamp
      const endTs = Date.now() + CRAVING_DURATION_MS;
      saveCraving({ endTs });
      updateCravingUI();
      // interval tick
      if (cravingInterval) clearInterval(cravingInterval);
      cravingInterval = setInterval(() => {
        updateCravingUI();
        if (!isCravingActive()) {
          // completed
          clearInterval(cravingInterval);
          cravingInterval = null;
          completeCraving();
        }
      }, 1000);
    }

    function stopCraving() {
      // cancel timer
      saveCraving({ endTs: null });
      if (cravingInterval) { clearInterval(cravingInterval); cravingInterval = null; }
      updateCravingUI();
    }

    function remainingMs() {
      const c = loadCraving();
      if (!c || !c.endTs) return 0;
      return Math.max(0, new Date(c.endTs).getTime() - Date.now());
    }

    function formatMMSS(ms) {
      const totalSec = Math.ceil(ms / 1000);
      const mm = Math.floor(totalSec / 60);
      const ss = totalSec % 60;
      return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    }

    function completeCraving() {
      // add an achievement and compute saved (one cigarette price)
      const ach = loadAchievements();
      const now = new Date().toISOString();
      ach.unshift({ id: uid(), ts: now });
      saveAchievements(ach);

      // clear craving
      saveCraving({ endTs: null });
      updateCravingUI();
      render(); // will update saved amounts and awards

      // feedback
      alert('Great job — you completed a 5-minute craving! Achievement unlocked and one cigarette worth saved.');
    }

    function updateCravingUI() {
      const active = isCravingActive();
      // show timer
      if (cravingTimerEl) {
        if (active) {
          cravingTimerEl.textContent = 'Remaining: ' + formatMMSS(remainingMs());
        } else {
          cravingTimerEl.textContent = '';
        }
      }
      // toggle buttons
      const disableLogging = active;
      [addNowBtn, incrementBtn, addAtBtn].forEach(el => { if (el) el.disabled = disableLogging; });
      if (startCravingBtn) startCravingBtn.disabled = active;
      if (stopCravingBtn) stopCravingBtn.disabled = !active;
      // visual state
      if (startCravingBtn) startCravingBtn.classList.toggle('disabled', active);
    }

    // Achievements UI
    function renderAchievements() {
      const ach = loadAchievements();
      if (achCount) achCount.textContent = ach.length;
      if (!awardsList) return;
      awardsList.innerHTML = '';
      if (!ach.length) {
        const li = document.createElement('li'); li.textContent = 'No achievements yet — complete a 5-min craving to earn one.';
        awardsList.appendChild(li);
        return;
      }
      ach.slice(0, 50).forEach(a => {
        const li = document.createElement('li');
        li.textContent = `${a.ts.slice(0,10)} — ${new Date(a.ts).toLocaleTimeString()}`;
        awardsList.appendChild(li);
      });
    }

    // Stats & charts (same as before, plus saved)
    function isoDate(d = new Date()) { return d.toISOString().slice(0,10); }

    function countsLastNDays(n) {
      const events = loadEvents();
      const counts = {};
      for (let i = 0; i < n; i++) {
        const day = isoDate(new Date(Date.now() - i * 24 * 3600 * 1000));
        counts[day] = 0;
      }
      events.forEach(e => {
        const day = e.ts.slice(0,10);
        if (day in counts) counts[day]++;
      });
      return counts;
    }

    function updateStatsAndCharts() {
      const settings = loadSettings();
      const counts7 = countsLastNDays(7);
      const counts30 = countsLastNDays(30);

      // today's count
      const todayISO = isoDate();
      const todayCount = counts7[todayISO] || 0;
      if (countNumber) countNumber.textContent = todayCount;

      // avgs and totals
      const sum7 = Object.values(counts7).reduce((a,b) => a + b, 0);
      const sum30 = Object.values(counts30).reduce((a,b) => a + b, 0);
      if (avg7El) avg7El.textContent = (sum7 / 7).toFixed(1);
      if (avg30El) avg30El.textContent = (sum30 / 30).toFixed(1);

      const events = loadEvents();
      if (totalLoggedEl) totalLoggedEl.textContent = events.length;

      // money spent
      const moneySpent = (events.length * (parseFloat(settings.price) || 0));
      if (moneySpentEl) moneySpentEl.textContent = `${settings.currency || '$'}${moneySpent.toFixed(2)}`;

      // saved — computed from achievements count * price
      const ach = loadAchievements();
      const saved = (ach.length * (parseFloat(settings.price) || 0));
      if (savedAmountEl) savedAmountEl.textContent = `${settings.currency || '$'}${saved.toFixed(2)}`;

      // weekly chart
      if (weeklyCanvas) {
        const labels7 = [];
        const data7 = [];
        for (let i = 6; i >= 0; i--) {
          const day = isoDate(new Date(Date.now() - i * 24 * 3600 * 1000));
          labels7.push(day.slice(5));
          data7.push(counts7[day] || 0);
        }
        const target = parseFloat(settings.dailyTarget) || 0;
        const targetData = new Array(labels7.length).fill(target);

        if (!weeklyChart) {
          weeklyChart = new Chart(weeklyCanvas.getContext('2d'), {
            type: 'bar',
            data: {
              labels: labels7,
              datasets: [
                { label: 'Cigarettes', data: data7, backgroundColor: 'rgba(0,168,255,0.85)' },
                { label: 'Target', data: targetData, type: 'line', borderColor: 'rgba(255,125,85,0.95)', borderWidth: 2, pointRadius: 0, fill: false }
              ]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
          });
        } else {
          weeklyChart.data.labels = labels7;
          weeklyChart.data.datasets[0].data = data7;
          weeklyChart.data.datasets[1].data = targetData;
          weeklyChart.update();
        }
      }

      // monthly chart
      if (monthlyCanvas) {
        const labels30 = [];
        const data30 = [];
        const counts30map = countsLastNDays(30);
        for (let i = 29; i >= 0; i--) {
          const day = isoDate(new Date(Date.now() - i * 24 * 3600 * 1000));
          labels30.push(day);
          data30.push(counts30map[day] || 0);
        }
        if (!monthlyChart) {
          monthlyChart = new Chart(monthlyCanvas.getContext('2d'), {
            type: 'line',
            data: { labels: labels30, datasets: [{ label: 'Cigarettes', data: data30, borderColor: 'rgba(0,168,255,0.9)', backgroundColor: 'rgba(0,168,255,0.08)', fill: true, pointRadius: 1 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { beginAtZero: true } } }
          });
        } else {
          monthlyChart.data.labels = labels30;
          monthlyChart.data.datasets[0].data = data30;
          monthlyChart.update();
        }
      }
    }

    // events list
    function renderEventsList() {
      if (!eventsList) return;
      const events = loadEvents();
      eventsList.innerHTML = '';
      if (!events.length) {
        const li = document.createElement('li');
        li.className = 'event-item';
        li.textContent = 'No events yet — click "Log Now" to start tracking.';
        eventsList.appendChild(li);
        return;
      }
      events.forEach(e => {
        const li = document.createElement('li');
        li.className = 'event-item';
        const left = document.createElement('div'); left.className = 'event-left';
        const day = document.createElement('div'); day.className = 'event-day'; day.textContent = e.ts.slice(0,10);
        const when = document.createElement('div'); when.className = 'event-time'; when.textContent = new Date(e.ts).toLocaleString();
        left.appendChild(day); left.appendChild(when);

        const right = document.createElement('div'); right.className = 'event-actions';
        const del = document.createElement('button'); del.className = 'btn outline'; del.textContent = 'Delete';
        del.addEventListener('click', () => {
          if (confirm('Delete this event?')) removeEvent(e.id);
        });

        right.appendChild(del);
        li.appendChild(left);
        li.appendChild(right);
        eventsList.appendChild(li);
      });
    }

    // render achievements
    function renderAchievements() {
      const ach = loadAchievements();
      if (achCount) achCount.textContent = ach.length;
      if (!awardsList) return;
      awardsList.innerHTML = '';
      if (!ach.length) {
        const li = document.createElement('li'); li.textContent = 'No achievements yet — complete a 5-min craving to earn one.';
        awardsList.appendChild(li);
        return;
      }
      ach.slice(0,50).forEach(a => {
        const li = document.createElement('li');
        li.textContent = `${a.ts.slice(0,10)} — ${new Date(a.ts).toLocaleTimeString()}`;
        awardsList.appendChild(li);
      });
    }

    // update UI and charts
    function updateCravingUI() {
      const active = isCravingActive();
      if (cravingTimerEl) {
        if (active) cravingTimerEl.textContent = 'Remaining: ' + formatMMSS(Math.max(0, loadCraving().endTs - Date.now()));
        else cravingTimerEl.textContent = '';
      }
      // disable logging while active
      [addNowBtn, incrementBtn, addAtBtn].forEach(el => { if (el) el.disabled = active; });
      if (startCravingBtn) startCravingBtn.disabled = active;
      if (stopCravingBtn) stopCravingBtn.disabled = !active;
    }

    // helper to format mm:ss
    function formatMMSS(ms) {
      const total = Math.ceil(ms / 1000);
      const mm = Math.floor(total / 60);
      const ss = total % 60;
      return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    }

    // master render
    function render() {
      // default date
      if (dateInput) dateInput.value = isoDate();
      renderEventsList();
      renderAchievements();
      updateStatsAndCharts();
      updateCravingUI();
      if (undoBtn) undoBtn.disabled = !localStorage.getItem(UNDO_KEY);
    }

    // event wiring
    if (addNowBtn) addNowBtn.addEventListener('click', () => addEvent(new Date().toISOString()));
    if (incrementBtn) incrementBtn.addEventListener('click', () => addEvent(new Date().toISOString()));
    if (decrementBtn) decrementBtn.addEventListener('click', () => {
      const events = loadEvents();
      const date = dateInput ? dateInput.value || isoDate() : isoDate();
      const match = events.find(e => e.ts.slice(0,10) === date);
      if (!match) return alert('No events on selected date to remove.');
      if (!confirm('Remove the most recent event for this date?')) return;
      removeEvent(match.id);
    });
    if (addAtBtn) addAtBtn.addEventListener('click', () => {
      if (!datetimeInput || !datetimeInput.value) return alert('Pick date & time to add.');
      addEvent(new Date(datetimeInput.value).toISOString());
      datetimeInput.value = '';
    });

    if (exportBtn) exportBtn.addEventListener('click', exportCSV);
    if (exportEventsBtn) exportEventsBtn.addEventListener('click', exportCSV);

    if (fileImport) fileImport.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (!confirm(`Import ${f.name}?`)) return;
      importCSV(f);
      e.target.value = '';
    });

    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (!confirm('Clear all events?')) return;
      clearAll();
    });

    if (undoBtn) undoBtn.addEventListener('click', () => {
      const payload = popUndo();
      if (!payload) return alert('Nothing to undo.');
      if (payload.action === 'delete') {
        const events = loadEvents();
        events.push(payload.event);
        events.sort((a,b) => new Date(b.ts) - new Date(a.ts));
        saveEvents(events);
        render();
      } else if (payload.action === 'clear') {
        saveEvents(payload.events || []);
        render();
      }
    });

    // Start / Stop craving
    if (startCravingBtn) startCravingBtn.addEventListener('click', () => {
      if (isCravingActive()) return;
      startCraving();
    });
    if (stopCravingBtn) stopCravingBtn.addEventListener('click', () => {
      if (!isCravingActive()) return;
      if (confirm('Stop craving early? You will not earn the achievement.')) stopCraving();
    });

    // settings modal wiring (re-using existing inputs if available)
    const openSettingsBtn = $('openSettingsBtn');
    const settingsModal = $('settingsModal');
    const closeSettingsBtn = $('closeSettingsBtn');
    const saveSettingsBtn = $('saveSettingsBtn');
    const resetSettingsBtn = $('resetSettingsBtn');
    const cigPriceInput = $('cigPrice');
    const dailyTargetInput = $('dailyTarget');
    const currencyInput = $('currency');

    if (openSettingsBtn) openSettingsBtn.addEventListener('click', () => {
      const s = loadSettings();
      if (cigPriceInput) cigPriceInput.value = s.price;
      if (dailyTargetInput) dailyTargetInput.value = s.dailyTarget;
      if (currencyInput) currencyInput.value = s.currency;
      if (settingsModal) { settingsModal.classList.remove('hidden'); settingsModal.setAttribute('aria-hidden', 'false'); }
    });
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => { if (settingsModal) { settingsModal.classList.add('hidden'); settingsModal.setAttribute('aria-hidden','true'); } });
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
      const settings = {
        price: parseFloat(cigPriceInput && cigPriceInput.value) || 0,
        dailyTarget: parseInt(dailyTargetInput && dailyTargetInput.value, 10) || 0,
        currency: (currencyInput && currencyInput.value) || '$'
      };
      saveSettings(settings);
      if (settingsModal) { settingsModal.classList.add('hidden'); settingsModal.setAttribute('aria-hidden','true'); }
      render();
    });
    if (resetSettingsBtn) resetSettingsBtn.addEventListener('click', () => {
      if (!confirm('Reset settings to defaults?')) return;
      saveSettings({ price: 0.5, dailyTarget: 10, currency: '$' });
      render();
    });

    // keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'N' || e.key === 'n') && document.activeElement.tagName !== 'INPUT') addEvent(new Date().toISOString());
      if ((e.key === 'U' || e.key === 'u') && (!undoBtn || !undoBtn.disabled)) undoBtn && undoBtn.click();
      if ((e.key === 'E' || e.key === 'e') && document.activeElement.tagName !== 'INPUT') exportBtn && exportBtn.click();
    });

    // Timer resume on load (if craving active)
    (function resumeCravingIfActive() {
      const c = loadCraving();
      if (c && c.endTs && (new Date(c.endTs).getTime() > Date.now())) {
        // resume interval
        if (cravingInterval) clearInterval(cravingInterval);
        cravingInterval = setInterval(() => {
          updateCravingUI();
          if (!isCravingActive()) {
            clearInterval(cravingInterval);
            cravingInterval = null;
            completeCraving();
          }
        }, 1000);
      } else {
        saveCraving({ endTs: null });
      }
    })();

    // initial render
    render();
  }); // DOMContentLoaded end
})();
