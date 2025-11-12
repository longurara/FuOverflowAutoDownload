(() => {
  if (window.__fuoAutoDownloaderInitialized) {
    return;
  }
  window.__fuoAutoDownloaderInitialized = true;

  const SELECTOR = 'a.f-button[download][data-fancybox-download][href]';
  const DEFAULT_SETTINGS = {
    autoAdvanceLimit: 50
  };
  const settings = { ...DEFAULT_SETTINGS };
  const storageArea = chrome.storage?.sync ?? chrome.storage?.local ?? null;
  const storageAreaName = chrome.storage?.sync ? "sync" : chrome.storage?.local ? "local" : null;

  initializeSettings();

  function initializeSettings() {
    if (!storageArea) {
      return;
    }

    storageArea.get(DEFAULT_SETTINGS, (items) => {
      applySettings(items);
    });

    chrome.storage?.onChanged?.addListener((changes, areaName) => {
      if (storageAreaName && areaName !== storageAreaName) {
        return;
      }

      if (Object.prototype.hasOwnProperty.call(changes, "autoAdvanceLimit")) {
        applySettings({ autoAdvanceLimit: changes.autoAdvanceLimit.newValue });
      }
    });
  }

  const observe = () => {
    processAnchors(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes") {
          const target = mutation.target;
          if (target.matches?.(SELECTOR)) {
            const info = handleAnchor(target);
            if (info) {
              sendLinks([info]);
            }
          }
          return;
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
          }

          if (node.matches?.(SELECTOR)) {
            processAnchors(node);
          } else if (node.querySelector) {
            processAnchors(node);
          }
        });
      });
    });

    const attachObserver = () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["href", "download"]
      });
    };

    if (document.body) {
      attachObserver();
    } else {
      window.addEventListener("DOMContentLoaded", attachObserver, { once: true });
    }

    document.addEventListener("click", (event) => {
      const navButton = event.target.closest?.("button[data-carousel-next], button[data-carousel-prev]");
      if (navButton) {
        setTimeout(() => processAnchors(document), 50);
      }

      const galleryTrigger = event.target.closest?.("[data-fancybox], [data-xf-init='lightbox'], .js-lbImage");
      if (galleryTrigger) {
        startAutoAdvance();
        setTimeout(() => processAnchors(document), 80);
      }

      const downloadAnchor = event.target.closest?.(SELECTOR);
      if (downloadAnchor) {
        startAutoAdvance();
        setTimeout(() => processAnchors(document), 50);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        stopAutoAdvance();
      }
    });
  };

  function processAnchors(root) {
    const batch = [];
    root.querySelectorAll?.(SELECTOR).forEach((anchor) => {
      const info = handleAnchor(anchor);
      if (info) {
        batch.push(info);
      }
    });

    if (batch.length) {
      sendLinks(batch);
    }
  }

  function handleAnchor(anchor) {
    const linkInfo = buildLinkInfo(anchor);
    if (!linkInfo) {
      return null;
    }

    if (anchor.dataset.fuoLastUrl === linkInfo.url) {
      return null;
    }

    anchor.dataset.fuoLastUrl = linkInfo.url;
    return linkInfo;
  }

  function sendLinks(links) {
    chrome.runtime?.sendMessage?.({
      type: "FUO_ATTACHMENT_LINKS",
      links
    });
  }

  function buildLinkInfo(anchor) {
    const href = anchor.getAttribute("href");
    if (!href) {
      return null;
    }

    let url;
    try {
      url = new URL(href, window.location.origin).toString();
    } catch (error) {
      console.warn("FuOverflow Auto Downloader: skip invalid link", href);
      return null;
    }

    const downloadAttr = anchor.getAttribute("download");
    const filename = downloadAttr
      ? sanitizeFilename(downloadAttr)
      : url.split("/").pop() || "fuoverflow-file";

    return { url, filename };
  }

  function sanitizeFilename(rawName) {
    const parts = rawName.split("/");
    const name = parts[parts.length - 1] || "fuoverflow-file";
    return name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  }

  const AUTO_ADVANCE_MS = 500;
  let autoAdvanceTimer = null;
  let autoAdvanceRemaining = 0;

  function startAutoAdvance() {
    const detectedLimit = detectGalleryCount();
    const fallbackLimit = getAutoAdvanceLimit();
    const targetLimit = Number.isFinite(detectedLimit) ? detectedLimit : fallbackLimit;

    autoAdvanceRemaining = Math.max(targetLimit - 1, 0);

    if (autoAdvanceRemaining <= 0) {
      stopAutoAdvance();
      return;
    }

    if (autoAdvanceTimer) {
      return;
    }

    autoAdvanceTimer = window.setInterval(() => {
      if (autoAdvanceRemaining <= 0) {
        stopAutoAdvance();
        return;
      }

      const advanced = triggerNext();
      if (!advanced) {
        stopAutoAdvance();
        return;
      }

      autoAdvanceRemaining -= 1;
      setTimeout(() => processAnchors(document), 60);
    }, AUTO_ADVANCE_MS);
  }

  function stopAutoAdvance() {
    if (autoAdvanceTimer) {
      clearInterval(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
    autoAdvanceRemaining = 0;
  }

  function triggerNext() {
    const fancyboxInstance = window.Fancybox?.getInstance?.();
    if (fancyboxInstance && typeof fancyboxInstance.next === "function") {
      fancyboxInstance.next();
      return true;
    }

    const navigationPerformed = clickNextButton();
    if (navigationPerformed) {
      return true;
    }

    const keyboardEvent = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      code: "ArrowRight",
      keyCode: 39,
      which: 39,
      bubbles: true
    });

    return document.dispatchEvent(keyboardEvent);
  }

  function clickNextButton() {
    const candidates = [
      "button.f-button.is-next",
      "button[data-carousel-next]",
      ".fancybox__nav button[title='Next']",
      ".fancybox__button--arrow_next"
    ];

    for (const selector of candidates) {
      const button = document.querySelector(selector);
      if (button && !button.disabled && button.getAttribute("aria-disabled") !== "true") {
        button.click();
        return true;
      }
    }

    return false;
  }

  function applySettings(nextSettings = {}) {
    if (!nextSettings) {
      return;
    }

    const limit = normalizeAutoAdvanceLimit(nextSettings.autoAdvanceLimit);
    settings.autoAdvanceLimit = limit;
  }

  function getAutoAdvanceLimit() {
    const limit = parseInt(settings.autoAdvanceLimit, 10);
    if (!Number.isFinite(limit) || limit < 1) {
      return DEFAULT_SETTINGS.autoAdvanceLimit;
    }
    return Math.min(limit, 999);
  }

  function normalizeAutoAdvanceLimit(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return DEFAULT_SETTINGS.autoAdvanceLimit;
    }
    return Math.min(parsed, 999);
  }

  function detectGalleryCount() {
    const instance = window.Fancybox?.getInstance?.();
    if (instance && Array.isArray(instance.items) && instance.items.length > 0) {
      return instance.items.length;
    }

    const countEl = document.querySelector("[data-fancybox-count]");
    if (countEl) {
      const textValue = countEl.textContent?.trim();
      const attrValue = countEl.getAttribute("data-fancybox-count");

      const parsed = parseInt(textValue || attrValue, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return null;
  }

  observe();
})();
