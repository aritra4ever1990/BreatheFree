let deferred;
const banner = document.getElementById("installBanner");

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferred = e;
  banner.classList.remove("hidden");
});

document.getElementById("installBtn").onclick = async () => {
  banner.classList.add("hidden");
  await deferred.prompt();
};
