const PRICE_PER_CIG = 10;

let data = JSON.parse(localStorage.getItem("breathefree")) || {
  smoked: [],
  cravings: [],
};

let cravingTimer = null;
let cravingStart = null;

// DOM
const smokedEl = document.getElementById("smoked");
const walletEl = document.getElementById("wallet");
const awardsEl = document.getElementById("awards");
const progressList = document.getElementById("progressList");
const spendInfo = document.getElementById("spendInfo");
const cravingInfo = document.getElementById("cravingInfo");

const smokeBtn = document.getElementById("smokeBtn");
const craveBtn = document.getElementById("craveBtn");
const stopCraveBtn = document.getElementById("stopCraveBtn");

// Live Time
setInterval(() => {
  document.getElementById("liveTime").innerText =
    " • " + new Date().toLocaleTimeString();
}, 1000);

// Smoke
smokeBtn.onclick = () => {
  data.smoked.push({ time: new Date().toISOString() });
  save();
};

// Craving
craveBtn.onclick = () => {
  cravingStart = Date.now();
  smokeBtn.disabled = true;
  stopCraveBtn.disabled = false;

  cravingTimer = setInterval(() => {
    const sec = Math.floor((Date.now() - cravingStart) / 1000);
    cravingInfo.innerText = `⏳ Craving running: ${sec}s`;
  }, 1000);
};

stopCraveBtn.onclick = () => {
  clearInterval(cravingTimer);
  const duration = Math.floor((Date.now() - cravingStart) / 1000);
  data.cravings.push({
    start: new Date(cravingStart).toISOString(),
    duration,
  });

  cravingInfo.innerText = `✅ Craving stopped (${duration}s)`;
  smokeBtn.disabled = false;
  stopCraveBtn.disabled = true;
  save();
};

// Save + Render
function save() {
  localStorage.setItem("breathefree", JSON.stringify(data));
  render();
}

function render() {
  smokedEl.innerText = data.smoked.length;

  const spent = data.smoked.length * PRICE_PER_CIG;
  walletEl.innerText = `₹-${spent}`;
  awardsEl.innerText = `₹${Math.max(0, spent * 0.3)}`;

  progressList.innerHTML = "";
  data.smoked.forEach((s, i) => {
    const li = document.createElement("li");
    li.innerText = `#${i + 1} • ${new Date(s.time).toLocaleString()}`;
    progressList.appendChild(li);
  });

  spendInfo.innerHTML = `
    🚬 Cigarettes: ${data.smoked.length}<br/>
    💸 Spent: ₹${spent}<br/>
    💚 Saved: ₹${spent * 0.3}
  `;
}

// CSV Export
function exportCSV() {
  let rows = [["Type", "Date", "Time", "Duration(s)"]];

  data.smoked.forEach(s => {
    const d = new Date(s.time);
    rows.push(["Smoke", d.toLocaleDateString(), d.toLocaleTimeString(), ""]);
  });

  data.cravings.forEach(c => {
    const d = new Date(c.start);
    rows.push(["Craving", d.toLocaleDateString(), d.toLocaleTimeString(), c.duration]);
  });

  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "breathefree-report.csv";
  a.click();
}

render();
