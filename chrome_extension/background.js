// Background service worker
console.log('[VideoDownloader] Background service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[VideoDownloader] Extension installed');
});

// Handle download messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DOWNLOAD_VIDEO') {
    const { url, filename } = request;
    console.log('[VideoDownloader] Starting download:', filename);
    
    chrome.downloads.download({
      url: url,
      filename: filename || `video_${Date.now()}.mp4`,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('[VideoDownloader] Download error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[VideoDownloader] Download started:', downloadId);
        sendResponse({ success: true, downloadId });
      }
    });
    
    return true;
  }
});
