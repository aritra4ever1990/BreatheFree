const KEY = "breatheFreeData";

function load() {
  return JSON.parse(localStorage.getItem(KEY)) || {
    price: null,
    smokedToday: 0,
    wallet: 0,
    awards: 0,
    streak: 0,
    cravingEnd: null,
    logs: []
  };
}

function save(d) {
  localStorage.setItem(KEY, JSON.stringify(d));
}
