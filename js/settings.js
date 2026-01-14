function ensurePrice(data) {
  if (!data.price) {
    data.price = Number(prompt("Price per cigarette? (₹)", 10));
    save(data);
  }
}
