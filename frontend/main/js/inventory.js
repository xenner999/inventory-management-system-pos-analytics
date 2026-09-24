// Status filter — single collapsible dropdown (All / Low stocks / Expiring soon)
var filterDropdown = document.getElementById("filterDropdown");
var filterToggle = document.getElementById("filterToggle");
var filterLabel = document.getElementById("filterLabel");
var filterMenu = document.getElementById("filterMenu");
var currentFilter = "all";

// Standard pharmacy categories are appended to the filter menu so stock can
// be viewed shelf by shelf.
(function buildCategoryFilter() {
  var sep = document.createElement("div");
  sep.className = "filter-sep";
  filterMenu.appendChild(sep);

  MynelleStore.CATEGORIES.forEach(function (cat) {
    var btn = document.createElement("button");
    btn.className = "filter-option";
    btn.type = "button";
    btn.setAttribute("role", "option");
    btn.dataset.filter = "cat:" + cat;
    btn.textContent = cat;
    filterMenu.appendChild(btn);
  });
})();

filterToggle.addEventListener("click", function (e) {
  var isOpen = filterDropdown.classList.toggle("open");
  filterToggle.setAttribute("aria-expanded", String(isOpen));
});

filterMenu.addEventListener("click", function (e) {
  var option = e.target.closest(".filter-option");
  if (!option) return;
  document.querySelectorAll(".filter-option").forEach(function (el) {
    el.classList.remove("active");
  });
  option.classList.add("active");
  filterLabel.textContent = option.textContent.trim();
  filterDropdown.classList.remove("open");
  filterToggle.setAttribute("aria-expanded", "false");
  currentFilter = option.dataset.filter;
  renderProducts();
});

document.addEventListener("click", function (e) {
  if (!filterDropdown.contains(e.target)) {
    filterDropdown.classList.remove("open");
    filterToggle.setAttribute("aria-expanded", "false");
  }
});

document.getElementById("sideNav").addEventListener("click", function (e) {
  var btn = e.target.closest(".nav-item");
  if (!btn || btn.tagName === "A") return;
  document.querySelectorAll(".nav-item").forEach(function (el) {
    el.classList.remove("active");
  });
  btn.classList.add("active");
});

// ---------------------------------------------------------------------
// Product table rendering
// ---------------------------------------------------------------------
var tableWrap = document.querySelector(".table-wrap");
var tableHead = tableWrap.querySelector(".table-head");

var pluralizeUnit = MynelleStore.pluralizeUnit;

function trashIconSvg() {
  return (
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="3 6 5 6 21 6"/>' +
    '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
    "</svg>"
  );
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

function renderProducts() {
  var settings = MynelleStore.getSettings();
  var products = MynelleStore.getProducts();

  // Sort per the default sort order set in Settings → Inventory & stock
  var sort = settings.inventory.defaultSort;
  products = products.slice().sort(function (a, b) {
    if (sort === "name-desc") return b.name.localeCompare(a.name);
    if (sort === "stock-asc") return a.stock - b.stock;
    if (sort === "expiry-soonest")
      return (a.expiry || "9999-99-99").localeCompare(b.expiry || "9999-99-99");
    return a.name.localeCompare(b.name); // name-asc default
  });

  var filtered = products.filter(function (p) {
    if (currentFilter === "low") return MynelleStore.isLowStock(p);
    if (currentFilter === "expiring") return MynelleStore.isExpiringSoon(p);
    if (currentFilter.indexOf("cat:") === 0)
      return (p.category || "") === currentFilter.slice(4);
    return true;
  });

  // Clear everything after the head row
  Array.prototype.slice.call(tableWrap.children).forEach(function (child) {
    if (child !== tableHead) child.remove();
  });

  if (filtered.length === 0) {
    var empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E3E6EE" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="8" y="2" width="8" height="4" rx="1"/>' +
      '<path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/>' +
      '<path d="M9 12h6M9 16h6"/>' +
      "</svg>" +
      '<p class="title">' +
      (products.length === 0
        ? "No products in inventory yet"
        : "No products match this filter") +
      "</p>" +
      '<p class="sub">' +
      (products.length === 0
        ? "Add your first product, or connect a database to load existing stock."
        : "Try a different filter to see more products.") +
      "</p>";
    tableWrap.appendChild(empty);
    return;
  }

  filtered.forEach(function (p) {
    var row = document.createElement("div");
    row.className = "table-row";
    row.dataset.id = p.id;

    var low = MynelleStore.isLowStock(p);
    var stockHtml =
      '<span class="stock-pill' +
      (low ? " low" : "") +
      '">' +
      MynelleStore.formatQty(p.stock, p.unit) +
      "</span>";
    if (low) {
      stockHtml +=
        '<div class="critical-note">Critical level: ' +
        MynelleStore.criticalLevelFor(p) +
        "</div>";
    }
    if (p.packageQty && p.packageUnit) {
      stockHtml +=
        '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">' +
        "(" +
        p.packageQty +
        " " +
        pluralizeUnit(p.packageUnit, p.packageQty) +
        ")</div>";
    }

    var nameHtml = p.name;
    if (p.brand) {
      nameHtml += '<div class="brand-note">' + p.brand + "</div>";
    }

    row.innerHTML =
      "<span>" +
      p.id +
      "</span>" +
      "<span>" +
      nameHtml +
      "</span>" +
      '<span><span class="category-pill">' +
      (p.category || "Uncategorised") +
      "</span></span>" +
      "<span>" +
      stockHtml +
      "</span>" +
      "<span>" +
      formatExpiry(p.expiry, settings.general.dateFormat) +
      "</span>" +
      "<span>" +
      MynelleStore.formatCurrency(p.price) +
      "</span>" +
      '<span><button class="action-icon-btn" type="button" data-action="delete" data-id="' +
      p.id +
      '" aria-label="Delete product">' +
      trashIconSvg() +
      "</button></span>";

    tableWrap.appendChild(row);
  });
}

tableWrap.addEventListener("click", function (e) {
  var btn = e.target.closest('[data-action="delete"]');
  if (!btn) return;
  MynelleStore.removeProduct(btn.dataset.id);
  document.dispatchEvent(new CustomEvent("mynelle:products-changed"));
  renderProducts();
  showToast("Product removed");
});

// ---------------------------------------------------------------------
// Add product modal
// ---------------------------------------------------------------------
var overlay = document.getElementById("addProductOverlay");
var addBtn = document.querySelector(".add-btn");
var form = document.getElementById("addProductForm");
var fId = document.getElementById("fProductId");
var fName = document.getElementById("fProductName");
var fStock = document.getElementById("fStock");
var fStockLabel = document.getElementById("fStockLabel");
var fUnit = document.getElementById("fUnit");
var fExpiry = document.getElementById("fExpiry");
var fExpiryLabel = document.getElementById("fExpiryLabel");
var fPrice = document.getElementById("fPrice");
var fBrand = document.getElementById("fBrand");
var fCategory = document.getElementById("fCategory");
var fBaseUnit = document.getElementById("fBaseUnit");
var fCriticalLevel = document.getElementById("fCriticalLevel");
var fCriticalHint = document.getElementById("fCriticalHint");
var fPiecesPerPackageField = document.getElementById("fPiecesPerPackageField");
var fPiecesPerPackage = document.getElementById("fPiecesPerPackage");
var fPiecesPerPackageLabel = document.getElementById(
  "fPiecesPerPackageLabel"
);
var fTotalPiecesPreview = document.getElementById("fTotalPiecesPreview");

// ---------------------------------------------------------------------
// Autocomplete for Generic name / Brand name — suggests names already
// used in this pharmacy's inventory first (so entries stay consistent),
// backed by a small starter list of common Philippine pharmacy generics
// and brands for when the catalog is still mostly empty.
// ---------------------------------------------------------------------
var GENERIC_NAME_SEED = [
  "Paracetamol 500mg", "Amoxicillin 500mg", "Mefenamic Acid 500mg",
  "Ibuprofen 400mg", "Cetirizine 10mg", "Loratadine 10mg",
  "Diphenhydramine 25mg", "Ambroxol 30mg", "Salbutamol Inhaler",
  "Losartan 50mg", "Amlodipine 5mg", "Metoprolol 50mg",
  "Metformin 500mg", "Glimepiride 2mg", "Omeprazole 20mg",
  "Ranitidine 150mg", "Loperamide 2mg", "Oral Rehydration Salts",
  "Ascorbic Acid 500mg", "Multivitamins + Minerals", "Ferrous Sulfate 325mg",
  "Azithromycin 500mg", "Cefalexin 500mg", "Clindamycin 300mg",
  "Simvastatin 20mg", "Atorvastatin 20mg", "Furosemide 40mg",
  "Hydrochlorothiazide 25mg", "Prednisone 20mg", "Dexamethasone 0.5mg",
  "Tranexamic Acid 500mg", "Mupirocin Ointment", "Hydrocortisone Cream",
  "Povidone-Iodine Solution", "Isotonic Nasal Spray",
];
var BRAND_NAME_SEED = [
  "Biogesic", "Bioflu", "Neozep", "Decolgen", "Alaxan",
  "Medicol", "Ponstan", "Amoxil", "Augmentin", "Zithromax",
  "Virlix", "Claritin", "Benadryl", "Ventolin", "Cozaar",
  "Norvasc", "Glucophage", "Amaryl", "Losec", "Zantac",
  "Diatabs", "Hidrasec", "Cecon", "Enervon", "Berocca",
  "Centrum", "Solmux", "Robitussin", "Zocor", "Lipitor",
  "Lasix", "Betadine",
];

function buildSuggestionPool(seed, field) {
  var fromProducts = MynelleStore.getProducts()
    .map(function (p) {
      return (p[field] || "").trim();
    })
    .filter(Boolean);
  var seen = {};
  var out = [];
  fromProducts.concat(seed).forEach(function (value) {
    var key = value.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    out.push({ value: value, fromCatalog: fromProducts.indexOf(value) !== -1 });
  });
  return out;
}

function attachAutocomplete(inputEl, poolFn) {
  var wrap = document.createElement("div");
  wrap.className = "ac-wrap";
  inputEl.parentNode.insertBefore(wrap, inputEl);
  wrap.appendChild(inputEl);

  var list = document.createElement("div");
  list.className = "ac-list";
  list.setAttribute("role", "listbox");
  wrap.appendChild(list);

  var activeIndex = -1;
  var currentMatches = [];

  function close() {
    wrap.classList.remove("ac-open");
    activeIndex = -1;
  }

  function highlight(idx) {
    var items = list.querySelectorAll(".ac-item");
    items.forEach(function (el, i) {
      el.classList.toggle("active", i === idx);
    });
    if (items[idx]) items[idx].scrollIntoView({ block: "nearest" });
    activeIndex = idx;
  }

  function open(query) {
    var q = query.trim().toLowerCase();
    if (!q) {
      close();
      return;
    }
    currentMatches = poolFn()
      .filter(function (item) {
        return item.value.toLowerCase().indexOf(q) !== -1;
      })
      .slice(0, 7);

    if (currentMatches.length === 0) {
      close();
      return;
    }

    list.innerHTML = currentMatches
      .map(function (item) {
        return (
          '<div class="ac-item" role="option">' +
          item.value.replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
          }) +
          (item.fromCatalog ? '<span class="ac-tag">In inventory</span>' : "") +
          "</div>"
        );
      })
      .join("");
    wrap.classList.add("ac-open");
    activeIndex = -1;
  }

  inputEl.addEventListener("input", function () {
    open(inputEl.value);
  });
  inputEl.addEventListener("focus", function () {
    if (inputEl.value.trim()) open(inputEl.value);
  });
  inputEl.addEventListener("keydown", function (e) {
    if (!wrap.classList.contains("ac-open")) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlight(Math.min(activeIndex + 1, currentMatches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlight(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && currentMatches[activeIndex]) {
        e.preventDefault();
        inputEl.value = currentMatches[activeIndex].value;
        close();
      }
    } else if (e.key === "Escape") {
      close();
    }
  });
  list.addEventListener("mousedown", function (e) {
    // mousedown (not click) so this fires before the input's blur handler
    var item = e.target.closest(".ac-item");
    if (!item) return;
    e.preventDefault();
    var idx = Array.prototype.indexOf.call(list.children, item);
    if (currentMatches[idx]) {
      inputEl.value = currentMatches[idx].value;
    }
    close();
  });
  document.addEventListener("click", function (e) {
    if (!wrap.contains(e.target)) close();
  });
}

attachAutocomplete(fName, function () {
  return buildSuggestionPool(GENERIC_NAME_SEED, "name");
});
attachAutocomplete(fBrand, function () {
  return buildSuggestionPool(BRAND_NAME_SEED, "brand");
});

// Fill the category and unit-of-measurement selects from the shared lists.
(function buildSelects() {
  var placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a category";
  fCategory.appendChild(placeholder);

  MynelleStore.CATEGORIES.forEach(function (cat) {
    var opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    fCategory.appendChild(opt);
  });

  MynelleStore.UNITS.forEach(function (unit) {
    var opt = document.createElement("option");
    opt.value = unit;
    opt.textContent = unit;
    fBaseUnit.appendChild(opt);
  });
  fBaseUnit.value = "tablet";
})();

// ---------------------------------------------------------------------
// Packaging → pieces conversion. Stock is always kept and shown in the
// base unit (pcs) everywhere in the app (table, alerts, dashboard). If
// the person is adding stock by box/pack/bottle, they tell us how many
// pieces are in one of those, and we convert to a total piece count.
// ---------------------------------------------------------------------
function updatePackagingUI() {
  var packaging = fUnit.value; // "unit" | box | pack | bottle | strip
  var base = fBaseUnit.value;

  if (packaging === "unit") {
    fPiecesPerPackageField.style.display = "none";
    fStockLabel.textContent =
      "Stock quantity (" + pluralizeUnit(base, 2) + ") *";
  } else {
    fPiecesPerPackageField.style.display = "";
    fStockLabel.textContent =
      "Number of " + pluralizeUnit(packaging, 2) + " *";
    fPiecesPerPackageLabel.textContent =
      pluralizeUnit(base, 2) + " per " + packaging + " *";
    fPiecesPerPackage.placeholder =
      packaging === "box" ? "e.g. 100" : packaging === "strip" ? "e.g. 10" : "e.g. 20";
  }

  fCriticalHint.textContent =
    "In " + pluralizeUnit(base, 2) + ". Blank uses the Settings default.";

  var priceLabel = document.getElementById("fPriceLabel");
  if (priceLabel) priceLabel.textContent = "Price per " + base + " *";

  updateTotalPreview();
}

function updateTotalPreview() {
  var packaging = fUnit.value;
  var qty = Number(fStock.value) || 0;
  var perPackage =
    packaging === "unit" ? 1 : Number(fPiecesPerPackage.value) || 0;
  var total = packaging === "unit" ? qty : qty * perPackage;
  if (fTotalPiecesPreview) {
    fTotalPiecesPreview.textContent = MynelleStore.formatQty(
      total,
      fBaseUnit.value
    );
  }
}

fBaseUnit.addEventListener("change", updatePackagingUI);
fUnit.addEventListener("change", updatePackagingUI);
fStock.addEventListener("input", updateTotalPreview);
fPiecesPerPackage.addEventListener("input", updateTotalPreview);

function openModal() {
  var settings = MynelleStore.getSettings();
  form.reset();
  clearErrors();
  fId.value = MynelleStore.nextProductId();
  fCategory.value = "";
  fBaseUnit.value = "tablet";
  fUnit.value =
    settings.inventory.defaultUnit === "pcs"
      ? "unit"
      : settings.inventory.defaultUnit;
  fCriticalLevel.placeholder =
    "Default: " +
    (settings.inventory.criticalLevelUnits ||
      settings.inventory.lowStockThresholdPcs);
  fExpiryLabel.textContent = settings.inventory.requireExpiry
    ? "Expiry date *"
    : "Expiry date";
  updatePackagingUI();
  overlay.classList.add("open");
  window.setTimeout(function () {
    fName.focus();
  }, 0);
}

function closeModal() {
  overlay.classList.remove("open");
}

addBtn.addEventListener("click", openModal);
document.getElementById("addProductClose").addEventListener("click", closeModal);
document.getElementById("addProductCancel").addEventListener("click", closeModal);
overlay.addEventListener("click", function (e) {
  if (e.target === overlay) closeModal();
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
});

function clearErrors() {
  document.querySelectorAll(".field-error").forEach(function (el) {
    el.textContent = "";
  });
  document.querySelectorAll(".has-error").forEach(function (el) {
    el.classList.remove("has-error");
  });
}

function setError(input, errorEl, message) {
  input.classList.add("has-error");
  errorEl.textContent = message;
}

form.addEventListener("submit", function (e) {
  e.preventDefault();
  clearErrors();

  var settings = MynelleStore.getSettings();
  var valid = true;

  var name = fName.value.trim();
  if (!name) {
    setError(fName, document.getElementById("errProductName"), "Product name is required.");
    valid = false;
  }

  var stock = fStock.value.trim();
  if (stock === "" || Number(stock) < 0) {
    setError(fStock, document.getElementById("errStock"), "Enter a valid quantity.");
    valid = false;
  }

  var category = fCategory.value;
  if (!category) {
    setError(fCategory, document.getElementById("errCategory"), "Pick a category.");
    valid = false;
  }

  var criticalRaw = fCriticalLevel.value.trim();
  if (criticalRaw !== "" && Number(criticalRaw) < 0) {
    setError(
      fCriticalLevel,
      document.getElementById("errCriticalLevel"),
      "Enter a valid critical level."
    );
    valid = false;
  }

  var unit = fUnit.value;
  var piecesPerPackage = 1;
  if (unit !== "unit") {
    var ppRaw = fPiecesPerPackage.value.trim();
    if (ppRaw === "" || Number(ppRaw) <= 0) {
      setError(
        fPiecesPerPackage,
        document.getElementById("errPiecesPerPackage"),
        "Enter how many " +
          pluralizeUnit(fBaseUnit.value, 2) +
          " are in one " +
          unit +
          "."
      );
      valid = false;
    } else {
      piecesPerPackage = Number(ppRaw);
    }
  }

  var price = fPrice.value.trim();
  if (price === "" || Number(price) < 0) {
    setError(fPrice, document.getElementById("errPrice"), "Enter a valid price.");
    valid = false;
  }

  if (settings.inventory.requireExpiry && !fExpiry.value) {
    setError(fExpiry, document.getElementById("errExpiry"), "Expiry date is required.");
    valid = false;
  }

  if (!valid) return;

  var totalPieces = Number(stock) * piecesPerPackage;

  MynelleStore.addProduct({
    id: fId.value,
    name: name,
    brand: fBrand.value.trim(),
    category: category,
    // Stock is always stored in the base unit of measurement, so the
    // table, alerts and dashboard all count the same thing.
    stock: totalPieces,
    unit: fBaseUnit.value,
    // Packaging is kept for reference and for the default critical level.
    packageQty: unit === "unit" ? null : Number(stock),
    packageUnit: unit === "unit" ? null : unit,
    piecesPerPackage: unit === "unit" ? null : piecesPerPackage,
    criticalLevel: criticalRaw === "" ? null : Number(criticalRaw),
    expiry: fExpiry.value || "",
    price: Number(price),
  });

  closeModal();
  document.dispatchEvent(new CustomEvent("mynelle:products-changed"));
  renderProducts();
  showToast('"' + name + '" added to inventory');
});

// ---------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------
var toastEl = document.getElementById("toast");
var toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(function () {
    toastEl.classList.remove("show");
  }, 2400);
}

renderProducts();
