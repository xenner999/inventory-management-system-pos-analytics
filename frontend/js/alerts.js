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

// ---------------------------------------------------------------------
// Populate alerts from real inventory data (MynelleStore / localStorage).
// TODO: connect to DB — replace with a live query once available.
// ---------------------------------------------------------------------
(function () {
  if (typeof MynelleStore === "undefined") return;

  var settings = MynelleStore.getSettings();
  var products = MynelleStore.getProducts();

  var lowStockItems = products.filter(MynelleStore.isLowStock);
  var outOfStockItems = products.filter(function (p) {
    return Number(p.stock) === 0;
  });
  var expiringItems = products
    .filter(MynelleStore.isExpiringSoon)
    .slice()
    .sort(function (a, b) {
      return (a.expiry || "").localeCompare(b.expiry || "");
    });

  // ---- Stat cards ----
  setText("statLowStock", lowStockItems.length);
  setText("statOutOfStock", outOfStockItems.length);
  setText("statExpiring", expiringItems.length);
  setText(
    "statExpiringSub",
    "Expiring within " + settings.inventory.expiryWindowDays + " days"
  );

  // ---- Badges ----
  setText("expiringBadge", expiringItems.length + " expiring");
  setText("lowStockBadge", lowStockItems.length + " low stocks");

  // ---- Expiration alerts table ----
  renderExpiringTable(expiringItems, settings);

  // ---- Low stock alerts table ----
  renderLowStockTable(lowStockItems, settings);

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function daysLeft(expiry) {
    var diff = (new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(diff));
  }

  function formatExpiry(dateStr, dateFormat) {
    if (!dateStr) return "\u2014";
    var parts = dateStr.split("-"); // YYYY-MM-DD from <input type="date">
    if (parts.length !== 3) return dateStr;
    var y = parts[0],
      m = parts[1],
      d = parts[2];
    if (dateFormat === "DD/MM/YYYY") return d + "/" + m + "/" + y;
    if (dateFormat === "YYYY-MM-DD") return y + "-" + m + "-" + d;
    return m + "/" + d + "/" + y; // MM/DD/YYYY default
  }

  function clearRows(wrap) {
    var head = wrap.querySelector(".table-head");
    Array.prototype.slice.call(wrap.children).forEach(function (child) {
      if (child !== head) child.remove();
    });
  }

  function emptyState(iconPath, title, sub) {
    var div = document.createElement("div");
    div.className = "empty-state";
    div.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E3E6EE" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      iconPath +
      "</svg>" +
      '<p class="title">' +
      title +
      "</p>" +
      '<p class="sub">' +
      sub +
      "</p>";
    return div;
  }

  function renderExpiringTable(items, settings) {
    var wrap = document.getElementById("expiringTableWrap");
    if (!wrap) return;
    clearRows(wrap);

    if (items.length === 0) {
      wrap.appendChild(
        emptyState(
          '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
          "No expiring products",
          "Products nearing their expiration date will show up here."
        )
      );
      return;
    }

    items.forEach(function (p) {
      var row = document.createElement("div");
      row.className = "table-row";
      var left = daysLeft(p.expiry);
      row.innerHTML =
        "<span>" + p.name + "</span>" +
        "<span>" + formatExpiry(p.expiry, settings.general.dateFormat) + "</span>" +
        "<span>" + left + (left === 1 ? " day" : " days") + "</span>" +
        "<span>" + MynelleStore.formatQty(p.stock, p.unit) + "</span>";
      wrap.appendChild(row);
    });
  }

  function renderLowStockTable(items, settings) {
    var wrap = document.getElementById("lowStockTableWrap");
    if (!wrap) return;
    clearRows(wrap);

    if (items.length === 0) {
      wrap.appendChild(
        emptyState(
          '<polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>',
          "No low stock items",
          "Products running low will be listed here for restocking."
        )
      );
      return;
    }

    items.forEach(function (p) {
      var row = document.createElement("div");
      row.className = "table-row";
      var out = Number(p.stock) === 0;
      var remainingLabel = MynelleStore.formatQty(p.stock, p.unit);
      if (p.piecesPerPackage && Number(p.piecesPerPackage) > 0) {
        var remainingPackages = Number(p.stock) / Number(p.piecesPerPackage);
        remainingLabel +=
          " (~" + remainingPackages.toFixed(1).replace(/\.0$/, "") +
          " " + p.packageUnit + (remainingPackages === 1 ? "" : "s") + ")";
      }
      row.innerHTML =
        "<span>" + p.name + "</span>" +
        "<span>" + remainingLabel + "</span>" +
        "<span><span class=\"status-pill\">" + (out ? "Out of stock" : "Low stock") + "</span></span>" +
        '<span><a class="view-all" href="inventory.html" style="font-size:12px;">Restock</a></span>';
      wrap.appendChild(row);
    });
  }
})();
