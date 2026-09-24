// Shared store for app settings + inventory products.
// Everything is persisted to localStorage for now (see TODO markers) so the
// preview behaves like a real app; swap these for real API calls once a
// database is connected.
var MynelleStore = (function () {
  var SETTINGS_KEY = "mynelle_settings";
  var PRODUCTS_KEY = "mynelle_products";

  var defaults = {
    general: {
      theme: "light", // "light" | "dark"
      density: "comfortable", // "comfortable" | "compact"
      dateFormat: "MM/DD/YYYY",
      lowStockAlerts: true,
      expiryAlerts: true,
    },
    business: {
      name: "",
      address: "",
      contact: "",
      license: "",
    },
    inventory: {
      // Default critical level, in base units of measurement. A product
      // can override this with its own criticalLevel.
      criticalLevelUnits: 10,
      lowStockThresholdPcs: 10,
      lowStockThresholdPackages: 1,
      expiryWindowDays: 20,
      defaultUnit: "pcs",
      requireExpiry: false,
      defaultSort: "name-asc",
    },
    pricing: {
      currency: "\u20B1",
      decimals: 2,
      vat: 12,
    },
  };

  // Standard pharmacy inventory categories. Used by the Add product form
  // and the Inventory filter so stock is grouped the way a pharmacy
  // actually organises its shelves.
  var CATEGORIES = [
    "Analgesics & Antipyretics",
    "Antibiotics & Anti-infectives",
    "Antihistamines, Cough & Cold",
    "Cardiovascular & Hypertension",
    "Diabetes & Endocrine",
    "Gastrointestinal",
    "Respiratory & Asthma",
    "Dermatologicals (Topical)",
    "Ophthalmic & Otic",
    "Vitamins & Supplements",
    "Women's Health & Contraceptives",
    "First Aid & Medical Supplies",
    "Personal Care & Toiletries",
    "Baby & Infant Care",
    "Medical Devices & Equipment",
    "Others",
  ];

  // Units of measurement (the base unit a product is counted/dispensed in),
  // kept separate from packaging (box / pack / bottle / strip).
  var UNITS = [
    "tablet",
    "capsule",
    "softgel",
    "sachet",
    "suppository",
    "ampoule",
    "vial",
    "syringe",
    "patch",
    "mL",
    "L",
    "g",
    "mg",
    "piece",
  ];

  // Measure units aren't counted, so they never get an "s".
  var MEASURE_UNITS = ["mL", "L", "g", "mg", "kg", "mcg"];

  function pluralizeUnit(unit, qty) {
    if (!unit) return "";
    if (MEASURE_UNITS.indexOf(unit) !== -1) return unit;
    if (Number(qty) === 1) return unit;
    if (unit === "box") return "boxes";
    if (/s$/.test(unit)) return unit;
    return unit + "s";
  }

  function formatQty(qty, unit) {
    var n = Number(qty) || 0;
    return n + " " + pluralizeUnit(unit || "piece", n);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getSettings() {
    var out = clone(defaults);
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        Object.keys(out).forEach(function (section) {
          if (saved[section]) {
            Object.assign(out[section], saved[section]);
          }
        });
      }
    } catch (e) {
      /* ignore malformed storage */
    }
    return out;
  }

  function saveSettingsSection(section, values) {
    var all = getSettings();
    Object.assign(all[section], values);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(all));
    } catch (e) {
      /* storage unavailable */
    }
    if (section === "general") applyThemeAndDensity(all.general);
    return all;
  }

  function applyThemeAndDensity(general) {
    general = general || getSettings().general;
    document.documentElement.setAttribute("data-theme", general.theme);
    document.documentElement.setAttribute("data-density", general.density);
  }

  function getProducts() {
    try {
      var raw = localStorage.getItem(PRODUCTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveProducts(list) {
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(list));
    } catch (e) {
      /* storage unavailable */
    }
  }

  function addProduct(product) {
    var list = getProducts();
    list.push(product);
    saveProducts(list);
    return list;
  }

  function removeProduct(id) {
    var list = getProducts().filter(function (p) {
      return p.id !== id;
    });
    saveProducts(list);
    return list;
  }

  function nextProductId() {
    var list = getProducts();
    var max = 0;
    list.forEach(function (p) {
      var n = parseInt(String(p.id).replace(/\D/g, ""), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    var n = max + 1;
    return "PRD-" + String(n).padStart(4, "0");
  }

  function formatCurrency(amount) {
    var pricing = getSettings().pricing;
    var n = Number(amount);
    if (isNaN(n)) n = 0;
    return pricing.currency + n.toFixed(pricing.decimals);
  }

  // Critical level: at or below this, the product needs reordering.
  function criticalLevelFor(product) {
    var inv = getSettings().inventory;
    var own = Number(product.criticalLevel);
    if (!isNaN(own) && own > 0) return own;
    // No per-product level set — fall back to the defaults in Settings.
    if (product.piecesPerPackage && Number(product.piecesPerPackage) > 0) {
      return (
        Number(product.piecesPerPackage) * Number(inv.lowStockThresholdPackages)
      );
    }
    return Number(inv.criticalLevelUnits || inv.lowStockThresholdPcs);
  }

  function isLowStock(product) {
    return Number(product.stock) <= criticalLevelFor(product);
  }

  function isLowStockLegacy(product) {
    var inv = getSettings().inventory;
    // Items added by box/pack/bottle are judged by how many full
    // packages are left, not the raw piece count — 10 loose pcs is
    // the last dregs for a bottle, but nothing to worry about out of
    // a case of 500. Plain pcs items use the pcs threshold directly.
    if (product.piecesPerPackage && Number(product.piecesPerPackage) > 0) {
      var remainingPackages =
        Number(product.stock) / Number(product.piecesPerPackage);
      return remainingPackages <= inv.lowStockThresholdPackages;
    }
    return Number(product.stock) <= inv.lowStockThresholdPcs;
  }

  function isExpiringSoon(product) {
    if (!product.expiry) return false;
    var days = getSettings().inventory.expiryWindowDays;
    var diff =
      (new Date(product.expiry) - new Date()) / (1000 * 60 * 60 * 24);
    return diff <= days && diff >= 0;
  }

  return {
    getSettings: getSettings,
    saveSettingsSection: saveSettingsSection,
    applyThemeAndDensity: applyThemeAndDensity,
    getProducts: getProducts,
    saveProducts: saveProducts,
    addProduct: addProduct,
    removeProduct: removeProduct,
    nextProductId: nextProductId,
    formatCurrency: formatCurrency,
    isLowStock: isLowStock,
    criticalLevelFor: criticalLevelFor,
    pluralizeUnit: pluralizeUnit,
    formatQty: formatQty,
    CATEGORIES: CATEGORIES,
    UNITS: UNITS,
    isExpiringSoon: isExpiringSoon,
    SETTINGS_KEY: SETTINGS_KEY,
    PRODUCTS_KEY: PRODUCTS_KEY,
  };
})();
