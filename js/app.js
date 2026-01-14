const STORAGE = "breathefree-data";
const CRAVING_KEY = "cravingEndTime";

const defaultData = {
  smokedToday: 0,
  streak: 0,
  wallet: 0,
  awards: 0,
  price: 10,
  cravingPasses: 0,
  logs: []
};

let data = JSON.parse(localStorage.getItem(STORAGE)) || defaultData;

function save() {
  localStorage.setItem(STORAGE, JSON.stringify(data));
}

function syncUI() {
  streak.textContent = data.streak;
  smoked.textContent = data.smokedToday;
  wallet.textContent = data.wallet;
  awards.textContent = data.awards;
}

const quotes = {
  smoke: [
    "A slip doesn’t erase progress. Awareness matters.",
    "Notice the trigger — that’s growth already.",
    "Be patient with yourself. Change is hard."
  ],
  craving: [
    "You stayed present — the urge passed.",
    "That was discipline in action.",
    "Each resisted craving builds strength."
  ]
};

function showQuote(type) {
  aiQuote.textContent = quotes[type][Math.floor(Math.random()*quotes[type].length)];
  aiQuote.classList.remove("hidden");
  setTimeout(() => aiQuote.classList.add("hidden"), 5000);
}

smokeBtn.onclick = () => {
  data.smokedToday++;
  data.wallet -= data.price;
  data.logs.push({ type: "smoke", time: new Date().toISOString(), price: data.price });
  showQuote("smoke");
  save();
  syncUI();
  updateCharts();
  renderHeatmap();
};

craveBtn.onclick = () => {
  if (localStorage.getItem(CRAVING_KEY)) return;
  const end = Date.now() + 5*60*1000;
  localStorage.setItem(CRAVING_KEY, end);
  startCravingTimer();
};

function startCravingTimer() {
  timerBox.classList.remove("hidden");

  const interval = setInterval(() => {
    const end = Number(localStorage.getItem(CRAVING_KEY));
    const remain = Math.floor((end - Date.now()) / 1000);

    if (remain <= 0) {
      clearInterval(interval);
      localStorage.removeItem(CRAVING_KEY);
      timerBox.classList.add("hidden");

      data.cravingPasses++;
      data.awards += data.price;

      if (data.cravingPasses % 5 === 0) data.streak++;

      data.logs.push({ type: "craving", time: new Date().toISOString(), price: data.price });
      showQuote("craving");
      save();
      syncUI();
      updateCharts();
      renderHeatmap();
      return;
    }

    timer.textContent = `Craving ends in ${Math.floor(remain/60)}:${String(remain%60).padStart(2,"0")}`;
  }, 1000);
}

if (localStorage.getItem(CRAVING_KEY)) startCravingTimer();

let progressChart, spendChart;

function updateCharts() {
  const days = {};
  const spend = {};

  data.logs.forEach(l => {
    const d = new Date(l.time).toLocaleDateString();
    days[d] = (days[d] || 0) + (l.type === "smoke" ? 1 : 0);
    if (l.type === "smoke") spend[d] = (spend[d] || 0) + l.price;
  });

  progressChart?.destroy();
  spendChart?.destroy();

  progressChart = new Chart(progressChartEl, {
    type: "line",
    data: { labels: Object.keys(days), datasets: [{ label: "Cigarettes", data: Object.values(days) }] }
  });

  spendChart = new Chart(spendChartEl, {
    type: "bar",
    data: { labels: Object.keys(spend), datasets: [{ label: "₹ Spent", data: Object.values(spend) }] }
  });
}

function renderHeatmap() {
  heatmap.innerHTML = "";
  const hours = Array(24).fill(0);
  data.logs.forEach(l => hours[new Date(l.time).getHours()]++);
  hours.forEach((v,i)=>{
    const d=document.createElement("div");
    d.style.background=`rgba(14,165,233,${Math.min(.9,v/5+.1)})`;
    d.textContent=`${i}:00`;
    heatmap.appendChild(d);
  });
}

syncUI();
updateCharts();
renderHeatmap();
