const STORAGE_KEY = "breathefree_data";

function loadData() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    smokeCount: 0,
    streak: 0,
    wallet: 0,
    cravingPasses: 0,
    cigarettePrice: 0,
    smokeLogs: []
  };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
