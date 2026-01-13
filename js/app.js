const data = loadData();
const today = todayKey();

if (!data.days[today]) {
  data.days[today] = { smoked: 0, passed: 0 };
}

const streakEl = document.getElementById("streak");
const smokedEl = document.getElementById("smoked");
const limitEl = document.getElementById("limit");
const aiText = document.getElementById("aiText");

const smokeBtn = document.getElementById("smokeBtn");
const craveBtn = document.getElementById("craveBtn");
const passBtn = document.getElementById("passBtn");
const timerBox = document.getElementById("timerBox");
const timerEl = document.getElementById("timer");

let timer = null;
let remaining = 300;

const dayCount =
  Math.floor((new Date() - new Date(data.startDate)) / 86400000) + 1;

const limit = Math.max(0, 15 - Math.floor(dayCount / 2));

function updateUI() {
  streakEl.textContent = data.streak;
  smokedEl.textContent = data.days[today].smoked;
  limitEl.textContent = limit;

  aiText.textContent =
    data.days[today].passed > 0
      ? `You successfully avoided ${data.days[today].passed} cravings today. Your willpower is growing.`
      : `Cravings peak for a few minutes. Breathe, wait, and let it pass.`;

  renderTimeline();
}

smokeBtn.onclick = () => {
  data.days[today].smoked++;
  data.streak = 0;
  saveData(data);
  updateUI();
};

craveBtn.onclick = () => {
  if (timer) return;
  remaining = 300;
  timerBox.classList.remove("hidden");
  updateTimer();

  timer = setInterval(() => {
    remaining--;
    updateTimer();
    if (remaining <= 0) finishCraving();
  }, 1000);
};

passBtn.onclick = finishCraving;

function finishCraving() {
  clearInterval(timer);
  timer = null;
  timerBox.classList.add("hidden");

  data.days[today].passed++;
  data.streak++;
  saveData(data);
  updateUI();
}

function updateTimer() {
  const m = String(Math.floor(remaining / 60)).padStart(2, "0");
  const s = String(remaining % 60).padStart(2, "0");
  timerEl.textContent = `${m}:${s}`;
}

function renderTimeline() {
  const t = document.getElementById("timeline");
  t.innerHTML = "";
  for (let i = 1; i <= 30; i++) {
    const d = document.createElement("div");
    d.className = "day " + (i <= dayCount ? "" : "locked");
    d.textContent = i;
    t.appendChild(d);
  }
}

updateUI();
