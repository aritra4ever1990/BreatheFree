const data = loadData();
const today = todayKey();

if (!data.history[today]) {
  data.history[today] = { count: 0, cravingsPassed: 0 };
}

const start = new Date(data.startDate);
const now = new Date();
const dayNumber = Math.floor((now - start) / 86400000) + 1;
const dailyLimit = Math.max(0, 15 - Math.floor(dayNumber / 2));

const countEl = document.getElementById('count');
const limitEl = document.getElementById('limit');
const streakEl = document.getElementById('streak');
const aiText = document.getElementById('aiText');
const dateEl = document.getElementById('dateTime');

const smokeBtn = document.getElementById('smokeBtn');
const craveBtn = document.getElementById('craveBtn');
const timerSection = document.getElementById('timerSection');
const timerEl = document.getElementById('timer');
const stopTimerBtn = document.getElementById('stopTimer');

let timerInterval;
let remaining = 300;

function updateUI() {
  countEl.textContent = `Smoked today: ${data.history[today].count}`;
  limitEl.textContent = `Daily limit: ${dailyLimit}`;
  streakEl.textContent = `${data.streak} days`;
  dateEl.textContent = new Date().toLocaleString();

  aiText.textContent =
    data.history[today].cravingsPassed > 0
      ? `You avoided ${data.history[today].cravingsPassed} cravings today. Strong willpower 💪`
      : `Every craving you resist rewires your brain. Stay with it.`;

  renderTimeline();
}

smokeBtn.onclick = () => {
  data.history[today].count++;
  data.streak = 0;
  saveData(data);
  updateUI();
};

craveBtn.onclick = () => {
  timerSection.classList.remove('hidden');
  remaining = 300;
  updateTimer();

  timerInterval = setInterval(() => {
    remaining--;
    updateTimer();
    if (remaining <= 0) finishCraving();
  }, 1000);
};

stopTimerBtn.onclick = finishCraving;

function updateTimer() {
  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;
}

function finishCraving() {
  clearInterval(timerInterval);
  timerSection.classList.add('hidden');
  data.history[today].cravingsPassed++;
  data.streak++;
  saveData(data);
  updateUI();
}

function renderTimeline() {
  const el = document.getElementById('timeline');
  el.innerHTML = '';
  for (let i = 1; i <= 30; i++) {
    const d = document.createElement('div');
    d.className = 'day' + (i <= dayNumber ? ' done' : '');
    d.textContent = `Day ${i}`;
    el.appendChild(d);
  }
}

updateUI();
