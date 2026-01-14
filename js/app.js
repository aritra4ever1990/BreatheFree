let data = JSON.parse(localStorage.getItem("breatheFree")) || {
  smokeLogs: [],
  cravingLogs: [],
  wallet: 0,
  awards: 0,
  price: null,
  cravingEnd: null,
};

const smokeBtn = document.getElementById("smokeBtn");
const craveBtn = document.getElementById("craveBtn");
const stopCraveBtn = document.getElementById("stopCraveBtn");

let cravingTimer = null;
let cravingStart = null;

// CLOCK
setInterval(() => {
  document.getElementById("clock").textContent =
    new Date().toLocaleTimeString();
}, 1000);

// PRICE SETUP
if (!data.price) {
  data.price = Number(prompt("Enter price per cigarette"));
  save();
}

// SMOKE BUTTON
smokeBtn.onclick = () => {
  const now = new Date();
  data.smokeLogs.push({ date: now.toISOString() });
  data.wallet -= data.price;
  save();
  render();
};

// CRAVING TIMER
craveBtn.onclick = () => {
  cravingStart = Date.now();
  smokeBtn.disabled = true;
  stopCraveBtn.disabled = false;

  cravingTimer = setInterval(() => {
    const left = data.cravingEnd - Date.now();
    if (left <= 0) {
      completeCraving();
    }
  }, 1000);

  data.cravingEnd = Date.now() + 5 * 60 * 1000; // 5 minutes
  save();
  document.getElementById("statusText").textContent = "Craving started ⏳";
};

// STOP CRAVING BUTTON
stopCraveBtn.onclick = () => {
  clearInterval(cravingTimer);
  data.cravingLogs.push({
    start: cravingStart,
    end: Date.now(),
    success: false,
  });
  resetCraving();
};

function resetCraving() {
  smokeBtn.disabled = false;
  stopCraveBtn.disabled = true;
  document.getElementById("statusText").textContent = "Craving resolved 💪";
  save();
  render();
}

function completeCraving() {
  clearInterval(cravingTimer);
  data.wallet += data.price;
  data.awards += 10;
  data.cravingLogs.push({
    start: cravingStart,
    end: Date.now(),
    success: true,
  });
  resetCraving();
}

// CSV EXPORT
document.getElementById("exportCSV").onclick = () => {
  let rows = ["Type,Date,Time,Duration(s)"];
  data.smokeLogs.forEach(s => {
    let d = new Date(s.date);
    rows.push(`Smoke,${d.toLocaleDateString()},${d.toLocaleTimeString()},`);
  });
  data.cravingLogs.forEach(c => {
    let mins = ((c.end - c.start) / 1000).toFixed(1);
    let d = new Date(c.start);
    rows.push(`Craving,${d.toLocaleDateString()},${d.toLocaleTimeString()},${mins}`);
  });

  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "breathefree-report.csv";
  a.click();
};

// SAVE & RENDER
function save() {
  localStorage.setItem("breatheFree", JSON.stringify(data));
}

function render() {
  // Render Streak, Smoked Today, Wallet, Awards
  document.getElementById("smoked").textContent = data.smokeLogs.length;
  document.getElementById("wallet").textContent = `₹${data.wallet}`;
  document.getElementById("awards").textContent = `₹${data.awards}`;

  // Render Progress Chart
  const ctx = document.getElementById("progressChart").getContext("2d");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.smokeLogs.map(log => new Date(log.date).toLocaleTimeString()),
      datasets: [{
        label: 'Cigarettes Smoked',
        data: data.smokeLogs.map(() => 1),
        borderColor: 'rgb(75, 192, 192)',
        fill: false,
      }]
    }
  });

  // Render Spend Analysis
  document.getElementById("totalCigs").textContent = data.smokeLogs.length;
  document.getElementById("moneySpent").textContent = data.smokeLogs.length * data.price;
  document.getElementById("moneySaved").textContent = data.awards;
}

render();
