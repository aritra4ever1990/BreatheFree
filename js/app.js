let data = loadData();
let cravingInterval = null;
let cravingSeconds = 300;

const smokeCountEl = document.getElementById("smokeCount");
const streakCountEl = document.getElementById("streakCount");
const walletEl = document.getElementById("walletAmount");
const reflectionText = document.getElementById("reflectionText");
const timerEl = document.getElementById("timer");
const cravingTimerBox = document.getElementById("cravingTimer");

function updateUI() {
  smokeCountEl.textContent = data.smokeCount;
  streakCountEl.textContent = data.streak;
  walletEl.textContent = `₹${data.wallet}`;
}

updateUI();

/* 🚬 SMOKE BUTTON */
document.getElementById("smokeBtn").onclick = () => {
  let price = data.cigarettePrice;

  if (!price) {
    price = parseFloat(prompt("Enter cigarette price (₹):"));
    if (isNaN(price)) return;
    data.cigarettePrice = price;
  }

  data.smokeCount++;
  data.wallet -= price;

  data.smokeLogs.push({
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    price
  });

  reflectionText.textContent = "It’s okay. Awareness is the first step 🌱";
  saveData(data);
  updateUI();
};

/* 😣 CRAVING BUTTON */
document.getElementById("cravingBtn").onclick = () => {
  if (cravingInterval) return;

  cravingSeconds = 300;
  cravingTimerBox.classList.remove("hidden");
  updateTimer();

  cravingInterval = setInterval(() => {
    cravingSeconds--;
    updateTimer();

    if (cravingSeconds <= 0) {
      clearInterval(cravingInterval);
      cravingInterval = null;
      cravingTimerBox.classList.add("hidden");

      data.cravingPasses++;
      data.wallet += data.cigarettePrice || 0;

      if (data.cravingPasses % 5 === 0) {
        data.streak++;
      }

      reflectionText.textContent =
        "🏆 Craving defeated! You’re building a stronger you.";

      saveData(data);
      updateUI();
    }
  }, 1000);
};

function updateTimer() {
  const min = Math.floor(cravingSeconds / 60);
  const sec = cravingSeconds % 60;
  timerEl.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
