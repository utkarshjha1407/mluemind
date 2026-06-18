// Light/dark theme: applied before paint (loaded in <head>) to avoid a flash.
(function () {
  try {
    var t = localStorage.getItem("kos-theme") || "dark";
    document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
})();

function toggleTheme() {
  var r = document.documentElement;
  var next = r.getAttribute("data-theme") === "light" ? "dark" : "light";
  r.setAttribute("data-theme", next);
  try { localStorage.setItem("kos-theme", next); } catch (e) {}
  var b = document.getElementById("themeBtn");
  if (b) b.textContent = next === "light" ? "☀" : "🌙";
}

document.addEventListener("DOMContentLoaded", function () {
  var t = document.documentElement.getAttribute("data-theme");
  var b = document.getElementById("themeBtn");
  if (b) b.textContent = t === "light" ? "☀" : "🌙";
});
