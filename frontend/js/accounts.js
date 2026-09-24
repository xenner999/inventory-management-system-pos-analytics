// Manage accounts — cashier (POS) logins only.
//
// Admin and pharmacist accounts are deliberately filtered out: this page
// exists so an admin can hand out and take back POS access. Accounts are
// never deleted from here either — they're deactivated, so the employee
// record (and anything tied to it, like past sales) stays on file.
//
// All reads/writes go through MynelleAuth (auth-store.js), which tries the
// real API first and falls back to localStorage while no database is
// connected.

(function () {
  var STAFF_ROLE = "cashier";

  var accounts = [];
  var editingId = null;
  var pendingStatusId = null;

  var el = function (id) {
    return document.getElementById(id);
  };

  // -------------------------------------------------------------------
  // Toast
  // -------------------------------------------------------------------
  var toastEl = el("toast");
  var toastTimer = null;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2600);
  }

  // -------------------------------------------------------------------
  // Table
  // -------------------------------------------------------------------
  var rowsEl = el("accountRows");
  var emptyEl = el("accountsEmpty");
  var searchEl = el("accSearch");

  function escapeHtml(text) {
    return String(text == null ? "" : text).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  var EDIT_ICON =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
  var DEACTIVATE_ICON =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/></svg>';
  var REACTIVATE_ICON =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="8.5 12.2 11 14.7 15.7 9.7"/></svg>';

  function statusOf(account) {
    var status = String(account.status || "active").toLowerCase();
    if (status === "disabled") status = "inactive";
    return status;
  }

  function render() {
    var query = searchEl.value.trim().toLowerCase();
    var list = accounts.filter(function (a) {
      if (!query) return true;
      return (
        a.id.toLowerCase().indexOf(query) !== -1 ||
        a.fullName.toLowerCase().indexOf(query) !== -1 ||
        a.username.toLowerCase().indexOf(query) !== -1 ||
        (a.email || "").toLowerCase().indexOf(query) !== -1 ||
        statusOf(a).indexOf(query) !== -1
      );
    });

    if (!list.length) {
      rowsEl.innerHTML = "";
      emptyEl.hidden = false;
      emptyEl.querySelector(".title").textContent = query
        ? "No cashiers match that search"
        : "No cashier accounts yet";
      emptyEl.querySelector(".sub").textContent = query
        ? "Try a different name, username or status."
        : "Add one so a cashier can sign in to the POS.";
      return;
    }

    emptyEl.hidden = true;
    rowsEl.innerHTML = list
      .map(function (a) {
        var status = statusOf(a);
        var isActive = status === "active";
        return (
          '<div class="table-row" data-id="' + escapeHtml(a.id) + '">' +
          '<span class="cell-muted">' + escapeHtml(a.id) + "</span>" +
          '<span class="cell-strong">' + escapeHtml(a.fullName) + "</span>" +
          '<span class="cell-muted">' + escapeHtml(a.username) + "</span>" +
          '<span class="cell-muted cell-ellipsis">' + escapeHtml(a.email) + "</span>" +
          '<span><span class="status-pill ' + status + '">' + status + "</span></span>" +
          '<span class="row-actions">' +
          '<button class="action-icon-btn" type="button" data-action="edit" title="Edit account" aria-label="Edit account">' +
          EDIT_ICON + "</button>" +
          (isActive
            ? '<button class="action-icon-btn danger" type="button" data-action="deactivate" title="Deactivate account" aria-label="Deactivate account">' +
              DEACTIVATE_ICON + "</button>"
            : '<button class="action-icon-btn success" type="button" data-action="reactivate" title="Reactivate account" aria-label="Reactivate account">' +
              REACTIVATE_ICON + "</button>") +
          "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  async function refresh() {
    try {
      var all = await MynelleAuth.listStaff();
      accounts = all.filter(function (a) {
        return a.role === STAFF_ROLE;
      });
    } catch (e) {
      accounts = [];
    }
    render();
  }

  searchEl.addEventListener("input", render);

  rowsEl.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var id = btn.closest(".table-row").dataset.id;
    if (btn.dataset.action === "edit") openModal(id);
    else if (btn.dataset.action === "deactivate") openStatus(id, false);
    else openStatus(id, true);
  });

  // -------------------------------------------------------------------
  // Add / edit modal
  // -------------------------------------------------------------------
  var overlay = el("accountOverlay");
  var form = el("accountForm");

  function nextIdPreview() {
    var used = accounts.filter(function (a) {
      return String(a.id).indexOf("CSH-") === 0;
    }).length;
    return "CSH-" + String(used + 1).padStart(4, "0");
  }

  function clearErrors() {
    ["errFullName", "errUsername", "errEmail", "errPassword", "errConfirm"].forEach(
      function (id) {
        el(id).textContent = "";
      }
    );
    el("accountError").textContent = "";
    form.querySelectorAll(".has-error").forEach(function (f) {
      f.classList.remove("has-error");
    });
  }

  function openModal(id) {
    clearErrors();
    editingId = id || null;
    var editing = !!id;
    var account = editing
      ? accounts.find(function (a) {
          return a.id === id;
        })
      : null;

    el("accountModalTitle").textContent = editing
      ? "Edit cashier account"
      : "Add cashier account";
    el("accountSubmit").textContent = editing ? "Save changes" : "Add account";
    el("fStatusField").style.display = editing ? "flex" : "none";
    el("fPasswordLabel").textContent = editing ? "New password" : "Password *";
    el("fConfirmLabel").textContent = editing
      ? "Confirm new password"
      : "Confirm password *";

    if (editing && account) {
      el("fEmployeeId").value = account.id;
      el("fFullName").value = account.fullName;
      el("fUsername").value = account.username;
      el("fEmail").value = account.email;
      el("fStatus").value = statusOf(account);
      el("fPassword").value = "";
      el("fConfirm").value = "";
      el("fPassword").placeholder = "Leave blank to keep current";
      el("fConfirm").placeholder = "Leave blank to keep current";
    } else {
      form.reset();
      el("fEmployeeId").value = nextIdPreview();
      el("fPassword").placeholder = "";
      el("fConfirm").placeholder = "";
    }

    overlay.classList.add("open");
    setTimeout(function () {
      el("fFullName").focus();
    }, 40);
  }

  function closeModal() {
    overlay.classList.remove("open");
    editingId = null;
  }

  el("addAccountBtn").addEventListener("click", function () {
    openModal(null);
  });
  el("accountClose").addEventListener("click", closeModal);
  el("accountCancel").addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearErrors();

    var fullName = el("fFullName").value.trim();
    var username = el("fUsername").value.trim();
    var email = el("fEmail").value.trim();
    var password = el("fPassword").value;
    var confirm = el("fConfirm").value;

    var ok = true;
    function fail(fieldId, errId, message) {
      el(errId).textContent = message;
      el(fieldId).classList.add("has-error");
      ok = false;
    }

    if (!fullName) fail("fFullName", "errFullName", "Full name is required.");
    if (username.length < 3)
      fail("fUsername", "errUsername", "At least 3 characters.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      fail("fEmail", "errEmail", "Enter a valid email address.");

    var wantsPassword = !editingId || password || confirm;
    if (wantsPassword) {
      if (password.length < 8)
        fail("fPassword", "errPassword", "At least 8 characters.");
      if (password !== confirm)
        fail("fConfirm", "errConfirm", "Passwords do not match.");
    }
    if (!ok) return;

    try {
      if (editingId) {
        var patch = {
          fullName: fullName,
          username: username,
          email: email,
          role: STAFF_ROLE,
          status: el("fStatus").value,
        };
        if (password) patch.password = password;
        await MynelleAuth.updateStaff(editingId, patch);
        toast("Account updated");
      } else {
        await MynelleAuth.createStaff({
          fullName: fullName,
          username: username,
          email: email,
          role: STAFF_ROLE,
          password: password,
          confirmPassword: confirm,
        });
        toast("Cashier account created — they can sign in now");
      }
      closeModal();
      await refresh();
    } catch (err) {
      el("accountError").textContent = err.message;
    }
  });

  // -------------------------------------------------------------------
  // Deactivate / reactivate (no deleting — the record stays)
  // -------------------------------------------------------------------
  var statusOverlay = el("statusOverlay");
  var reactivating = false;

  function openStatus(id, reactivate) {
    var account = accounts.find(function (a) {
      return a.id === id;
    });
    if (!account) return;

    pendingStatusId = id;
    reactivating = !!reactivate;

    el("statusTitle").textContent = reactivate
      ? "Reactivate account"
      : "Deactivate account";
    el("statusReasonField").style.display = reactivate ? "none" : "flex";
    el("statusConfirm").textContent = reactivate ? "Reactivate" : "Deactivate";
    el("statusConfirm").className = reactivate ? "btn-primary" : "btn-danger";
    el("statusText").textContent = reactivate
      ? account.fullName +
        " will be able to sign in to the POS again straight away."
      : account.fullName +
        " won't be able to sign in to the POS. The record stays on file and can be reactivated any time.";

    if (!reactivate) el("statusReason").value = "inactive";

    statusOverlay.classList.add("open");
  }

  function closeStatus() {
    statusOverlay.classList.remove("open");
    pendingStatusId = null;
  }

  el("statusClose").addEventListener("click", closeStatus);
  el("statusCancel").addEventListener("click", closeStatus);
  statusOverlay.addEventListener("click", function (e) {
    if (e.target === statusOverlay) closeStatus();
  });

  el("statusConfirm").addEventListener("click", async function () {
    if (!pendingStatusId) return;
    var status = reactivating ? "active" : el("statusReason").value;
    try {
      await MynelleAuth.updateStaff(pendingStatusId, { status: status });
      closeStatus();
      await refresh();
      toast(reactivating ? "Account reactivated" : "Account set to " + status);
    } catch (err) {
      closeStatus();
      toast(err.message);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (overlay.classList.contains("open")) closeModal();
    if (statusOverlay.classList.contains("open")) closeStatus();
  });

  // -------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------
  refresh();
})();
