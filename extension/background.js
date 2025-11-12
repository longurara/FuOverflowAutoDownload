const downloadedKeys = new Set();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "FUO_ATTACHMENT_LINKS" || !Array.isArray(message.links)) {
    return;
  }

  message.links.forEach((linkInfo) => {
    queueDownload(linkInfo);
  });
});

async function queueDownload(linkInfo = {}) {
  const { url, filename } = linkInfo;

  if (!url) {
    return;
  }

  const key = `${url}::${filename || ""}`;

  if (downloadedKeys.has(key)) {
    return;
  }

  downloadedKeys.add(key);

  try {
    await chrome.downloads.download({
      url,
      filename,
      conflictAction: "uniquify",
      saveAs: false
    });
  } catch (error) {
    console.error("FuOverflow Auto Downloader:", error, url);
    downloadedKeys.delete(key);
  }
}
