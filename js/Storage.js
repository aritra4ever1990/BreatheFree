const STORAGE_KEY = 'breathefree-v3';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadData() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    startDate: today(),
    streak: 0,
    history: {}
  };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
