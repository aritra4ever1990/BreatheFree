document.getElementById("exportCSV").onclick = () => {
  const d = loadData();
  let csv = "type,time\n";
  d.logs.forEach(l => csv += `${l.type},${l.time}\n`);
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "breathefree-data.csv";
  a.click();
};
