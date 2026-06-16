// ================================================================
// PPG - Content Script
// Runs on every page - monitors text fields - sends data to bg
// ================================================================

(function () {
  "use strict";

  // ── Config ────────────────────────────────────────────────────
  const SCAN_INTERVAL_MS = 2000;  // scan every 2 seconds
  const MIN_TEXT_LENGTH  = 5;     // ignore very short text

  // ── State ─────────────────────────────────────────────────────
  let lastSavedText = "";
  let isEnabled     = true;
  let scanTimer     = null;

  // ── Startup ───────────────────────────────────────────────────
  function init() {
    // Ask background for current settings
    chrome.runtime.sendMessage({ type: "PPG_GET_SETTINGS" }, function (response) {
      if (chrome.runtime.lastError) return;
      if (response) {
        isEnabled = response.enabled ?? true;
      }
      if (isEnabled) startScanning();
    });

    // Listen for messages from background / popup
    chrome.runtime.onMessage.addListener(function (msg) {
      if (msg.type === "PPG_TOGGLE") {
        isEnabled = msg.enabled;
        if (isEnabled) {
          startScanning();
        } else {
          stopScanning();
        }
      }

      if (msg.type === "PPG_RESTORE") {
        restoreText(msg.text);
      }
    });
  }

  // ── Start / Stop Scanning ─────────────────────────────────────
  function startScanning() {
    if (scanTimer !== null) return;
    scanTimer = setInterval(runScan, SCAN_INTERVAL_MS);
  }

  function stopScanning() {
    if (scanTimer !== null) {
      clearInterval(scanTimer);
      scanTimer = null;
    }
  }

  // ── Main Scan ─────────────────────────────────────────────────
  function runScan() {
    var text = getAllText();

    // Nothing typed
    if (!text || text.length < MIN_TEXT_LENGTH) return;

    // No change since last scan
    if (text === lastSavedText) return;

    // Update and send to background to save
    lastSavedText = text;
    sendToBackground(text);
  }

  // ── Extract Text From Page ────────────────────────────────────
  function getAllText() {
    var parts = [];

    // -- textareas --
    var textareas = document.querySelectorAll("textarea");
    for (var i = 0; i < textareas.length; i++) {
      var val = textareas[i].value;
      if (val && val.trim().length >= MIN_TEXT_LENGTH) {
        parts.push(val.trim());
      }
    }

    // -- regular text inputs --
    var inputs = document.querySelectorAll("input[type='text'], input[type='search'], input:not([type])");
    for (var j = 0; j < inputs.length; j++) {
      var ival = inputs[j].value;
      if (ival && ival.trim().length >= MIN_TEXT_LENGTH) {
        parts.push(ival.trim());
      }
    }

    // -- contenteditable (ChatGPT, Notion, Gmail, etc.) --
    var editables = document.querySelectorAll("[contenteditable='true']");
    for (var k = 0; k < editables.length; k++) {
      var etext = editables[k].innerText;
      if (etext && etext.trim().length >= MIN_TEXT_LENGTH) {
        parts.push(etext.trim());
      }
    }

    return parts.join("\n\n");
  }

  // ── Send Data to Background Script ───────────────────────────
  function sendToBackground(text) {
    var pageData = {
      type     : "PPG_SAVE_TEXT",
      url      : window.location.href,
      host     : window.location.hostname,
      title    : document.title || window.location.hostname,
      text     : text,
      preview  : text.substring(0, 150).replace(/\n/g, " "),
      timestamp: Date.now()
    };

    chrome.runtime.sendMessage(pageData, function () {
      // Ignore errors (background might be sleeping)
      if (chrome.runtime.lastError) {}
    });
  }

  // ── Restore Text Back to Page ─────────────────────────────────
  function restoreText(text) {
    var target = null;

    // Try focused element first
    var active = document.activeElement;
    if (active) {
      if (active.tagName === "TEXTAREA" || active.tagName === "INPUT") {
        target = active;
      } else if (active.getAttribute("contenteditable") === "true") {
        target = active;
      }
    }

    // Fallback: find first available field
    if (!target) {
      target = document.querySelector("textarea") ||
               document.querySelector("[contenteditable='true']") ||
               document.querySelector("input[type='text']");
    }

    if (!target) {
      alert("PPG: No text field found on this page to restore into.");
      return;
    }

    // Insert text
    if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
      target.value = text;
      target.dispatchEvent(new Event("input",  { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      target.innerText = text;
      target.dispatchEvent(new Event("input",  { bubbles: true }));
    }

    target.focus();
  }

  // ── Run ───────────────────────────────────────────────────────
  init();

})();