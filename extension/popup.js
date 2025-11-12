const DEFAULT_SETTINGS = {
  autoAdvanceLimit: 50,
  autoDownloadEnabled: true,
  extensionEnabled: true
};

const storageArea = chrome.storage?.sync ?? chrome.storage?.local;

document.addEventListener("DOMContentLoaded", () => {
  const limitInput = document.getElementById("autoAdvanceLimit");
  const toggleInput = document.getElementById("autoDownloadEnabled");
  const extensionButton = document.getElementById("extensionToggleBtn");
  const status = document.getElementById("status");

  let extensionEnabled = DEFAULT_SETTINGS.extensionEnabled;

  function setStatus(text, error = false) {
    if (!status) return;
    status.textContent = text || "";
    status.style.color = error ? "#dc2626" : "#0f766e";
  }

  function syncExtensionState(enabled) {
    extensionEnabled = Boolean(enabled);
    if (extensionButton) {
      extensionButton.textContent = extensionEnabled ? "Disable extension" : "Enable extension";
      extensionButton.classList.toggle("is-off", !extensionEnabled);
    }

    const disabled = !extensionEnabled;
    if (limitInput) {
      limitInput.disabled = disabled;
    }
    if (toggleInput) {
      toggleInput.disabled = disabled;
    }
  }

  function load() {
    if (!storageArea) {
      limitInput.value = DEFAULT_SETTINGS.autoAdvanceLimit;
      toggleInput.checked = DEFAULT_SETTINGS.autoDownloadEnabled;
      syncExtensionState(DEFAULT_SETTINGS.extensionEnabled);
      setStatus("Storage unavailable - using default values", true);
      return;
    }

    storageArea.get(DEFAULT_SETTINGS, (items) => {
      const currentLimit = normalizeLimit(items?.autoAdvanceLimit);
      limitInput.value = currentLimit;
      toggleInput.checked = Boolean(
        typeof items?.autoDownloadEnabled === "boolean"
          ? items.autoDownloadEnabled
          : DEFAULT_SETTINGS.autoDownloadEnabled
      );
      const enabled = typeof items?.extensionEnabled === "boolean" ? items.extensionEnabled : DEFAULT_SETTINGS.extensionEnabled;
      syncExtensionState(enabled);
      setStatus("");
    });
  }

  function saveLimit(value) {
    persistSettings({ autoAdvanceLimit: normalizeLimit(value) });
  }

  function saveToggle(enabled) {
    persistSettings(
      { autoDownloadEnabled: Boolean(enabled) },
      enabled ? "Auto download enabled" : "Auto download disabled"
    );
  }

  function saveExtensionState(enabled) {
    persistSettings(
      { extensionEnabled: Boolean(enabled) },
      enabled ? "Extension enabled" : "Extension disabled",
      () => syncExtensionState(enabled)
    );
  }

  function persistSettings(patch, successMessage = "Settings saved", onSuccess) {
    if (!storageArea) {
      setStatus("Cannot save - storage not supported", true);
      return;
    }

    storageArea.set(patch, () => {
      if (chrome.runtime.lastError) {
        setStatus("Failed to save settings", true);
        return;
      }
      setStatus(successMessage, false);
      if (typeof onSuccess === "function") {
        onSuccess();
      }
    });
  }

  limitInput.addEventListener("change", (event) => {
    saveLimit(event.target.value);
  });

  toggleInput.addEventListener("change", (event) => {
    saveToggle(event.target.checked);
  });

  extensionButton.addEventListener("click", () => {
    saveExtensionState(!extensionEnabled);
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
