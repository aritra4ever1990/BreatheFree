function smokeAI() {
  return pick([
    "Slip-ups happen. Reset and move on.",
    "Notice the trigger. Learn from it.",
    "You’re still in control."
  ]);
}

function cravingAI() {
  return pick([
    "🔥 Craving defeated. Proud of you!",
    "💪 Strong choice. This builds momentum.",
    "🏆 Another win added to your streak."
  ]);
}

function dangerAI(hours) {
  if (!hours.length) return "No danger hours detected yet.";
  return `Most risky hours: ${hours.join(", ")}. Stay alert then.`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
