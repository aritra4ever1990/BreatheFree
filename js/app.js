let data = loadData();

const smokeBtn = document.getElementById("smokeBtn");
const cravingBtn = document.getElementById("cravingBtn");

const smokedTodayEl = document.getElementById("smokedToday");
const walletEl = document.getElementById("walletAmount");
const awardEl = document.getElementById("awardAmount");
const streakEl = document.getElementById("streakCount");
const aiMsg = document.getElementById("aiMessage");

const spendEl = document.getElementById("spendAnalysis");
const heatmapEl = document.getElementById("heatmap");
const dangerEl = document.getElementById("dangerHours");

function render() {
  smokedTodayEl.innerText = data.smokedToday;
  walletEl.innerText = `₹${data.wallet}`;
  awardEl.innerText = `₹${data.awards}`;
  streakEl.innerText = data.streak;

  spendEl.innerHTML = getSpendAnalysis(data);
  heatmapEl.innerHTML = renderHeatmap(data);

  const danger = getDangerHours(data);
  dangerEl.innerText = dangerAI(danger);
}

smokeBtn.onclick = () => {
  data.smokedToday++;
  data.wallet -= 10;
  data.logs.push({ type: "smoke", time: new Date().toISOString() });
  aiMsg.innerText = smokeAI();
  saveData(data);
  render();
};

cravingBtn.onclick = () => {
  data.wallet += 10;
  data.awards += 10;
  data.cravingsPassed++;
  if (data.cravingsPassed % 5 === 0) data.streak++;
  data.logs.push({ type: "craving", time: new Date().toISOString() });
  aiMsg.innerText = cravingAI();
  saveData(data);
  render();
};

render();
