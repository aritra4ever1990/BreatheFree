let data = loadData();
let cravingTimer;
let seconds = 300;

const smokedEl = document.getElementById("smoked");
const streakEl = document.getElementById("streak");
const walletEl = document.getElementById("wallet");
const awardsEl = document.getElementById("awards");

function syncUI() {
  smokedEl.textContent = data.smoked;
  streakEl.textContent = data.streak;
  walletEl.textContent = "₹" + data.wallet;
  awardsEl.textContent = "₹" + data.awards;
}

syncUI();

/* 🚬 Smoke */
document.getElementById("smokeBtn").onclick = () => {
  if (data.smoked >= data.dailyLimit) {
    alert("Daily limit reached!");
    return;
  }

  if (!data.price) {
    data.price = parseFloat(prompt("Cigarette price ₹"));
  }

  data.smoked++;
  data.wallet -= data.price;

  data.logs.push({
    type: "smoke",
    time: new Date()
  });

  saveData(data);
  syncUI();
  updateCharts();
};

/* 😣 Craving */
document.getElementById("craveBtn").onclick = () => {
  if (cravingTimer) return;

  document.getElementById("timerBox").classList.remove("hidden");
  seconds = 300;

  cravingTimer = setInterval(() => {
    seconds--;
    document.getElementById("timer").textContent =
      `0${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;

    if (seconds <= 0) {
      clearInterval(cravingTimer);
      cravingTimer = null;
      document.getElementById("timerBox").classList.add("hidden");

      data.cravingPasses++;
      data.awards += data.price;

      if (data.cravingPasses % 5 === 0) data.streak++;

      data.logs.push({
        type: "craving",
        time: new Date()
      });

      saveData(data);
      syncUI();
      updateCharts();
    }
  }, 1000);
};

/* 📊 Charts */
let progressChart, spendChart;

function updateCharts() {
  const days = {};
  data.logs.forEach(l => {
    const d = new Date(l.time).toDateString();
    days[d] = (days[d] || 0) + (l.type === "smoke" ? 1 : 0);
  });

  if (progressChart) progressChart.destroy();
  progressChart = new Chart(progressChartCtx, {
    type: "line",
    data: {
      labels: Object.keys(days),
      datasets: [{ label: "Smokes", data: Object.values(days) }]
    }
  });
}

const progressChartCtx = document.getElementById("progressChart");
const spendChartCtx = document.getElementById("spendChart");

/* 🔥 Heatmap */
function renderHeatmap() {
  const heat = document.getElementById("heatmap");
  heat.innerHTML = "";
  for (let i = 0; i < 24; i++) {
    const count = data.logs.filter(
      l => new Date(l.time).getHours() === i && l.type === "smoke"
    ).length;
    const cell = document.createElement("div");
    cell.className = "heat";
    cell.style.opacity = Math.min(1, count / 5);
    heat.appendChild(cell);
  }
}

renderHeatmap();
updateCharts();
