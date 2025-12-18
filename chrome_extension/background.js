console.log('[VideoDownloader] Background worker initialized');

// Simple download handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'DOWNLOAD') {
    const { url, filename } = message;
    console.log('[VideoDownloader] Download request:', filename);

    chrome.downloads.download(
      {
        url: url,
        filename: filename || 'video.mp4',
        saveAs: false
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('[VideoDownloader] Error:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('[VideoDownloader] Download started:', downloadId);
          sendResponse({ success: true, downloadId });
        }
      }
    );
    return true;
  }
});
