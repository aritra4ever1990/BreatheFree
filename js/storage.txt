const STORAGE_KEY = "breatheFree";

function loadData() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    smokedToday: 0,
    wallet: 0,
    awards: 0,
    streak: 0,
    cravingsPassed: 0,
    cravingEnd: null,
    logs: []
  };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
