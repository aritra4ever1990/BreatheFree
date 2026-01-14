let data = loadData();
let cravingTimer = null;
let seconds = 300;

/* ---------- DOM ---------- */
const smokedEl = document.getElementById("smoked");
const streakEl = document.getElementById("streak");
const walletEl = document.getElementById("wallet");
const awardsEl = document.getElementById("awards");
const reflectionEl = document.getElementById("reflection"); // may be null

const progressCtx = document.getElementById("progressChart");
const spendCtx = document.getElementById("spendChart");

let progressChart, spendChart;

/* ---------- SAFE AI REFLECTION ---------- */
function setReflection(text) {
  if (!reflectionEl) return; // 🔐 prevents crash
  reflectionEl.textContent = text;
}

function aiReflection(type) {
  const smokeLines = [
    "Slip-ups happen. Awareness is progress.",
    "One cigarette doesn’t erase your effort.",
    "Pause. Reflect. Reset."
  ];

  const cravingLines = [
    "🔥 Strong will! You beat the urge.",
    "👏 That craving didn’t control you.",
    "💪 Each win rewires your brain."
  ];

  setReflection(
    type === "smoke"
      ? smokeLines[Math.floor(Math.random() * smokeLines.length)]
      : cravingLines[Math.floor(Math.random() * cravingLines.length)]
  );
}

/* ---------- UI ---------- */
function syncUI() {
  smokedEl.textContent = data.smoked;
  streakEl.textContent = data.streak;
  walletEl.textContent = "₹" + data.wallet;
  awardsEl.textContent = "₹" + data.awards;
}

/* ---------- SMOKE ---------- */
document.getElementById("smokeBtn").addEventListener("click", () => {
  if (data.smoked >= data.dailyLimit) {
    alert("Daily smoking limit reached");
    return;
  }

  if (!data.price) {
    data.price = Number(prompt("Price of one cigarette ₹"));
  }

  data.smoked++;
  data.wallet -= data.price;

  data.logs.push({
    type: "smoke",
    time: new Date().toISOString(),
    price: data.price
  });

  aiReflection("smoke");
  saveData(data);
  syncUI();
  updateCharts();
  renderHeatmap();
  renderDangerHours();
});

/* ---------- CRAVING ---------- */
document.getElementById("craveBtn").addEventListener("click", () => {
  if (cravingTimer) return;

  document.getElementById("timerBox").classList.remove("hidden");
  seconds = 300;

  cravingTimer = setInterval(() => {
    seconds--;

    document.getElementById("timer").textContent =
      `0${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

    if (seconds <= 0) {
      clearInterval(cravingTimer);
      cravingTimer = null;

      document.getElementById("timerBox").classList.add("hidden");

      data.cravingPasses++;
      data.awards += data.price;

      if (data.cravingPasses % 5 === 0) data.streak++;

      data.logs.push({
        type: "craving",
        time: new Date().toISOString()
      });

      alert("🎉 Craving passed! Reward added.");
      aiReflection("craving");

      saveData(data);
      syncUI();
      updateCharts();
      renderHeatmap();
    }
  }, 1000);
});

/* ---------- CHARTS ---------- */
function updateCharts() {
  const smokeByDay = {};
  const spendByDay = {};

  data.logs.forEach(l => {
    const day = l.time.split("T")[0];
    if (l.type === "smoke") {
      smokeByDay[day] = (smokeByDay[day] || 0) + 1;
      spendByDay[day] = (spendByDay[day] || 0) + l.price;
    }
  });

  const labels = Object.keys(smokeByDay);

  if (progressChart) progressChart.destroy();
  progressChart = new Chart(progressCtx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Cigarettes",
        data: labels.map(d => smokeByDay[d]),
        borderColor: "#38bdf8",
        tension: 0.4
      }]
    }
  });

  if (spendChart) spendChart.destroy();
  spendChart = new Chart(spendCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "₹ Spent",
        data: labels.map(d => spendByDay[d] || 0),
        backgroundColor: "#f87171"
      }]
    }
  });
}

/* ---------- HEATMAP ---------- */
function renderHeatmap() {
  const heat = document.getElementById("heatmap");
  if (!heat) return;

  heat.innerHTML = "";
  for (let h = 0; h < 24; h++) {
    const count = data.logs.filter(
      l => l.type === "smoke" && new Date(l.time).getHours() === h
    ).length;

    const cell = document.createElement("div");
    cell.className = "heat";
    cell.style.opacity = Math.min(1, count / 4);
    heat.appendChild(cell);
  }
}

/* ---------- DANGER HOURS ---------- */
function renderDangerHours() {
  const hourCount = {};
  data.logs.forEach(l => {
    if (l.type === "smoke") {
      const h = new Date(l.time).getHours();
      hourCount[h] = (hourCount[h] || 0) + 1;
    }
  });

  const danger = Object.keys(hourCount)
    .sort((a, b) => hourCount[b] - hourCount[a])[0];

  if (danger !== undefined) {
    setReflection(`⚠️ High-risk time: ${danger}:00–${+danger + 1}:00`);
  }
}

/* ---------- INIT ---------- */
syncUI();
updateCharts();
renderHeatmap();
renderDangerHours();
