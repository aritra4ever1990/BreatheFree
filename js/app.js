document.addEventListener("DOMContentLoaded", () => init());

function init() {
  const data = JSON.parse(localStorage.getItem("bf")) || {
    smoked: [],
    cravings: [],
    wallet: 0,
    awards: 0
  };

  const $ = id => document.getElementById(id);

  // CLOCK
  setInterval(() => {
    $("clock").textContent = new Date().toLocaleTimeString();
  }, 1000);

  // BUTTONS
  $("smokeBtn").onclick = () => addSmoke();
  $("craveBtn").onclick = () => startCraving();
  $("stopBtn").onclick = () => stopCraving();

  function addSmoke() {
    const now = new Date();
    data.smoked.push(now.toISOString());
    data.wallet -= 10;
    save();
    render();
  }

  function startCraving() {
    data.cravings.push(Date.now());
    $("message").textContent = "Craving started ⏳ Stay strong!";
    save();
  }

  function stopCraving() {
    $("message").textContent = "You beat the craving 💪";
  }

  function save() {
    localStorage.setItem("bf", JSON.stringify(data));
  }

  function render() {
    $("smokedToday").textContent = data.smoked.length;
    $("wallet").textContent = "₹" + data.wallet;
    $("awards").textContent = "₹" + Math.floor(data.awards);
    renderChart();
    renderHeatmap();
    aiInsight();
  }

  function renderChart() {
    const ctx = $("progressChart").getContext("2d");
    const hours = Array(24).fill(0);

    data.smoked.forEach(t => {
      hours[new Date(t).getHours()]++;
    });

    if (window.chart) window.chart.destroy();

    window.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [...Array(24).keys()].map(h => h + ":00"),
        datasets: [{
          label: "Cigarettes per Hour",
          data: hours,
          borderWidth: 3
        }]
      }
    });
  }

  function renderHeatmap() {
    const heat = Array(24).fill(0);
    data.smoked.forEach(t => heat[new Date(t).getHours()]++);

    $("heatmap").innerHTML = "";
    heat.forEach(v => {
      const d = document.createElement("div");
      d.style.background = `rgba(255,0,0,${v / 5})`;
      $("heatmap").appendChild(d);
    });
  }

  function aiInsight() {
    const counts = {};
    data.smoked.forEach(t => {
      const h = new Date(t).getHours();
      counts[h] = (counts[h] || 0) + 1;
    });

    const risky = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([h]) => `${h}:00`);

    $("dangerHours").textContent =
      risky.length
        ? `🔥 Risky hours: ${risky.join(", ")}`
        : "No risky hours yet";

    $("aiInsight").textContent =
      risky.length
        ? `Coach says: Your toughest window is ${risky[0]}. Plan a walk or tea break there.`
        : "Coach says: Strong start. Keep momentum.";
  }

  render();
}
