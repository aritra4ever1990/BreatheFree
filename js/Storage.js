const KEY = "breathefree-data";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadData() {
  return JSON.parse(localStorage.getItem(KEY)) || {
    startDate: todayKey(),
    streak: 0,
    days: {}
  };
}

function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
