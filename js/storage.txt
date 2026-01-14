const KEY = "breathefree";

function loadData() {
  return JSON.parse(localStorage.getItem(KEY)) || {
    smoked: 0,
    streak: 0,
    wallet: 0,
    awards: 0,
    cravingPasses: 0,
    price: 0,
    dailyLimit: 15,
    logs: []
  };
}

function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
