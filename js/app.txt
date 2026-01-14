/* ==================================================
   BREATHEFREE – FINAL APP.JS (Coach AI Edition)
================================================== */

/* ---------- CONFIG ---------- */
const PRICE_PER_CIG = 10;
const CRAVING_DURATION = 300; // seconds

/* ---------- STATE ---------- */
let data = JSON.parse(localStorage.getItem("breatheFreeData")) || {
  smokeLogs: [],
  cravings: [],
  wallet: 0,
  awards: 0,
  streak: 0,
};

let cravingTimer = null;
let cravingStart = null;
let chartMode = "hourly";

/* ---------- DOM ---------- */
const smokedEl = document.getElementById("smokedToday");
const walletEl = document.getElementById("wallet");
const awardsEl = document.getElementById("awards");
const streakEl = document.getElementById("streak");
const messageEl = document.getElementById("message");
const dangerEl = document.getElementById("dangerHours");
const insightEl = document.getElementById("aiInsight");
const smokeBtn = document.getElementById("smokeBtn");

/* ---------- INIT ---------- */
render();
restoreCraving();

/* ==================================================
   COACH AI MESSAGES
================================================== */
const coach = {
  smoke: [
    "No guilt. Awareness is the first win. Let’s reset and move forward.",
    "You noticed the urge — that itself is progress.",
    "One moment doesn’t define your journey. You’re still in control."
  ],
  cravingStart: [
    "Strong move choosing to pause instead of react.",
    "You’re riding the wave, not fighting it. Breathe.",
    "This urge will peak and fall. Stay with it."
  ],
  cravingWin: [
    "That urge passed — because you stayed present. Well done.",
    "This is how habits break. One craving at a time.",
    "Huge win. Your brain just learned a new pattern."
  ],
  cravingStop: [
    "Stopping is also information. Learn and continue.",
    "No failure here — just feedback.",
  ]
};

function randomMsg(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ==================================================
   SMOKE LOGIC
================================================== */
function addSmoke() {
  if (cravingTimer) return;

  const now = new Date();
  data.smokeLogs.push({ date: now.toISOString() });
  data.wallet -= PRICE_PER_CIG;

  messageEl.innerText = randomMsg(coach.smoke);

  save();
  render();
}

/* ==================================================
   CRAVING LOGIC
================================================== */
function startCraving() {
  if (cravingTimer) return;

  cravingStart = Date.now();
  smokeBtn.disabled = true;

  messageEl.innerText = randomMsg(coach.cravingStart);

  cravingTimer = setTimeout(() => {
    data.awards += PRICE_PER_CIG;
    data.streak += 1;

    data.cravings.push({
      start: new Date(cravingStart).toISOString(),
      duration: CRAVING_DURATION,
      success: true
    });

    messageEl.innerText = randomMsg(coach.cravingWin);

    cravingTimer = null;
    cravingStart = null;
    smokeBtn.disabled = false;

    save();
    render();
  }, CRAVING_DURATION * 1000);

  saveCraving();
}

function stopCraving() {
  if (!cravingTimer) return;

  clearTimeout(cravingTimer);

  const duration = Math.floor((Date.now() - cravingStart) / 1000);

  data.cravings.push({
    start: new Date(cravingStart).toISOString(),
    duration,
    success: false
  });

  messageEl.innerText = randomMsg(coach.cravingStop);

  cravingTimer = null;
  cravingStart = null;
  smokeBtn.disabled = false;

  save();
  render();
}

function restoreCraving() {
  const saved = JSON.parse(localStorage.getItem("cravingState"));
  if (!saved) return;

  const elapsed = Math.floor((Date.now() - saved.start) / 1000);
  if (elapsed >= CRAVING_DURATION) return;

  cravingStart = saved.start;
  smokeBtn.disabled = true;

  cravingTimer = setTimeout(() => {
    data.awards += PRICE_PER_CIG;
    data.streak += 1;

    cravingTimer = null;
    cravingStart = null;
    smokeBtn.disabled = false;

    save();
    render();
  }, (CRAVING_DURATION - elapsed) * 1000);
}

/* ==================================================
   ANALYTICS
================================================== */
function getHourlyCounts() {
  const hours = Array(24).fill(0);
  data.smokeLogs.forEach(l => {
    hours[new Date(l.date).getHours()]++;
  });
  return hours;
}

function getDailyCounts() {
  const map = {};
  data.smokeLogs.forEach(l => {
    const d = new Date(l.date).toDateString();
    map[d] = (map[d] || 0) + 1;
  });
  return map;
}

/* 🔥 Danger Hours */
function renderDangerHours() {
  const hours = getHourlyCounts();
  const ranked = hours
    .map((v, i) => ({ hour: i, count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  dangerEl.innerHTML = ranked
    .filter(r => r.count > 0)
    .map(r => `🔥 ${r.hour}:00–${r.hour + 1}:00 (${r.count})`)
    .join("<br>");

  if (ranked[0]?.count > 0) {
    insightEl.innerText =
      `🧠 Pattern spotted: evenings around ${ranked[0].hour}:00 seem toughest. Let’s plan support there.`;
  }
}

/* 🌡️ Heatmap */
function renderHeatmap() {
  const hours = getHourlyCounts();
  const max = Math.max(...hours, 1);
  const container = document.getElementById("heatmap");
  container.innerHTML = "";

  hours.forEach((v, h) => {
    const div = document.createElement("div");
    div.className = "heat-cell";
    div.style.opacity = v / max;
    div.innerText = h;
    container.appendChild(div);
  });
}

/* 📊 Chart */
function renderChart() {
  const ctx = document.getElementById("progressChart").getContext("2d");
  if (window.chart) window.chart.destroy();

  let labels = [];
  let values = [];

  if (chartMode === "hourly") {
    labels = [...Array(24).keys()].map(h => `${h}:00`);
    values = getHourlyCounts();
  } else {
    const d = getDailyCounts();
    labels = Object.keys(d);
    values = Object.values(d);
  }

  window.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Cigarettes",
        data: values,
        borderColor: "#00c8c8",
        backgroundColor: "rgba(0,200,200,0.25)",
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      scales: { y: { beginAtZero: true } }
    }
  });
}

/* ==================================================
   CSV EXPORT
================================================== */
function exportCSV() {
  const rows = [["Date", "Time", "Type", "Details"]];

  data.smokeLogs.forEach(l => {
    const d = new Date(l.date);
    rows.push([d.toDateString(), d.toTimeString(), "Smoke", "1 cigarette"]);
  });

  data.cravings.forEach(c => {
    const d = new Date(c.start);
    rows.push([
      d.toDateString(),
      d.toTimeString(),
      "Craving",
      `${c.duration}s – ${c.success ? "Passed" : "Stopped"}`
    ]);
  });

  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "breathefree_report.csv";
  a.click();
}

/* ==================================================
   RENDER
================================================== */
function render() {
  const today = new Date().toDateString();
  const smokedToday = data.smokeLogs.filter(
    l => new Date(l.date).toDateString() === today
  ).length;

  smokedEl.innerText = smokedToday;
  walletEl.innerText = `₹${data.wallet}`;
  awardsEl.innerText = `₹${data.awards}`;
  streakEl.innerText = data.streak;

  renderChart();
  renderDangerHours();
  renderHeatmap();
}

/* ==================================================
   STORAGE
================================================== */
function save() {
  localStorage.setItem("breatheFreeData", JSON.stringify(data));
  localStorage.removeItem("cravingState");
}

function saveCraving() {
  localStorage.setItem(
    "cravingState",
    JSON.stringify({ start: cravingStart })
  );
}

/* ==================================================
   TOGGLE
================================================== */
function toggleChart(mode) {
  chartMode = mode;
  renderChart();
}
