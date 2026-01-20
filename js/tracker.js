// BreatheFree — robust UI event wiring + settings + charts
(function () {
  'use strict';

  // run only after DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    // local keys
    const EVENTS_KEY = 'breathefree:events';
    const SETTINGS_KEY = 'breathefree:settings';
    const UNDO_KEY = 'breathefree:undo';

    // safe query helper
    const $ = (id) => document.getElementById(id);

    // DOM refs (may be null if markup changed; code guards handle that)
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

    const weeklyCanvas = $('weeklyChart');
    const monthlyCanvas = $('monthlyChart');

    // settings modal elements
    const openSettingsBtn = $('openSettingsBtn');
    const settingsModal = $('settingsModal');
    const closeSettingsBtn = $('closeSettingsBtn');
    const saveSettingsBtn = $('saveSettingsBtn');
    const resetSettingsBtn = $('resetSettingsBtn');
    const cigPriceInput = $('cigPrice');
    const dailyTargetInput = $('dailyTarget');
    const currencyInput = $('currency');

    // Chart variables
    let weeklyChart = null;
    let monthlyChart = null;

    // storage helpers
    function loadEvents() {
      try {
        const raw = localStorage.getItem(EVENTS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('loadEvents error', e);
        return [];
      }
    }
    function saveEvents(events) {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    }
    function loadSettings() {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { price: 0.5, dailyTarget: 10, currency: '$' };
        return Object.assign({ price: 0.5, dailyTarget: 10, currency: '$' }, JSON.parse(raw));
      } catch (e) {
        return { price: 0.5, dailyTarget: 10, currency: '$' };
      }
    }
    function saveSettings(settings) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
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

    function uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    // Add a new event (timestamp ISO string)
    function addEvent(ts = new Date().toISOString()) {
      const events = loadEvents();
      events.push({ id: uid(), ts });
      events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
      saveEvents(events);
      render();
    }

    // Remove event by id
    function removeEvent(id) {
      const events = loadEvents();
      const idx = events.findIndex(e => e.id === id);
      if (idx === -1) return;
      const removed = events.splice(idx, 1)[0];
      pushUndo({ action: 'delete', event: removed });
      saveEvents(events);
      render();
    }

    // Clear all events
    function clearAll() {
      const events = loadEvents();
      if (!events.length) return;
      pushUndo({ action: 'clear', events });
      localStorage.removeItem(EVENTS_KEY);
      render();
    }

    // Import CSV (simple parser)
    function importCSV(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (!lines.length) return alert('Empty or invalid CSV.');
        // remove optional header row if detected
        const first = lines[0].toLowerCase();
        if (first.includes('timestamp') || first.includes('id')) lines.shift();
        const events = loadEvents();
        let count = 0;
        lines.forEach(line => {
          // naive parse: split by comma, take second col as timestamp or first
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

    // Export CSV
    function exportCSV() {
      const events = loadEvents();
      const rows = [['id','timestamp','date']];
      events.forEach(e => rows.push([e.id, e.ts, e.ts.slice(0,10)]));
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'breathefree-events.csv';
      a.click();
      URL.revokeObjectURL(url);
    }

    // helpers: iso date string and counts
    function isoDate(d = new Date()) {
      return d.toISOString().slice(0,10);
    }
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

    // update charts and stats
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

      const money = (events.length * (parseFloat(settings.price) || 0));
      if (moneySpentEl) moneySpentEl.textContent = `${settings.currency || '$'}${money.toFixed(2)}`;

      // weekly chart
      if (weeklyCanvas) {
        const labels7 = [];
        const data7 = [];
        for (let i = 6; i >= 0; i--) {
          const day = isoDate(new Date(Date.now() - i * 24 * 3600 * 1000));
          labels7.push(day.slice(5)); // MM-DD
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
        // compute counts30 once
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

    // render event list
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

    // master render
    function render() {
      // date default
      if (dateInput) dateInput.value = isoDate();
      renderEventsList();
      updateStatsAndCharts();
      if (undoBtn) undoBtn.disabled = !localStorage.getItem(UNDO_KEY);
    }

    // attach handlers (guarded)
    if (addNowBtn) addNowBtn.addEventListener('click', () => addEvent(new Date().toISOString()));
    if (incrementBtn) incrementBtn.addEventListener('click', () => addEvent(new Date().toISOString()));
    if (decrementBtn) decrementBtn.addEventListener('click', () => {
      // remove most recent event of selected date (default: today)
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

    // settings modal
    if (openSettingsBtn) openSettingsBtn.addEventListener('click', () => {
      const s = loadSettings();
      if (cigPriceInput) cigPriceInput.value = s.price;
      if (dailyTargetInput) dailyTargetInput.value = s.dailyTarget;
      if (currencyInput) currencyInput.value = s.currency;
      if (settingsModal) { settingsModal.classList.remove('hidden'); settingsModal.setAttribute('aria-hidden','false'); }
    });
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => {
      if (settingsModal) { settingsModal.classList.add('hidden'); settingsModal.setAttribute('aria-hidden','true'); }
    });
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

    // keyboard shortcuts: N log now, U undo, E export
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'N' || e.key === 'n') && document.activeElement.tagName !== 'INPUT') {
        addEvent(new Date().toISOString());
      }
      if ((e.key === 'U' || e.key === 'u') && !(!undoBtn || undoBtn.disabled)) {
        undoBtn && undoBtn.click();
      }
      if ((e.key === 'E' || e.key === 'e') && document.activeElement.tagName !== 'INPUT') {
        exportBtn && exportBtn.click();
      }
    });

    // initial render
    render();
  }); // DOMContentLoaded end
})();
