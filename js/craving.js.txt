function startCraving(data, updateUI) {
  const now = Date.now();
  data.cravingEnd = now + 5 * 60 * 1000;
  save(data);

  const interval = setInterval(() => {
    const left = data.cravingEnd - Date.now();
    if (left <= 0) {
      clearInterval(interval);
      data.wallet += data.price;
      data.awards += data.price;
      data.logs.push({ type: "craving", time: new Date().toISOString() });
      data.cravingEnd = null;
      save(data);
      updateUI("cravingComplete");
    } else {
      document.getElementById("craveTimer").innerText =
        `⏱ ${Math.ceil(left / 1000)}s`;
    }
  }, 1000);
}
