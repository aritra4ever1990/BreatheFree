let deferredPrompt;
const banner = document.getElementById("installBanner");
const btn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  banner.classList.remove("hidden");
});

btn.addEventListener("click", async () => {
  banner.classList.add("hidden");
  await deferredPrompt.prompt();
  deferredPrompt = null;
});
