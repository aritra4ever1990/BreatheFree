function getData() {
  return JSON.parse(localStorage.getItem('breathefree')) || {
    count: 0
  };
}

function saveData(data) {
  localStorage.setItem('breathefree', JSON.stringify(data));
}
