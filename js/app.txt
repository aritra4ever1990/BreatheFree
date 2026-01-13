const data = loadData();
const todayKey = today();

if (!data.history[todayKey]) {
  data.history[todayKey] = {
    smoked: 0,
    cravingsPassed: 0
  };
}

const startDate = new Date(data.startDate);
const now = new Date();
const dayNumber = Math.max(1, Math.floor((now - startDate) / 86400000) + 1);
const dailyLimit = Math.max(0, 15 - Math.floor(dayNumber / 2));

// Elements
const streakEl = document.getElementById('streak');
const countEl = document.getElementById('count');
const limitEl = document.getElementById('limit');
const dateEl = document.getElementById('dateTime');
const aiText = document.getElementById('aiText');

const smokeBtn = document.getElementById('smokeBtn');
const craveBtn = document.getElementById('craveBtn');
const timerBox = document.getElementById('timerBox');
const timerEl = document.getElementById('timer');
const passBtn = document.getElementById('passBtn');

let timer = null;
let remaining = 300;

function updateUI() {
  streakEl.textContent = data.streak;
  countEl.textContent = data.history[todayKey].smoked;
  limitEl.textContent = dailyLimit;
  dateEl.textContent = new Date().toLocaleString();

  aiText.textContent =
    data.history[todayKey].cravingsPassed > 0
      ? `You resisted ${data.history[todayKey].cravingsPassed} cravings today. Your brain is rewiring itself.`
      : `Every craving lasts a few minutes. You are stronger than it.`;

  renderTimeline();
}

smokeBtn.onclick = () => {
  data.history[todayKey].smoked++;
  data.streak = 0;
  saveData(data);
  updateUI();
};

craveBtn.onclick = () => {
  if (timer) return;

  timerBox.classList.remove('hidden');
  remaining = 300;
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
  timerBox.classList.add('hidden');

  data.history[todayKey].cravingsPassed++;
  data.streak++;
  saveData(data);
  updateUI();
}

function updateTimer() {
  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;
}

function renderTimeline() {
  const el = document.getElementById('timeline');
  el.innerHTML = '';
  for (let i = 1; i <= 30; i++) {
    const d = document.createElement('div');
    d.className = 'day' + (i <= dayNumber ? ' done' : '');
    d.textContent = i;
    el.appendChild(d);
  }
}

updateUI();
