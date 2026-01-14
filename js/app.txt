document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const el = {
    smokedToday: $("smokedToday"),
    wallet: $("wallet"),
    awards: $("awards"),
    message: $("message"),
    aiInsight: $("aiInsight"),
    cravingTimer: $("cravingTimer"),
    dangerAlert: $("dangerAlert"),
    streak: $("streak"),

    smokeBtn: $("smokeBtn"),
    craveBtn: $("craveBtn"),
    stopBtn: $("stopBtn"),
    exportCSV: $("exportCSV"),
  };

  const CRAVING_DURATION = 5 * 60 * 1000;

  /* ---------- STATE ---------- */
  const state = JSON.parse(localStorage.getItem("bf")) || {
    smoked: [],
    cravings: [], // { start, end, success }
    wallet: 0,
    awards: 0,
    craving: null,
    streak: 0,
  };

  const save = () =>
    localStorage.setItem("bf", JSON.stringify(state));

  const setText = (n, v) => n && (n.textContent = v);

  /* ---------- SMOKE ---------- */
  el.smokeBtn.onclick = () => {
    if (state.craving) return;

    state.smoked.push(Date.now());
    state.streak = 0;
    state.wallet -= 10;

    setText(el.message, "Slip logged. Reset — not failure.");
    save();
    render();
  };

  /* ---------- CRAVING START ---------- */
  el.craveBtn.onclick = () => {
    if (state.craving) return;

    state.craving = {
      start: Date.now(),
      rewarded: false,
    };

    setText(
      el.message,
      "Craving started. Stay with the discomfort — it fades."
    );
    save();
    render();
  };

  /* ---------- CRAVING STOP ---------- */
  el.stopBtn.onclick = () => {
    if (!state.craving) return;

    const now = Date.now();
    const elapsed = now - state.craving.start;
    const success = elapsed >= CRAVING_DURATION;

    state.cravings.push({
      start: state.craving.start,
      end: now,
      success,
    });

    if (success) {
      state.wallet += 10;
      state.awards += 10;
      state.streak++;
      setText(
        el.message,
        "🏆 Craving defeated. Control reinforced."
      );
    } else {
      state.streak = 0;
      setText(
        el.message,
        "Stopped early. Awareness still counts."
      );
    }

    state.craving = null;
    save();
    render();
  };

  /* ---------- CRAVING TIMER ---------- */
  function updateCravingTimer() {
    if (!state.craving) {
      setText(el.cravingTimer, "");
      el.smokeBtn.disabled = false;
      return;
    }

    el.smokeBtn.disabled = true;

    const elapsed = Date.now() - state.craving.start;
    const remaining = Math.max(0, CRAVING_DURATION - elapsed);

    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000)
      .toString()
      .padStart(2, "0");

    setText(el.cravingTimer, `⏱️ ${m}:${s}`);

    if (remaining === 0 && !state.craving.rewarded) {
      state.wallet += 10;
      state.awards += 10;
      state.streak++;
      state.craving.rewarded = true;

      setText(
        el.message,
        "🔥 You rode it out. This is neuroplasticity in action."
      );
      save();
    }
  }

  /* ---------- DANGER HOURS ---------- */
  function detectDangerHours() {
    const hours = {};
    state.smoked.forEach((t) => {
      const h = new Date(t).getHours();
      hours[h] = (hours[h] || 0) + 1;
    });

    const top = Object.entries(hours)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([h]) => Number(h));

    const nowHour = new Date().getHours();
    if (top.includes(nowHour)) {
      setText(
        el.dangerAlert,
        "⚠️ This hour has been risky before. Pause & breathe."
      );
    } else {
      setText(el.dangerAlert, "");
    }

    return top;
  }

  /* ---------- AI INSIGHT ---------- */
  function aiInsight() {
    if (state.cravings.length < 3) return;

    const nightWins = state.cravings.filter((c) => {
      const h = new Date(c.start).getHours();
      return c.success && (h >= 20 || h < 5);
    }).length;

    const dayWins = state.cravings.filter((c) => {
      const h = new Date(c.start).getHours();
      return c.success && h >= 5 && h < 20;
    }).length;

    if (nightWins > dayWins) {
      setText(
        el.aiInsight,
        "🧠 You usually win cravings faster at night. Use evenings wisely."
      );
    }
  }

  /* ---------- CSV EXPORT ---------- */
  el.exportCSV.onclick = () => {
    let csv = "Type,Start,End,Duration(min),Success\n";

    state.smoked.forEach((t) => {
      csv += `Smoke,${new Date(t).toISOString()},,,\n`;
    });

    state.cravings.forEach((c) => {
      const dur = ((c.end - c.start) / 60000).toFixed(2);
      csv += `Craving,${new Date(c.start).toISOString()},${new Date(
        c.end
      ).toISOString()},${dur},${c.success}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "breathefree-report.csv";
    a.click();
  };

  /* ---------- RENDER ---------- */
  function render() {
    setText(el.smokedToday, state.smoked.length);
    setText(el.wallet, `₹${state.wallet}`);
    setText(el.awards, `₹${state.awards}`);
    setText(el.streak, `🔥 Streak: ${state.streak}`);

    detectDangerHours();
    aiInsight();
    updateCravingTimer();
  }

  setInterval(updateCravingTimer, 1000);
  render();
});
