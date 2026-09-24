var periodSelect = document.getElementById("periodSelect");
var periodBtn = document.getElementById("periodBtn");
var periodMenu = document.getElementById("periodMenu");
var periodLabel = document.getElementById("periodLabel");

periodBtn.addEventListener("click", function (e) {
  periodMenu.classList.toggle("open");
});

periodMenu.addEventListener("click", function (e) {
  var btn = e.target.closest("button");
  if (!btn) return;
  periodLabel.textContent = btn.dataset.period;
  periodMenu.querySelectorAll("button").forEach(function (el) {
    el.classList.remove("selected");
  });
  btn.classList.add("selected");
  periodMenu.classList.remove("open");
  // TODO: connect to DB — re-query transactions using btn.dataset.period
});

document.addEventListener("click", function (e) {
  if (!periodSelect.contains(e.target)) {
    periodMenu.classList.remove("open");
  }
});

document
  .getElementById("sideNav")
  .addEventListener("click", function (e) {
    var btn = e.target.closest(".nav-item");
    if (!btn || btn.tagName === "A") return;
    document.querySelectorAll(".nav-item").forEach(function (el) {
      el.classList.remove("active");
    });
    btn.classList.add("active");
  });
