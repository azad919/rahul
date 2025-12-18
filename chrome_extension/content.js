// Content script - bridge between page and extension
console.log('[VideoDownloader] Content script loaded');

// Inject page script
try {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = () => script.remove();
  script.onerror = () => {
    console.error('[VideoDownloader] Failed to load injected.js');
    script.remove();
  };
  document.documentElement.appendChild(script);
} catch (e) {
  console.error('[VideoDownloader] Failed to inject script:', e);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[VideoDownloader] Content received message:', request.action);
  
  if (request.action === 'SCAN_VIDEOS') {
    // Get videos from page context
    try {
      const videos = window.__videoDownloaderVideos ? 
        Array.from(window.__videoDownloaderVideos.values()) : 
        [];
      
      // Also scan visible video elements
      document.querySelectorAll('video').forEach(video => {
        if (video.src && !videos.some(v => v.src === video.src)) {
          videos.push({
            src: video.src,
            type: video.type || 'video/mp4',
            timestamp: Date.now()
          });
        }
        video.querySelectorAll('source').forEach(source => {
          if (source.src && !videos.some(v => v.src === source.src)) {
            videos.push({
              src: source.src,
              type: source.type || 'video/mp4',
              timestamp: Date.now()
            });
          }
        });
      });
      
      console.log('[VideoDownloader] Found videos:', videos.length);
      sendResponse({ videos });
    } catch (e) {
      console.error('[VideoDownloader] Error scanning videos:', e);
      sendResponse({ videos: [] });
    }
  }
  
  return true; // Keep message channel open
});

console.log('[VideoDownloader] Content script ready');
