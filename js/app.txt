let data = JSON.parse(localStorage.getItem("breatheFree")) || {
  smokeLogs: [],
  cravingLogs: [],
  wallet: 0,
  awards: 0,
  price: null
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

// SMOKE
smokeBtn.onclick = () => {
  const now = new Date();
  data.smokeLogs.push({ date: now.toISOString() });
  data.wallet -= data.price;
  save();
  render();
};

// CRAVING START
craveBtn.onclick = () => {
  smokeBtn.disabled = true;
  stopCraveBtn.disabled = false;
  cravingStart = Date.now();

  cravingTimer = setTimeout(() => {
    data.wallet += data.price;
    data.awards += 10;
    data.cravingLogs.push({
      start: cravingStart,
      end: Date.now(),
      success: true
    });
    resetCraving();
  }, 5 * 60 * 1000);

  document.getElementById("statusText").textContent =
    "Craving started… stay strong ⏳";
};

// CRAVING STOP
stopCraveBtn.onclick = () => {
  clearTimeout(cravingTimer);
  data.cravingLogs.push({
    start: cravingStart,
    end: Date.now(),
    success: false
  });
  resetCraving();
};

function resetCraving() {
  smokeBtn.disabled = false;
  stopCraveBtn.disabled = true;
  document.getElementById("statusText").textContent =
    "Craving resolved 💪";
  save();
  render();
}

// CSV EXPORT
document.getElementById("exportCSV").onclick = () => {
  let rows = ["Type,Date,Time,Duration(min)"];
  data.smokeLogs.forEach(s => {
    let d = new Date(s.date);
    rows.push(`Smoke,${d.toLocaleDateString()},${d.toLocaleTimeString()},`);
  });
  data.cravingLogs.forEach(c => {
    let mins = ((c.end - c.start) / 60000).toFixed(1);
    let d = new Date(c.start);
    rows.push(`Craving,${d.toLocaleDateString()},${d.toLocaleTimeString()},${mins}`);
  });

  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
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
  const today = new Date().toDateString();
  const todaySmokes = data.smokeLogs.filter(
    s => new Date(s.date).toDateString() === today
  );

  document.getElementById("smoked").textContent = todaySmokes.length;
  document.getElementById("wallet").textContent = "₹" + data.wallet;
  document.getElementById("awards").textContent = "₹" + data.awards;

  document.getElementById("totalCigs").textContent = data.smokeLogs.length;
  document.getElementById("moneySpent").textContent =
    data.smokeLogs.length * data.price;
  document.getElementById("moneySaved").textContent = data.awards;

  const list = document.getElementById("progressList");
  list.innerHTML = "";
  data.smokeLogs.slice(-10).forEach(s => {
    list.innerHTML += `<li>${new Date(s.date).toLocaleString()}</li>`;
  });
}

render();
