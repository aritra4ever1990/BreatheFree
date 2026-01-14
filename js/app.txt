let data = load();
ensurePrice(data);

const ui = (event) => {
  document.getElementById("streak").innerText = data.streak;
  document.getElementById("smoked").innerText = data.smokedToday;
  document.getElementById("wallet").innerText = data.wallet;
  document.getElementById("awards").innerText = data.awards;
  document.getElementById("spend").innerHTML = spendAnalysis(data);
  document.getElementById("heatmap").innerHTML = heatmap(data);
  document.getElementById("danger").innerText = dangerHours(data);
  document.getElementById("calendar").innerHTML = calendar(data);
  document.getElementById("aiText").innerText = aiMessage(event);
};

document.getElementById("smokeBtn").onclick = () => {
  data.smokedToday++;
  data.wallet -= data.price;
  data.logs.push({ type: "smoke", time: new Date().toISOString() });
  save(data);
  ui("smoke");
};

document.getElementById("craveBtn").onclick = () => {
  startCraving(data, ui);
};

ui();
