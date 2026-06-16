// ================================================================
// PPG Popup Script — Dark Theme
// ================================================================

"use strict";

// ── Elements ──────────────────────────────────────────────────
var toggleBtn       = document.getElementById("toggleBtn");
var toggleThumb     = document.getElementById("toggleThumb");
var scanDot         = document.getElementById("scanDot");
var scanLabel       = document.getElementById("scanLabel");
var scanningBadge   = document.getElementById("scanningBadge");
var retentionSlider = document.getElementById("retentionSlider");
var retentionValue  = document.getElementById("retentionValue");
var pagesList       = document.getElementById("pagesList");
var emptyState      = document.getElementById("emptyState");
var clearAllBtn     = document.getElementById("clearAllBtn");
var pagesCount      = document.getElementById("pagesCount");

// ── State ─────────────────────────────────────────────────────
var isEnabled = true;
var hours     = 3;

// ── Init ──────────────────────────────────────────────────────
function init() {
  loadSettings(function () {
    renderList();
  });

  toggleBtn.addEventListener("click", onToggle);
  retentionSlider.addEventListener("input", onSliderInput);
  retentionSlider.addEventListener("change", onSliderCommit);
  clearAllBtn.addEventListener("click", onClearAll);
}

// ── Load Settings ─────────────────────────────────────────────
function loadSettings(callback) {
  chrome.storage.local.get(["ppg_enabled", "ppg_hours"], function (data) {
    isEnabled = data.ppg_enabled !== undefined ? data.ppg_enabled : true;
    hours     = data.ppg_hours   !== undefined ? data.ppg_hours   : 3;

    applyToggleUI(isEnabled);
    retentionSlider.value        = hours;
    retentionValue.textContent   = formatRetention(hours);

    if (callback) callback();
  });
}

// ── Render List ───────────────────────────────────────────────
function renderList() {
  chrome.storage.local.get("ppg_pages", function (data) {
    var pages  = data.ppg_pages || [];
    var cutoff = Date.now() - (hours * 60 * 60 * 1000);

    var valid = pages.filter(function (p) {
      return p.timestamp > cutoff;
    });

    // Update count badge
    pagesCount.textContent = "(" + valid.length + " / max 5)";

    // Clear list
    pagesList.innerHTML = "";

    if (valid.length === 0) {
      emptyState.classList.remove("hidden");
      pagesList.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    pagesList.classList.remove("hidden");

    valid.forEach(function (page) {
      var card = buildCard(page);
      pagesList.appendChild(card);
    });
  });
}

// ── Build Card ────────────────────────────────────────────────
function buildCard(page) {
  var li = document.createElement("li");
  li.className = "page-card";

  var siteName = page.title || page.host || "Unknown Site";
  var pageUrl  = page.url   || "";
  var preview  = page.preview || (page.text ? page.text.substring(0, 150) : "");
  var timeAgo  = getTimeAgo(page.timestamp);
  var chars    = page.text ? page.text.length : 0;

  li.innerHTML =
    '<div class="card-top">' +
      '<div>' +
        '<p class="card-site-name" title="' + esc(siteName) + '">' + esc(siteName) + '</p>' +
        '<p class="card-url" title="' + esc(pageUrl) + '">' + esc(pageUrl) + '</p>' +
      '</div>' +
      '<span class="card-time">' + timeAgo + '</span>' +
    '</div>' +
    '<p class="card-preview">' + esc(preview) + '</p>' +
    '<div class="card-footer">' +
      '<span class="card-chars">' + chars + ' chars</span>' +
      '<div class="card-btns">' +
        '<button class="btn-copy" type="button">Copy</button>' +
        '<button class="btn-restore" type="button">Restore</button>' +
      '</div>' +
    '</div>';

  var copyBtn    = li.querySelector(".btn-copy");
  var restoreBtn = li.querySelector(".btn-restore");

  copyBtn.addEventListener("click", function () {
    doCopy(page.text || "", copyBtn);
  });

  restoreBtn.addEventListener("click", function () {
    doRestore(page.text || "");
  });

  return li;
}

// ── Toggle ────────────────────────────────────────────────────
function onToggle() {
  isEnabled = !isEnabled;
  applyToggleUI(isEnabled);

  chrome.runtime.sendMessage({
    type   : "PPG_UPDATE_SETTINGS",
    enabled: isEnabled,
    hours  : hours
  }, function () {
    if (chrome.runtime.lastError) {}
  });
}

function applyToggleUI(enabled) {
  if (enabled) {
    toggleBtn.classList.remove("disabled");
    toggleBtn.classList.add("enabled");
    scanDot.classList.remove("paused");
    scanLabel.textContent       = "scanning";
    scanningBadge.style.color   = "#fecaca";
  } else {
    toggleBtn.classList.remove("enabled");
    toggleBtn.classList.add("disabled");
    scanDot.classList.add("paused");
    scanLabel.textContent       = "paused";
    scanningBadge.style.color   = "#6b7280";
  }
}

// ── Slider ────────────────────────────────────────────────────
function onSliderInput() {
  var val = parseInt(retentionSlider.value);
  retentionValue.textContent = formatRetention(val);
}

function onSliderCommit() {
  hours = parseInt(retentionSlider.value);

  chrome.runtime.sendMessage({
    type   : "PPG_UPDATE_SETTINGS",
    enabled: isEnabled,
    hours  : hours
  }, function () {
    if (chrome.runtime.lastError) {}
    renderList();
  });
}

// ── Copy ──────────────────────────────────────────────────────
function doCopy(text, btn) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      showCopied(btn);
    }).catch(function () {
      fallbackCopy(text, btn);
    });
  } else {
    fallbackCopy(text, btn);
  }
}

function fallbackCopy(text, btn) {
  var ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand("copy");
    showCopied(btn);
  } catch (e) {
    alert("Copy failed — please select text manually.");
  }
  document.body.removeChild(ta);
}

function showCopied(btn) {
  var prev = btn.textContent;
  btn.textContent = "✅ Copied!";
  btn.classList.add("copied");
  setTimeout(function () {
    btn.textContent = prev;
    btn.classList.remove("copied");
  }, 2000);
}

// ── Restore ───────────────────────────────────────────────────
function doRestore(text) {
  chrome.runtime.sendMessage({
    type: "PPG_RESTORE_REQUEST",
    text: text
  }, function () {
    if (chrome.runtime.lastError) {}
  });
  window.close();
}

// ── Clear All ─────────────────────────────────────────────────
function onClearAll() {
  if (!confirm("Delete all saved data?")) return;
  chrome.runtime.sendMessage({ type: "PPG_CLEAR_ALL" }, function () {
    if (chrome.runtime.lastError) {}
    renderList();
  });
}

// ── Helpers ───────────────────────────────────────────────────
function formatRetention(h) {
  return h + "h / up to 12h";
}

function getTimeAgo(ts) {
  var diff = Date.now() - ts;
  var mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return mins + "m ago";
  var h = Math.floor(mins / 60);
  if (h  < 24)   return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

function esc(str) {
  return String(str || "")
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;");
}

// ── Run ───────────────────────────────────────────────────────
init();