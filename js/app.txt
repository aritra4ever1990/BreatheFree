// ---------- STATE ----------
const today = new Date().toISOString().slice(0, 10);

let data = JSON.parse(localStorage.getItem("breathefree")) || {
  startDate: today,
  streak: 0,
  days: {}
};

if (!data.days[today]) {
  data.days[today] = { smoked: 0, passed: 0 };
}

// ---------- ELEMENTS ----------
const streakEl = document.getElementById("streak");
const smokedEl = document.getElementById("smoked");
const limitEl = document.getElementById("limit");
const aiText = document.getElementById("aiText");
const graphEl = document.getElementById("progressGraph");

const smokeBtn = document.getElementById("smokeBtn");
const craveBtn = document.getElementById("craveBtn");
const passBtn = document.getElementById("passBtn");
const timerBox = document.getElementById("timerBox");
const timerEl = document.getElementById("timer");

// ---------- LOGIC ----------
const dayIndex =
  Math.floor((new Date() - new Date(data.startDate)) / 86400000) + 1;

const limit = Math.max(0, 15 - Math.floor(dayIndex / 2));

let timer = null;
let remaining = 300;

// ---------- FUNCTIONS ----------
function save() {
  localStorage.setItem("breathefree", JSON.stringify(data));
}

function updateUI() {
  streakEl.textContent = data.streak;
  smokedEl.textContent = data.days[today].smoked;
  limitEl.textContent = limit;

  aiText.textContent =
    data.days[today].passed > 0
      ? `You avoided ${data.days[today].passed} cravings today. That’s real progress.`
      : `Every craving you delay weakens the habit loop.`;

  renderGraph();
}

function renderGraph() {
  graphEl.innerHTML = "";
  for (let i = 0; i < limit; i++) {
    const bar = document.createElement("div");
    bar.className =
      "bar " + (i < data.days[today].smoked ? "filled" : "");
    graphEl.appendChild(bar);
  }
}

// ---------- EVENTS ----------
smokeBtn.addEventListener("click", () => {
  data.days[today].smoked++;
  data.streak = 0;
  save();
  updateUI();
});

craveBtn.addEventListener("click", () => {
  if (timer) return;
  timerBox.classList.remove("hidden");
  remaining = 300;
  updateTimer();

  timer = setInterval(() => {
    remaining--;
    updateTimer();
    if (remaining <= 0) finishCraving();
  }, 1000);
});

passBtn.addEventListener("click", finishCraving);

function finishCraving() {
  clearInterval(timer);
  timer = null;
  timerBox.classList.add("hidden");
  data.days[today].passed++;
  data.streak++;
  save();
  updateUI();
}

function updateTimer() {
  const m = String(Math.floor(remaining / 60)).padStart(2, "0");
  const s = String(remaining % 60).padStart(2, "0");
  timerEl.textContent = `${m}:${s}`;
}

// ---------- INIT ----------
updateUI();
