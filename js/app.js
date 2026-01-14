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

// PRICE SETUP (ask price if it's not set)
if (!data.price) {
  data.price = Number(prompt("Enter price per cigarette"));
  save();
}

// SMOKE BUTTON (adds one smoke to the logs)
smokeBtn.onclick = () => {
  const now = new Date();
  data.smokeLogs.push({ date: now.toISOString() });
  data.wallet -= data.price;
  save();
  render();
};

// CRAVING START
craveBtn.onclick = () => {
  cravingStart = Date.now();
  smokeBtn.disabled = true;
  stopCraveBtn.disabled = false;

  cravingTimer = setInterval(() => {
    const left = data.cravingEnd - Date.now();
    if (left <= 0) {
      completeCraving();
    } else {
      document.getElementById("statusText").textContent =
        `Craving started ⏳ ${Math.max(0, Math.floor(left / 1000))} seconds remaining`;
    }
  }, 1000);

  data.cravingEnd = Date.now() + 5 * 60 * 1000; // 5 minutes
  save();
  document.getElementById("statusText").textContent = `Craving started ⏳ 5:00`;
};

// STOP CRAVING BUTTON (ends craving early)
stopCraveBtn.onclick = () => {
  clearInterval(cravingTimer);
  data.cravingLogs.push({
    start: cravingStart,
    end: Date.now(),
    success: false,
  });
  resetCraving();
};

// When craving completes successfully (after 5 minutes)
function completeCraving() {
  clearInterval(cravingTimer);
  data.wallet += data.price;  // Award money
  data.awards += 10;  // Add award points
  data.cravingLogs.push({
    start: cravingStart,
    end: Date.now(),
    success: true
  });
  resetCraving();
}

// Reset craving (UI changes after completion)
function resetCraving() {
  smokeBtn.disabled = false;
  stopCraveBtn.disabled = true;
  document.getElementById("statusText").textContent =
    "Craving resolved 💪";
  save();
  render();
}

// CSV EXPORT (exports smoke and craving logs)
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

// SAVE & RENDER (update localStorage and refresh UI)
function save() {
  localStorage.setItem("breatheFree", JSON.stringify(data));
}

function render() {
  const today = new Date().toDateString();
  const todaySmokes = data.smokeLogs.filter(
    s => new Date(s.date).toDateString() === today
  );

  // Update Stats
  document.getElementById("smoked").textContent = todaySmokes.length;
  document.getElementById("wallet").textContent = "₹" + data.wallet;
  document.getElementById("awards").textContent = "₹" + data.awards;

  document.getElementById("totalCigs").textContent = data.smokeLogs.length;
  document.getElementById("moneySpent").textContent =
    data.smokeLogs.length * data.price;
  document.getElementById("moneySaved").textContent = data.awards;

  // Render Progress Chart (Line chart of cigarettes smoked over time)
  const ctx = document.getElementById("progressChart").getContext("2d");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.smokeLogs.map(log => new Date(log.date).toLocaleString()),
      datasets: [{
        label: 'Cigarettes Smoked',
        data: data.smokeLogs.map(() => 1), // Count each smoke as 1
        borderColor: 'rgb(75, 192, 192)',
        fill: false,
        tension: 0.1
      }]
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date & Time'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Cigarettes'
          },
          min: 0,
          max: 1
        }
      }
    }
  });

  // Render Spend Analysis
  document.getElementById("totalCigs").textContent = data.smokeLogs.length;
  document.getElementById("moneySpent").textContent =
    data.smokeLogs.length * data.price;
  document.getElementById("moneySaved").textContent = data.awards;
}

render();
