let cravingInterval;

function startCraving(data, updateUI) {
  data.cravingEnd = Date.now() + 5 * 60 * 1000;
  saveData(data);

  document.getElementById("smokeBtn").disabled = true;
  document.getElementById("stopCraveBtn").disabled = false;

  cravingInterval = setInterval(() => {
    const left = data.cravingEnd - Date.now();
    if (left <= 0) completeCraving(data, updateUI);
    else document.getElementById("craveTimer").innerText =
      `⏱ Craving ends in ${Math.ceil(left / 1000)}s`;
  }, 1000);
}

function stopCraving(data) {
  clearInterval(cravingInterval);
  data.cravingEnd = null;
  saveData(data);
  resetCravingUI();
}

function completeCraving(data, updateUI) {
  clearInterval(cravingInterval);
  data.wallet += data.price;
  data.awards += data.price;
  data.logs.push({ type: "craving", time: new Date().toISOString() });
  data.cravingEnd = null;
  saveData(data);
  updateUI("craving");
  resetCravingUI();
}

function resetCravingUI() {
  document.getElementById("craveTimer").innerText = "";
  document.getElementById("smokeBtn").disabled = false;
  document.getElementById("stopCraveBtn").disabled = true;
}
