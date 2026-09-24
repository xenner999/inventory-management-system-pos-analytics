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

// Reflect real inventory data (added via Inventory → Add product) in the
// stat cards. TODO: connect to DB — replace with a live query once available.
(function () {
  if (typeof MynelleStore === "undefined") return;
  var products = MynelleStore.getProducts();
  var settings = MynelleStore.getSettings();

  var totalEl = document.getElementById("statTotalProducts");
  var lowEl = document.getElementById("statLowStock");
  var expEl = document.getElementById("statExpiring");
  var expSubEl = document.getElementById("statExpiringSub");

  if (totalEl) totalEl.textContent = String(products.length);
  if (lowEl) {
    lowEl.textContent = String(
      products.filter(MynelleStore.isLowStock).length
    );
  }
  if (expEl) {
    expEl.textContent = String(
      products.filter(MynelleStore.isExpiringSoon).length
    );
  }
  if (expSubEl) {
    expSubEl.textContent =
      "Expiring within " + settings.inventory.expiryWindowDays + " days";
  }

  // ---- Stock overview: two donuts ----
  // Chart 1 "Stock Health" — every product bucketed into exactly one of
  // Healthy / Low / Out of stock, so the ring always sums to the total
  // product count (shown in the center).
  // Chart 2 "Shelf Life" — every product bucketed into Safe / Expiring
  // soon; the ring also sums to the total, but the center shows the
  // expiring count instead, since that's the number worth surfacing.
  function drawDonut(wrapEl, segments, total, centerValue, centerLabel) {
    if (!wrapEl) return;
    var r = 50;
    var c = 2 * Math.PI * r;
    var offset = 0;
    var circles = segments
      .map(function (seg) {
        if (seg.value <= 0 || total <= 0) return "";
        var len = (seg.value / total) * c;
        var circle =
          '<circle cx="66" cy="66" r="' +
          r +
          '" fill="none" stroke="' +
          seg.color +
          '" stroke-width="17" stroke-dasharray="' +
          len +
          " " +
          (c - len) +
          '" stroke-dashoffset="' +
          -offset +
          '" stroke-linecap="butt" transform="rotate(-90 66 66)" />';
        offset += len;
        return circle;
      })
      .join("");

    wrapEl.innerHTML =
      '<svg viewBox="0 0 132 132">' +
      '<circle cx="66" cy="66" r="' +
      r +
      '" fill="none" stroke="var(--bg)" stroke-width="17" />' +
      circles +
      '<text x="66" y="63" text-anchor="middle" font-size="22" font-weight="700" fill="var(--text)">' +
      centerValue +
      "</text>" +
      '<text x="66" y="80" text-anchor="middle" font-size="9" fill="var(--text-muted)">' +
      centerLabel +
      "</text>" +
      "</svg>";
  }

  var outOfStockCount = products.filter(function (p) {
    return Number(p.stock) === 0;
  }).length;
  var lowOnlyCount = products.filter(function (p) {
    return Number(p.stock) !== 0 && MynelleStore.isLowStock(p);
  }).length;
  var healthyCount = products.length - outOfStockCount - lowOnlyCount;

  var expiringTotal = products.filter(MynelleStore.isExpiringSoon).length;
  var safeCount = products.length - expiringTotal;

  var legendHealthy = document.getElementById("legendHealthy");
  var legendLowStock = document.getElementById("legendLowStock");
  var legendOutStock = document.getElementById("legendOutStock");
  var legendSafe = document.getElementById("legendSafe");
  var legendExpiringSoon = document.getElementById("legendExpiringSoon");

  if (legendHealthy) legendHealthy.textContent = String(healthyCount);
  if (legendLowStock) legendLowStock.textContent = String(lowOnlyCount);
  if (legendOutStock) legendOutStock.textContent = String(outOfStockCount);
  if (legendSafe) legendSafe.textContent = String(safeCount);
  if (legendExpiringSoon) legendExpiringSoon.textContent = String(expiringTotal);

  drawDonut(
    document.getElementById("healthDonutWrap"),
    [
      { value: healthyCount, color: "#4f83d6" },
      { value: lowOnlyCount, color: "#1b2447" },
      { value: outOfStockCount, color: "#b3323f" },
    ],
    products.length,
    products.length,
    "Total Products"
  );

  drawDonut(
    document.getElementById("shelfDonutWrap"),
    [
      { value: safeCount, color: "#4f83d6" },
      { value: expiringTotal, color: "#b4740e" },
    ],
    products.length,
    expiringTotal,
    "Expiring"
  );
})();
