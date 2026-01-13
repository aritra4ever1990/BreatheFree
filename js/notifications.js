function notify(msg) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(msg);
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}
