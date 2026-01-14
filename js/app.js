// ===== DOM ELEMENTS =====
const smokeBtn = document.getElementById("smokeBtn");
const cravingBtn = document.getElementById("cravingBtn");

const smokedTodayEl = document.getElementById("smokedToday");
const walletEl = document.getElementById("walletAmount");
const awardEl = document.getElementById("awardAmount");
const streakEl = document.getElementById("streakCount");
const aiMsg = document.getElementById("aiMessage");
const cravingTimerEl = document.getElementById("cravingTimer");
const cravingSection = document.getElementById("cravingSection");

// ===== STATE =====
let data = JSON.parse(localStorage.getItem("breatheFree")) || {
  smokedToday: 0,
  wallet: 0,
  awards: 0,
  streak: 0,
  cravingsPassed: 0,
  cravingEnd: null,
  logs: []
};

const CIG_PRICE = 10;
const CRAVING_TIME = 5 * 60 * 1000;

// ===== SAVE =====
function save() {
  localStorage.setItem("breatheFree", JSON.stringify(data));
}

// ===== UI UPDATE =====
function render() {
  smokedTodayEl.innerText = data.smokedToday;
  walletEl.innerText = `₹${data.wallet}`;
  awardEl.innerText = `₹${data.awards}`;
  streakEl.innerText = data.streak;
}
render();

// ===== SMOKE BUTTON =====
smokeBtn.addEventListener("click", () => {
  data.smokedToday++;
  data.wallet -= CIG_PRICE;

  data.logs.push({
    type: "smoke",
    time: new Date().toISOString()
  });

  aiMsg.innerText = getSmokeMessage();
  save();
  render();
});

// ===== CRAVING BUTTON =====
cravingBtn.addEventListener("click", () => {
  if (data.cravingEnd) return;

  data.cravingEnd = Date.now() + CRAVING_TIME;
  cravingSection.classList.remove("hidden");
  save();
  tickCraving();
});

// ===== CRAVING TIMER =====
function tickCraving() {
  if (!data.cravingEnd) return;

  const remaining = data.cravingEnd - Date.now();

  if (remaining <= 0) {
    cravingSuccess();
    return;
  }

  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  cravingTimerEl.innerText = `⏳ Craving ends in ${m}:${s
    .toString()
    .padStart(2, "0")}`;

  setTimeout(tickCraving, 1000);
}

// ===== CRAVING SUCCESS =====
function cravingSuccess() {
  data.cravingEnd = null;
  data.wallet += CIG_PRICE;
  data.awards += CIG_PRICE;
  data.cravingsPassed++;

  if (data.cravingsPassed % 5 === 0) {
    data.streak++;
  }

  aiMsg.innerText = getCravingMessage();
  cravingSection.classList.add("hidden");
  save();
  render();
}

// ===== AI MESSAGES =====
function getSmokeMessage() {
  const msgs = [
    "Slip-ups happen. What matters is awareness.",
    "Pause. The next choice is still yours.",
    "One moment doesn’t define your journey."
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function getCravingMessage() {
  const msgs = [
    "🔥 You won this craving. Huge win!",
    "💪 Discipline beats desire. Well done!",
    "🏆 Craving defeated. You’re stronger."
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

// ===== RESUME TIMER AFTER REFRESH =====
if (data.cravingEnd) {
  cravingSection.classList.remove("hidden");
  tickCraving();
}
