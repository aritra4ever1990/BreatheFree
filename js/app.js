let data = loadData();

const streakEl = document.getElementById("streak");
const smokedEl = document.getElementById("smokedToday");
const walletEl = document.getElementById("wallet");
const timerEl = document.getElementById("timer");
const messageEl = document.getElementById("message");

function resetIfNewDay() {
  const today = new Date().toDateString();
  if (data.lastDate !== today) {
    data.smokedToday = 0;
    data.lastDate = today;
    saveData(data);
  }
}

function render() {
  resetIfNewDay();
  streakEl.textContent = data.streak;
  smokedEl.textContent = data.smokedToday;
  walletEl.textContent = "₹" + data.wallet;
}

document.getElementById("smokeBtn").onclick = () => {
  const price = prompt("Price of this cigarette?");
  if (!price) return;

  data.smokedToday++;
  data.wallet -= Number(price);

  data.logs.push({
    type: "smoke",
    price: Number(price),
    time: new Date().toISOString()
  });

  saveData(data);
  render();
};

document.getElementById("cravingBtn").onclick = () => {
  let seconds = 300;
  timerEl.classList.remove("hidden");
  messageEl.textContent = "";

  const interval = setInterval(() => {
    seconds--;
    timerEl.textContent = `⏱ ${Math.floor(seconds/60)}:${seconds%60
      .toString()
      .padStart(2, "0")}`;

    if (seconds <= 0) {
      clearInterval(interval);
      timerEl.classList.add("hidden");

      data.wallet += 50; // reward value
      data.cravingPasses++;

      if (data.cravingPasses % 5 === 0) {
        data.streak++;
      }

      data.logs.push({
        type: "craving-pass",
        time: new Date().toISOString()
      });

      messageEl.textContent = "🎉 Craving defeated! Reward added.";
      saveData(data);
      render();
    }
  }, 1000);
};

render();
