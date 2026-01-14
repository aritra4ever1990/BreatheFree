function getSpendAnalysis(data) {
  const totalSmokes = data.logs.filter(l => l.type === "smoke").length;
  const spent = totalSmokes * 10;
  const saved = data.cravingsPassed * 10;

  return `
    🚬 Total cigarettes: ${totalSmokes}<br>
    💸 Money spent: ₹${spent}<br>
    💚 Money saved: ₹${saved}
  `;
}

function renderHeatmap(data) {
  const hours = Array(24).fill(0);
  data.logs.forEach(l => {
    const h = new Date(l.time).getHours();
    if (l.type === "smoke") hours[h]++;
  });

  return hours
    .map((v, h) =>
      `<div class="heat ${v ? "hot" : ""}">${h}</div>`
    )
    .join("");
}

function getDangerHours(data) {
  const count = {};
  data.logs.forEach(l => {
    if (l.type !== "smoke") return;
    const h = new Date(l.time).getHours();
    count[h] = (count[h] || 0) + 1;
  });

  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => `${h}:00`);
}
