const data = getData();

const countEl = document.getElementById('count');
const btn = document.getElementById('smokeBtn');
const dateEl = document.getElementById('dateTime');

function updateUI() {
  countEl.textContent = `Smoked today: ${data.count}`;
  dateEl.textContent = new Date().toLocaleString();
}

btn.onclick = () => {
  data.count++;
  saveData(data);
  notify(aiMessage(data.count));
  updateUI();
};

updateUI();
