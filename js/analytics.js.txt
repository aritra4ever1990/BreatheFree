function spendAnalysis(data) {
  const smokes = data.logs.filter(l => l.type === "smoke").length;
  return `
    🚬 Total cigarettes: ${smokes}<br>
    💸 Money spent: ₹${smokes * data.price}<br>
    💚 Money saved: ₹${data.awards}
  `;
}

function heatmap(data) {
  const h = Array(24).fill(0);
  data.logs.forEach(l => {
    if (l.type === "smoke") {
      h[new Date(l.time).getHours()]++;
    }
  });
  return h.map((v,i)=>`<span class="${v?'hot':''}">${i}</span>`).join("");
}

function dangerHours(data) {
  return [...new Set(
    data.logs.filter(l=>l.type==="smoke")
      .map(l=>new Date(l.time).getHours())
  )].slice(0,3).join(", ");
}

function calendar(data) {
  const days = {};
  data.logs.forEach(l=>{
    if(l.type==="craving"){
      const d=l.time.slice(0,10);
      days[d]=(days[d]||0)+1;
    }
  });
  return Object.keys(days).map(d=>`📅 ${d}`).join("<br>");
}
