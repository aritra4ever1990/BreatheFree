function spendHTML(d) {
  const smokes = d.logs.filter(l => l.type === "smoke").length;
  return `
    🚬 Cigarettes: ${smokes}<br>
    💸 Spent: ₹${smokes * d.price}<br>
    💚 Saved: ₹${d.awards}
  `;
}

function progressHTML(d) {
  const map = {};
  d.logs.filter(l => l.type === "smoke").forEach(l => {
    const day = l.time.slice(0,10);
    map[day] = (map[day] || 0) + 1;
  });
  return Object.entries(map)
    .map(([d,c]) => `${d}: ${c}`)
    .join("<br>");
}
