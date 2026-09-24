// ---------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------
var settingsNav = document.getElementById("settingsNav");
settingsNav.addEventListener("click", function (e) {
  var btn = e.target.closest(".settings-tab");
  if (!btn) return;
  document.querySelectorAll(".settings-tab").forEach(function (el) {
    el.classList.remove("active");
  });
  btn.classList.add("active");

  var target = btn.dataset.tab;
  document.querySelectorAll(".settings-section").forEach(function (el) {
    el.hidden = el.dataset.section !== target;
  });
});

// ---------------------------------------------------------------------
// Segmented controls (theme / density) — applied live, saved with the rest
// ---------------------------------------------------------------------
function wireSegmented(fieldName, onChange) {
  var group = document.querySelector('.segmented[data-field="' + fieldName + '"]');
  group.addEventListener("click", function (e) {
    var opt = e.target.closest(".segmented-option");
    if (!opt) return;
    group.querySelectorAll(".segmented-option").forEach(function (el) {
      el.classList.remove("selected");
    });
    opt.classList.add("selected");
    onChange(opt.dataset.value);
  });
  return group;
}
function setSegmented(fieldName, value) {
  var group = document.querySelector('.segmented[data-field="' + fieldName + '"]');
  group.querySelectorAll(".segmented-option").forEach(function (el) {
    el.classList.toggle("selected", el.dataset.value === value);
  });
}

wireSegmented("theme", function (value) {
  MynelleStore.applyThemeAndDensity(
    Object.assign({}, MynelleStore.getSettings().general, { theme: value })
  );
});
wireSegmented("density", function (value) {
  MynelleStore.applyThemeAndDensity(
    Object.assign({}, MynelleStore.getSettings().general, { density: value })
  );
});

// ---------------------------------------------------------------------
// Load current settings into the form
// ---------------------------------------------------------------------
function loadForm() {
  var s = MynelleStore.getSettings();

  setSegmented("theme", s.general.theme);
  setSegmented("density", s.general.density);
  document.getElementById("gDateFormat").value = s.general.dateFormat;
  document.getElementById("gLowStockAlerts").checked = s.general.lowStockAlerts;
  document.getElementById("gExpiryAlerts").checked = s.general.expiryAlerts;

  document.getElementById("bName").value = s.business.name;
  document.getElementById("bAddress").value = s.business.address;
  document.getElementById("bContact").value = s.business.contact;
  document.getElementById("bLicense").value = s.business.license;

  document.getElementById("iCriticalLevel").value =
    s.inventory.criticalLevelUnits || s.inventory.lowStockThresholdPcs;
  document.getElementById("iCriticalAlerts").checked = s.general.lowStockAlerts;
  document.getElementById("iLowStockPackages").value = s.inventory.lowStockThresholdPackages;
  document.getElementById("iExpiryWindow").value = s.inventory.expiryWindowDays;
  document.getElementById("iDefaultUnit").value =
    s.inventory.defaultUnit === "pcs" ? "unit" : s.inventory.defaultUnit;
  document.getElementById("iRequireExpiry").checked = s.inventory.requireExpiry;
  document.getElementById("iDefaultSort").value = s.inventory.defaultSort;

  document.getElementById("pCurrency").value = s.pricing.currency;
  document.getElementById("pDecimals").value = String(s.pricing.decimals);
  document.getElementById("pVat").value = s.pricing.vat;
}
loadForm();

// ---------------------------------------------------------------------
// Save handlers
// ---------------------------------------------------------------------
function flashSaved(section) {
  var el = document.querySelector('.save-confirm[data-confirm="' + section + '"]');
  el.classList.add("show");
  window.setTimeout(function () {
    el.classList.remove("show");
  }, 1800);
}

document.querySelector('[data-save="general"]').addEventListener("click", function () {
  var theme = document.querySelector('.segmented[data-field="theme"] .selected').dataset.value;
  var density = document.querySelector('.segmented[data-field="density"] .selected').dataset.value;
  MynelleStore.saveSettingsSection("general", {
    theme: theme,
    density: density,
    dateFormat: document.getElementById("gDateFormat").value,
    lowStockAlerts: document.getElementById("gLowStockAlerts").checked,
    expiryAlerts: document.getElementById("gExpiryAlerts").checked,
  });
  flashSaved("general");
  document.dispatchEvent(new CustomEvent("mynelle:products-changed"));
  showToast("General settings saved");
});

document.querySelector('[data-save="business"]').addEventListener("click", function () {
  MynelleStore.saveSettingsSection("business", {
    name: document.getElementById("bName").value.trim(),
    address: document.getElementById("bAddress").value.trim(),
    contact: document.getElementById("bContact").value.trim(),
    license: document.getElementById("bLicense").value.trim(),
  });
  flashSaved("business");
  showToast("Business info saved");
});

// The same preference is shown in General and in Inventory & stock —
// keep the two switches in step so neither shows a stale value.
(function syncAlertSwitches() {
  var a = document.getElementById("gLowStockAlerts");
  var b = document.getElementById("iCriticalAlerts");
  a.addEventListener("change", function () {
    b.checked = a.checked;
  });
  b.addEventListener("change", function () {
    a.checked = b.checked;
  });
})();

document.querySelector('[data-save="inventory"]').addEventListener("click", function () {
  MynelleStore.saveSettingsSection("inventory", {
    criticalLevelUnits:
      Number(document.getElementById("iCriticalLevel").value) || 0,
    lowStockThresholdPcs:
      Number(document.getElementById("iCriticalLevel").value) || 0,
    lowStockThresholdPackages: Number(document.getElementById("iLowStockPackages").value) || 0,
    expiryWindowDays: Number(document.getElementById("iExpiryWindow").value) || 0,
    defaultUnit: document.getElementById("iDefaultUnit").value,
    requireExpiry: document.getElementById("iRequireExpiry").checked,
    defaultSort: document.getElementById("iDefaultSort").value,
  });
  // The critical-level notification toggle lives with the other alert
  // switches in General, so it saves into that section.
  MynelleStore.saveSettingsSection("general", {
    lowStockAlerts: document.getElementById("iCriticalAlerts").checked,
  });
  flashSaved("inventory");
  document.dispatchEvent(new CustomEvent("mynelle:products-changed"));
  showToast("Inventory settings saved");
});

document.querySelector('[data-save="pricing"]').addEventListener("click", function () {
  MynelleStore.saveSettingsSection("pricing", {
    currency: document.getElementById("pCurrency").value.trim() || "\u20B1",
    decimals: Number(document.getElementById("pDecimals").value),
    vat: Number(document.getElementById("pVat").value) || 0,
  });
  flashSaved("pricing");
  showToast("Pricing saved");
});

// ---------------------------------------------------------------------
// Security: change the admin access code
// (enter current code -> enter new code -> confirm new code)
// ---------------------------------------------------------------------
var secErrorEl = document.getElementById("secError");
var secSaveBtn = document.getElementById("secSaveBtn");

secSaveBtn.addEventListener("click", async function () {
  var currentCode = document.getElementById("secCurrentCode").value;
  var newCode = document.getElementById("secNewCode").value;
  var confirmCode = document.getElementById("secConfirmCode").value;

  secErrorEl.textContent = "";
  secSaveBtn.disabled = true;
  secSaveBtn.textContent = "Updating...";

  try {
    await MynelleAuth.changeAccessCode({
      currentCode: currentCode,
      newCode: newCode,
      confirmCode: confirmCode,
    });
    document.getElementById("secCurrentCode").value = "";
    document.getElementById("secNewCode").value = "";
    document.getElementById("secConfirmCode").value = "";
    flashSaved("security");
    showToast("Admin access code updated");
  } catch (err) {
    secErrorEl.textContent = err.message || "Could not update the access code.";
  } finally {
    secSaveBtn.disabled = false;
    secSaveBtn.textContent = "Update access code";
  }
});

// ---------------------------------------------------------------------
// Data: export / import / clear
// ---------------------------------------------------------------------
document.getElementById("btnExport").addEventListener("click", function () {
  var payload = {
    exportedAt: new Date().toISOString(),
    products: MynelleStore.getProducts(),
  };
  var blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "mynelle-inventory-export.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("Inventory exported");
});

var fileImport = document.getElementById("fileImport");
document.getElementById("btnImport").addEventListener("click", function () {
  fileImport.click();
});
fileImport.addEventListener("change", function () {
  var file = fileImport.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var data = JSON.parse(reader.result);
      var products = Array.isArray(data) ? data : data.products;
      if (!Array.isArray(products)) throw new Error("No products found in file.");
      var ok = window.confirm(
        "Import " + products.length + " product(s)? This replaces your current inventory."
      );
      if (!ok) return;
      MynelleStore.saveProducts(products);
      showToast("Inventory imported");
    } catch (err) {
      window.alert("Couldn't read that file. Please choose a valid inventory export.");
    } finally {
      fileImport.value = "";
    }
  };
  reader.readAsText(file);
});

document.getElementById("btnClear").addEventListener("click", function () {
  var ok = window.confirm(
    "This permanently deletes every saved product and setting on this device. Continue?"
  );
  if (!ok) return;
  localStorage.removeItem(MynelleStore.SETTINGS_KEY);
  localStorage.removeItem(MynelleStore.PRODUCTS_KEY);
  window.location.reload();
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
