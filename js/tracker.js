// js/tracker.js

const timestampElement = document.querySelector('.timestamp');

function addTimestamp(cigarette) {
    const now = new Date();
    const formattedTime = `${now.toISOString().slice(0, 19).replace('T', ' ')} UTC`;
    timestampElement.innerHTML += `<p>${cigarette} smoked at ${formattedTime}</p>`;
}

// Functionality to chart weekly/monthly data can be added here.
