// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log("Social Video Downloader installed");
});

// Listener for downloads if we wanted to show notifications
chrome.downloads.onCreated.addListener((downloadItem) => {
  console.log("Download started:", downloadItem.id);
});

chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === "complete") {
    console.log("Download complete");
  }
});