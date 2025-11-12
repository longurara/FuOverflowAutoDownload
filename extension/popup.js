const DEFAULT_SETTINGS = {
  autoAdvanceLimit: 50
};

const storageArea = chrome.storage?.sync ?? chrome.storage?.local;

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("autoAdvanceLimit");
  const status = document.getElementById("status");

  function setStatus(text, error = false) {
    if (!status) return;
    status.textContent = text || "";
    status.style.color = error ? "#dc2626" : "#0f766e";
  }

  function load() {
    if (!storageArea) {
      input.value = DEFAULT_SETTINGS.autoAdvanceLimit;
      setStatus("Storage unavailable - using default value", true);
      return;
    }

    storageArea.get(DEFAULT_SETTINGS, (items) => {
      const current = normalizeLimit(items?.autoAdvanceLimit);
      input.value = current;
      setStatus("");
    });
  }

  function save(value) {
    if (!storageArea) {
      setStatus("Cannot save - storage not supported", true);
      return;
    }

    const normalized = normalizeLimit(value);
    storageArea.set({ autoAdvanceLimit: normalized }, () => {
      if (chrome.runtime.lastError) {
        setStatus("Failed to save settings", true);
        return;
      }
      setStatus("Settings saved");
    });
  }

  input.addEventListener("change", (event) => {
    save(event.target.value);
  });

  load();
});

function normalizeLimit(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_SETTINGS.autoAdvanceLimit;
  }
  return Math.min(parsed, 999);
}
