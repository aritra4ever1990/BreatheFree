const STORAGE_KEY = "breathefree-data";

function loadData() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    streak: 0,
    smokedToday: 0,
    wallet: 0,
    cravingPasses: 0,
    logs: [],
    lastDate: new Date().toDateString()
  };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
