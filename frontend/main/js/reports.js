document.querySelectorAll("[data-select]").forEach(function (wrap) {
  var toggle = wrap.querySelector("[data-toggle]");
  var menu = wrap.querySelector("[data-menu]");
  var label = wrap.querySelector("[data-label]");

  toggle.addEventListener("click", function (e) {
    var willOpen = !menu.classList.contains("open");
    document.querySelectorAll("[data-menu]").forEach(function (m) {
      m.classList.remove("open");
    });
    if (willOpen) menu.classList.add("open");
  });

  menu.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    label.textContent = btn.dataset.period;
    menu.querySelectorAll("button").forEach(function (el) {
      el.classList.remove("selected");
    });
    btn.classList.add("selected");
    menu.classList.remove("open");
    // TODO: connect to DB — re-query this chart using btn.dataset.period
  });
});

document.addEventListener("click", function (e) {
  document.querySelectorAll("[data-select]").forEach(function (wrap) {
    if (!wrap.contains(e.target)) {
      var menu = wrap.querySelector("[data-menu]");
      if (menu) menu.classList.remove("open");
    }
  });
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
