document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const el = {
    smokedToday: $("smokedToday"),
    wallet: $("wallet"),
    awards: $("awards"),
    message: $("message"),
    aiInsight: $("aiInsight"),
    cravingTimer: $("cravingTimer"),

    smokeBtn: $("smokeBtn"),
    craveBtn: $("craveBtn"),
    stopBtn: $("stopBtn"),
  };

  /* ---------- STATE ---------- */
  const state = JSON.parse(localStorage.getItem("bf")) || {
    smoked: [],
    wallet: 0,
    awards: 0,
    craving: null, // { startTime, rewarded }
  };

  const CRAVING_DURATION = 5 * 60 * 1000; // 5 minutes

  /* ---------- HELPERS ---------- */
  const save = () =>
    localStorage.setItem("bf", JSON.stringify(state));

  const setText = (node, value) => {
    if (node) node.textContent = value;
  };

  /* ---------- BUTTONS ---------- */
  if (el.smokeBtn) {
    el.smokeBtn.onclick = () => {
      if (state.craving) return;

      state.smoked.push(Date.now());
      state.wallet -= 10;
      setText(el.message, "Noted. Awareness builds control.");
      save();
      render();
    };
  }

  if (el.craveBtn) {
    el.craveBtn.onclick = () => {
      if (state.craving) return;

      state.craving = {
        startTime: Date.now(),
        rewarded: false,
      };

      setText(
        el.message,
        "Craving started ⏳ Breathe. This urge will pass."
      );
      save();
      render();
    };
  }

  if (el.stopBtn) {
    el.stopBtn.onclick = () => {
      if (!state.craving) return;

      const elapsed = Date.now() - state.craving.startTime;

      if (elapsed >= CRAVING_DURATION && !state.craving.rewarded) {
        state.wallet += 10;
        state.awards += 10;
        state.craving.rewarded = true;

        setText(
          el.message,
          "🏆 Craving defeated! You just earned a reward."
        );
      } else {
        setText(
          el.message,
          "Craving stopped early. That’s okay — progress is learning."
        );
      }

      state.craving = null;
      save();
      render();
    };
  }

  /* ---------- CRAVING TIMER ---------- */
  function updateCravingTimer() {
    if (!state.craving) {
      setText(el.cravingTimer, "");
      if (el.smokeBtn) el.smokeBtn.disabled = false;
      return;
    }

    if (el.smokeBtn) el.smokeBtn.disabled = true;

    const elapsed = Date.now() - state.craving.startTime;
    const remaining = Math.max(0, CRAVING_DURATION - elapsed);

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000)
      .toString()
      .padStart(2, "0");

    setText(
      el.cravingTimer,
      `⏱️ Craving ends in ${mins}:${secs}`
    );

    if (remaining === 0 && !state.craving.rewarded) {
      state.wallet += 10;
      state.awards += 10;
      state.craving.rewarded = true;

      setText(
        el.message,
        "🔥 You rode the wave! Craving passed — reward unlocked."
      );
      setText(
        el.aiInsight,
        "Coach says: This is how rewiring happens. Remember this win."
      );
      save();
    }
  }

  /* ---------- RENDER ---------- */
  function render() {
    setText(el.smokedToday, state.smoked.length);
    setText(el.wallet, `₹${state.wallet}`);
    setText(el.awards, `₹${state.awards}`);
    updateCravingTimer();
  }

  /* ---------- TICK ---------- */
  setInterval(updateCravingTimer, 1000);

  render();
});
