function aiMessage(type) {
  const map = {
    smoke: "Slip noted. Awareness is progress.",
    cravingComplete: "Strong choice. Momentum builds.",
  };
  return map[type] || "";
}
