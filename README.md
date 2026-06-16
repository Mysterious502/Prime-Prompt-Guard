# 🛡️ Prime Prompt Guard (PPG)

![Version](https://img.shields.io/badge/version-1.0.0-blue) ![Manifest](https://img.shields.io/badge/Manifest-V3-orange)

**Never lose a single word you type online — even if your laptop crashes, the power goes out, or you accidentally close a tab.**

Prime Prompt Guard (PPG) is a lightweight, privacy-first browser extension that automatically saves everything you type in any text field, across any website. No external servers, no complicated settings, just silent protection for your thoughts.

---

## ✨ Why PPG?

You’re typing an important prompt, an email, or a long code comment — and suddenly the browser closes, the electricity goes out, or your cat walks over the keyboard and closes the tab. The text is gone. That pain ends today.

PPG silently watches over every text box you touch, saving snapshots every 1–2 seconds. You can easily restore or copy your lost text with a single click.

---

## 🚀 Features

- ⚡ **Instant Auto-Save** – Scans all `textarea`, `input[type="text"]`, and `contenteditable` elements every 1–2 seconds.
- 🗂️ **Backup up to 5 pages** – Keeps the last 5 different tabs/pages where you actually typed something.
- ⏳ **Configurable retention** – Choose how long to keep backups (default 3 hours, up to 12 hours). Older data is cleaned automatically.
- 🔒 **100% local & private** – All data stays in your browser’s local storage (`chrome.storage.local`). No external paths, no cloud, no tracking.
- 💡 **Super simple popup** – Click the extension icon to see your saved pages, preview text, and with one click copy or restore your text right back into the original field.
- 🌐 **Works everywhere** – ChatGPT, Gmail, Reddit, Google Docs, any site with a text input.
- 🧩 **Minimal UI** – Just an on/off toggle and a clean list. No complicated menus.
- 📦 **Lightweight** – No performance impact, no background bloat.

---

## 📸 Interface Preview

> When you click the PPG icon, you’ll see a tidy popup:
> - A list of recently saved pages (with favicon and time ago)
> - Each entry shows a small text preview
> - **Copy** button → instantly copies full text
> - **Restore** button → pastes text back into the field when you revisit that page
> - Settings slider to adjust retention (3h–12h)

---

## ⚙️ Installation (Developer Mode)

1. Download or clone this repository.
2. Open **Chrome** / **Edge** and go to `chrome://extensions/` or `edge://extensions/`.
3. Enable **Developer mode** (toggle in top-right).
4. Click **Load unpacked** and select the project folder.
5. The PPG icon will appear in your toolbar. You’re all set!

---

## 🧠 How It Works

- A content script runs on every page, scanning all text-input elements on a set interval.
- If the text inside a field changes, the new content is saved to local storage with a timestamp and page key.
- Only **pages where you typed** are stored, max 5 pages.
- A background timer periodically removes entries older than your chosen duration.
- The popup reads the stored data and provides copy/restore functionality.

---

## 🕹️ Settings

| Setting         | Default | Options          |
|-----------------|---------|------------------|
| Retention time  | 3 hours | 1h – 12h (slider)|
| Max saved pages | 5       | (fixed)          |
| Extension on/off| On      | Toggle in popup  |

---

## 🔒 Privacy & Security

- **No data leaves your computer.** Everything is stored using the browser's built-in `storage.local` API.
- **No analytics, no cookies, no external requests.** PPG works completely offline.
- The extension does **not** access passwords, credit cards, or any private fields.
- You can turn it off anytime for sensitive websites.

---

## 🛠️ Tech Stack

- **Manifest V3** (latest extension standard)
- Vanilla JavaScript
- `chrome.storage.local` API
- HTML/CSS popup

---

## 📌 Roadmap (Ideas)

- [ ] Add word count display in popup
- [ ] Export backups as `.txt` or `.json`
- [ ] Per-website exclusion list
- [ ] Keyboard shortcut to restore last text

---

## 🤝 Contributing

Feel free to fork, submit issues, or open pull requests. Suggestions and improvements are always welcome!

---
