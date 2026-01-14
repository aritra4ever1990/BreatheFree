const KEY = "breatheFree";

function loadData() {
  return JSON.parse(localStorage.getItem(KEY)) || {
    price: null,
    streak: 0,
    smokedToday: 0,
    wallet: 0,
    awards: 0,
    cravingEnd: null,
    logs: []
  };
}

function saveData(d) {
  localStorage.setItem(KEY, JSON.stringify(d));
}
