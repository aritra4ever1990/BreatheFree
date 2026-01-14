/* ================= SAFE DATA LOAD ================= */
let raw = loadData();

/* 🔐 Auto-heal missing fields */
let data = {
  smoked: raw.smoked ?? 0,
  streak: raw.streak ?? 0,
  wallet: raw.wallet ?? 0,
  awards: raw.awards ?? 0,
  cravingPasses: raw.cravingPasses ?? 0,
  price: raw.price ?? 0,
  dailyLimit: raw.dailyLimit ?? 15,
  logs: Array.isArray(raw.logs) ? raw.logs : []
};

saveData(data); // persist healed data

/* ================= DOM ================= */
const smokedEl = document.getElementById("smoked");
const streakEl = document.getElementById("streak");
const walletEl = document.getElementById("wallet");
const awardsEl = document.getElementById("awards");

const progressCtx = document.getElementById("progressChart");
const spendCtx = document.getElementById("spendChart");

let progressChart, spendChart;
let cravingTimer = null;
let seconds = 300;

/* ================= UI ================= */
function syncUI() {
  smokedEl.textContent = data.smoked;
  streakEl.textContent = data.streak;
  walletEl.textContent = "₹" + data.wallet;
  awardsEl.textContent = "₹" + data.awards;
}

syncUI();

/* ================= SMOKE ================= */
document.getElementById("smokeBtn").addEventListener("click", () => {
  if (data.smoked >= data.dailyLimit) {
    alert("Daily limit reached");
    return;
  }

  if (!data.price || data.price <= 0) {
    data.price = Number(prompt("Price of one cigarette ₹"));
    if (!data.price) return;
  }

  data.smoked++;
  data.wallet -= data.price;

  data.logs.push({
    type: "smoke",
    time: new Date().toISOString(),
    price: data.price
  });

  saveData(data);
  syncUI();
  updateCharts();
  renderHeatmap();
});

/* ================= CRAVING ================= */
document.getElementById("craveBtn").addEventListener("click", () => {
  if (cravingTimer) return;

  const timerBox = document.getElementById("timerBox");
  const timerText = document.getElementById("timer");

  timerBox.classList.remove("hidden");
  seconds = 300;

  cravingTimer = setInterval(() => {
    seconds--;
    timerText.textContent =
      `0${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

    if (seconds <= 0) {
      clearInterval(cravingTimer);
      cravingTimer = null;
      timerBox.classList.add("hidden");

      data.cravingPasses++;
      data.awards += data.price;

      if (data.cravingPasses % 5 === 0) {
        data.streak++;
      }

      data.logs.push({
        type: "craving",
        time: new Date().toISOString()
      });

      alert("🎉 Craving passed! Reward added.");

      saveData(data);
      syncUI();
      updateCharts();
      renderHeatmap();
    }
  }, 1000);
});

/* ================= CHARTS ================= */
function updateCharts() {
  const smokeByDay = {};
  const spendByDay = {};

  data.logs.forEach(l => {
    if (l.type !== "smoke") return;

    const day = l.time.split("T")[0];
    smokeByDay[day] = (smokeByDay[day] || 0) + 1;
    spendByDay[day] = (spendByDay[day] || 0) + l.price;
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
        data: labels.map(d => spendByDay[d]),
        backgroundColor: "#f87171"
      }]
    }
  });
}

/* ================= HEATMAP ================= */
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

/* ================= INIT ================= */
updateCharts();
renderHeatmap();
