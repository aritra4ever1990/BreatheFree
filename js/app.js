let data = loadData();

if (!data.price) {
  data.price = Number(prompt("Cigarette price (₹)?", 10));
  saveData(data);
}

function updateUI(event) {
  streak.innerText = data.streak;
  smoked.innerText = data.smokedToday;
  wallet.innerText = data.wallet;
  awards.innerText = data.awards;
  spend.innerHTML = spendHTML(data);
  progress.innerHTML = progressHTML(data);
  aiText.innerText =
    event === "smoke"
      ? "Noted. Awareness builds control."
      : "Strong craving win 💪";
}

smokeBtn.onclick = () => {
  data.smokedToday++;
  data.wallet -= data.price;
  data.logs.push({ type: "smoke", time: new Date().toISOString() });
  saveData(data);
  updateUI("smoke");
};

craveBtn.onclick = () => startCraving(data, updateUI);
stopCraveBtn.onclick = () => stopCraving(data);

updateUI();
