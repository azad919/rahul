// Background service worker for handling downloads
chrome.runtime.onInstalled.addListener(() => {
  console.log('Social Video Downloader installed');
});

// Track active downloads
const activeDownloads = new Map();

chrome.downloads.onCreated.addListener((downloadItem) => {
  activeDownloads.set(downloadItem.id, {
    id: downloadItem.id,
    filename: downloadItem.filename,
    progress: 0,
    state: 'in_progress'
  });
  console.log('Download started:', downloadItem.id);
});

chrome.downloads.onChanged.addListener((delta) => {
  if (delta.id in activeDownloads) {
    const item = activeDownloads[delta.id];
    
    if (delta.state) {
      item.state = delta.state.current;
    }
    
    if (delta.bytesReceived !== undefined && delta.totalBytes !== undefined) {
      item.progress = Math.round((delta.bytesReceived / delta.totalBytes) * 100);
    }
    
    if (item.state === 'complete') {
      console.log('Download complete:', delta.id);
      activeDownloads.delete(delta.id);
    }
  }
});

// Respond to download requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DOWNLOAD_VIDEO') {
    const { url, filename } = request;
    
    chrome.downloads.download({
      url: url,
      filename: filename || `video_${Date.now()}.mp4`,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    
    return true; // Keep channel open
  }
  
  if (request.action === 'GET_DOWNLOAD_PROGRESS') {
    const progress = Array.from(activeDownloads.values());
    sendResponse({ downloads: progress });
  }
});
