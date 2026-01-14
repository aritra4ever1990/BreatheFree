document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  /* ---------- SAFE ELEMENT MAP ---------- */
  const el = {
    streak: $("streak"),
    smokedToday: $("smokedToday"),
    wallet: $("wallet"),
    awards: $("awards"),
    clock: $("clock"),
    message: $("message"),
    aiInsight: $("aiInsight"),
    dangerHours: $("dangerHours"),
    heatmap: $("heatmap"),
    chart: $("progressChart"),

    smokeBtn: $("smokeBtn"),
    craveBtn: $("craveBtn"),
    stopBtn: $("stopBtn"),
  };

  /* ---------- STATE ---------- */
  const state = JSON.parse(localStorage.getItem("bf")) || {
    smoked: [],
    cravings: [],
    wallet: 0,
    awards: 0,
  };

  /* ---------- SAFE SETTERS ---------- */
  const setText = (node, value) => {
    if (node) node.textContent = value;
  };

  /* ---------- CLOCK ---------- */
  if (el.clock) {
    setInterval(() => {
      el.clock.textContent = new Date().toLocaleTimeString();
    }, 1000);
  }

  /* ---------- BUTTON HANDLERS ---------- */
  if (el.smokeBtn) {
    el.smokeBtn.onclick = () => {
      const now = new Date();
      state.smoked.push(now.toISOString());
      state.wallet -= 10;
      save();
      render();
    };
  }

  if (el.craveBtn) {
    el.craveBtn.onclick = () => {
      state.cravings.push(Date.now());
      setText(el.message, "Craving started ⏳ Stay strong.");
      save();
    };
  }

  if (el.stopBtn) {
    el.stopBtn.onclick = () => {
      setText(el.message, "You beat the craving 💪 Proud of you.");
    };
  }

  /* ---------- SAVE ---------- */
  function save() {
    localStorage.setItem("bf", JSON.stringify(state));
  }

  /* ---------- RENDER ---------- */
  function render() {
    setText(el.smokedToday, state.smoked.length);
    setText(el.wallet, `₹${state.wallet}`);
    setText(el.awards, `₹${state.awards}`);
    renderChart();
    renderHeatmap();
    renderAI();
  }

  /* ---------- CHART ---------- */
  function renderChart() {
    if (!el.chart || typeof Chart === "undefined") return;

    const hours = Array(24).fill(0);
    state.smoked.forEach(t => {
      hours[new Date(t).getHours()]++;
    });

    if (window._bfChart) window._bfChart.destroy();

    window._bfChart = new Chart(el.chart.getContext("2d"), {
      type: "line",
      data: {
        labels: hours.map((_, i) => `${i}:00`),
        datasets: [{
          label: "Cigarettes per Hour",
          data: hours,
          borderWidth: 3,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } }
      }
    });
  }

  /* ---------- HEATMAP ---------- */
  function renderHeatmap() {
    if (!el.heatmap) return;

    el.heatmap.innerHTML = "";
    const hours = Array(24).fill(0);

    state.smoked.forEach(t => {
      hours[new Date(t).getHours()]++;
    });

    hours.forEach(v => {
      const cell = document.createElement("div");
      cell.style.background = `rgba(255,0,0,${Math.min(v / 5, 1)})`;
      el.heatmap.appendChild(cell);
    });
  }

  /* ---------- AI COACH ---------- */
  function renderAI() {
    if (!el.aiInsight || !el.dangerHours) return;

    const counts = {};
    state.smoked.forEach(t => {
      const h = new Date(t).getHours();
      counts[h] = (counts[h] || 0) + 1;
    });

    const risky = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([h]) => `${h}:00`);

    setText(
      el.dangerHours,
      risky.length
        ? `🔥 Danger hours: ${risky.join(", ")}`
        : "No danger hours detected yet"
    );

    setText(
      el.aiInsight,
      risky.length
        ? `Coach tip: Your toughest window is ${risky[0]}. Plan a distraction before it hits.`
        : "Coach tip: You're building momentum. Stay sharp."
    );
  }

  /* ---------- INIT ---------- */
  render();
});
