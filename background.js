// ================================================================
// PPG - Background Service Worker
// Handles storage, cleanup, and message routing
// ================================================================

"use strict";

var MAX_PAGES       = 5;    // max saved pages
var DEFAULT_HOURS   = 3;    // default retention hours

// ── Install ───────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get(["ppg_enabled", "ppg_hours", "ppg_pages"], function (data) {

    var defaults = {};
    if (data.ppg_enabled === undefined)  defaults.ppg_enabled = true;
    if (data.ppg_hours   === undefined)  defaults.ppg_hours   = DEFAULT_HOURS;
    if (data.ppg_pages   === undefined)  defaults.ppg_pages   = [];

    if (Object.keys(defaults).length > 0) {
      chrome.storage.local.set(defaults);
    }
  });

  // Cleanup alarm - runs every 20 minutes
  chrome.alarms.create("ppg_cleanup", { periodInMinutes: 20 });
});

// ── Alarm - Delete Expired Entries ────────────────────────────
chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name !== "ppg_cleanup") return;
  deleteExpiredPages();
});

function deleteExpiredPages() {
  chrome.storage.local.get(["ppg_pages", "ppg_hours"], function (data) {
    var pages   = data.ppg_pages || [];
    var hours   = data.ppg_hours || DEFAULT_HOURS;
    var cutoff  = Date.now() - (hours * 60 * 60 * 1000);

    var fresh = pages.filter(function (p) {
      return p.timestamp > cutoff;
    });

    if (fresh.length !== pages.length) {
      chrome.storage.local.set({ ppg_pages: fresh });
    }
  });
}

// ── Message Handler ───────────────────────────────────────────
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {

  // ── content.js wants to save text ──
  if (msg.type === "PPG_SAVE_TEXT") {
    handleSaveText(msg);
    sendResponse({ ok: true });
    return true;
  }

  // ── popup wants current settings ──
  if (msg.type === "PPG_GET_SETTINGS") {
    chrome.storage.local.get(["ppg_enabled", "ppg_hours"], function (data) {
      sendResponse({
        enabled: data.ppg_enabled ?? true,
        hours  : data.ppg_hours   ?? DEFAULT_HOURS
      });
    });
    return true; // keep channel open for async
  }

  // ── content.js wants settings ──
  if (msg.type === "PPG_GET_SETTINGS") {
    chrome.storage.local.get(["ppg_enabled", "ppg_hours"], function (data) {
      sendResponse({
        enabled: data.ppg_enabled ?? true,
        hours  : data.ppg_hours   ?? DEFAULT_HOURS
      });
    });
    return true;
  }

  // ── popup changed settings ──
  if (msg.type === "PPG_UPDATE_SETTINGS") {
    chrome.storage.local.set({
      ppg_enabled: msg.enabled,
      ppg_hours  : msg.hours
    }, function () {
      // Tell all tabs about the toggle
      broadcastToAllTabs({
        type   : "PPG_TOGGLE",
        enabled: msg.enabled
      });
      sendResponse({ ok: true });
    });
    return true;
  }

  // ── popup wants to restore text on active tab ──
  if (msg.type === "PPG_RESTORE_REQUEST") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "PPG_RESTORE",
          text: msg.text
        }, function () {
          if (chrome.runtime.lastError) {}
        });
      }
    });
    sendResponse({ ok: true });
    return true;
  }

  // ── popup wants to delete one entry ──
  if (msg.type === "PPG_DELETE_ENTRY") {
    chrome.storage.local.get("ppg_pages", function (data) {
      var pages   = data.ppg_pages || [];
      var updated = pages.filter(function (p) {
        return p.url !== msg.url;
      });
      chrome.storage.local.set({ ppg_pages: updated }, function () {
        sendResponse({ ok: true });
      });
    });
    return true;
  }

  // ── popup wants to clear all ──
  if (msg.type === "PPG_CLEAR_ALL") {
    chrome.storage.local.set({ ppg_pages: [] }, function () {
      sendResponse({ ok: true });
    });
    return true;
  }

});

// ── Save Text Logic ───────────────────────────────────────────
function handleSaveText(msg) {
  chrome.storage.local.get(["ppg_pages", "ppg_hours", "ppg_enabled"], function (data) {

    // If disabled, skip
    if (data.ppg_enabled === false) return;

    var pages   = data.ppg_pages || [];
    var hours   = data.ppg_hours || DEFAULT_HOURS;
    var cutoff  = Date.now() - (hours * 60 * 60 * 1000);

    // Remove expired entries first
    pages = pages.filter(function (p) {
      return p.timestamp > cutoff;
    });

    // Check if this URL already exists
    var existingIndex = -1;
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].url === msg.url) {
        existingIndex = i;
        break;
      }
    }

    var entry = {
      url      : msg.url,
      host     : msg.host,
      title    : msg.title,
      text     : msg.text,
      preview  : msg.preview,
      timestamp: msg.timestamp
    };

    if (existingIndex !== -1) {
      // Update existing entry
      pages[existingIndex] = entry;
    } else {
      // Add new entry at top
      pages.unshift(entry);

      // Keep only MAX_PAGES entries
      if (pages.length > MAX_PAGES) {
        pages = pages.slice(0, MAX_PAGES);
      }
    }

    chrome.storage.local.set({ ppg_pages: pages });
  });
}

// ── Broadcast to All Tabs ─────────────────────────────────────
function broadcastToAllTabs(message) {
  chrome.tabs.query({}, function (tabs) {
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      if (tab.id && tab.url && tab.url.indexOf("chrome://") !== 0) {
        chrome.tabs.sendMessage(tab.id, message, function () {
          if (chrome.runtime.lastError) {}
        });
      }
    }
  });
}