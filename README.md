# FuOverflow Auto Downloader

## Folder structure

- `extension/manifest.json` – Manifest V3 config (downloads + storage permissions, FuOverflow host scope, popup registration).
- `extension/background.js` – Service worker that deduplicates URLs and triggers `chrome.downloads.download`.
- `extension/content.js` – Content script that watches the DOM/Lightbox, sends new links, and runs the auto-next logic based on the configured limit.
- `extension/popup.html` & `extension/popup.js` – Small menu for choosing how many images to auto-next plus the credit line.

## Installation

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and point to the `extension` directory.

## Usage

- Visit any FuOverflow thread with attachment download buttons; the script tags each anchor and sends it to the background worker to download once.
- Click the first image/attachment; the content script reads Fancybox’s gallery size (via `Fancybox.getInstance().items.length` or `<span data-fancybox-count>`) and auto-presses Next every 0.5 s until it finishes or you press `Esc`. If the counter element is missing, it falls back to your configured limit.
- Use the extension popup (click the toolbar icon) to choose the fallback total image count. Because the first image is triggered manually, the auto-next counter uses “value − 1”. Example: enter `50` ⇒ the extension presses Next 49 more times.

## Notes

- Relative attachment paths such as `/attachments/...` are converted to absolute URLs via `window.location.origin`.
- Filenames are taken from the `download` attribute when possible; otherwise the URL tail is used and sanitized to ASCII-safe characters.
  "# FuOverflowAutoDownload"
