// Simple, direct video scanner
console.log('[VideoDownloader] Content script injected on:', window.location.hostname);

function getAllVideos() {
  const videos = [];
  const seen = new Set();

  // Scan for video elements
  document.querySelectorAll('video').forEach((videoEl) => {
    // Direct src
    if (videoEl.src && videoEl.src.trim() && !seen.has(videoEl.src)) {
      videos.push({
        src: videoEl.src,
        type: 'video/mp4',
        timestamp: Date.now()
      });
      seen.add(videoEl.src);
    }

    // Source elements
    videoEl.querySelectorAll('source').forEach((sourceEl) => {
      if (sourceEl.src && sourceEl.src.trim() && !seen.has(sourceEl.src)) {
        videos.push({
          src: sourceEl.src,
          type: sourceEl.type || 'video/mp4',
          timestamp: Date.now()
        });
        seen.add(sourceEl.src);
      }
    });
  });

  console.log('[VideoDownloader] Found videos:', videos.length);
  return videos;
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[VideoDownloader] Received message:', message.action);

  if (message.action === 'GET_VIDEOS') {
    const videos = getAllVideos();
    console.log('[VideoDownloader] Sending videos:', videos.length);
    sendResponse({ success: true, videos });
    return;
  }

  if (message.action === 'PING') {
    console.log('[VideoDownloader] Ping received');
    sendResponse({ success: true, pong: true });
    return;
  }

  sendResponse({ success: false, error: 'Unknown action' });
});

console.log('[VideoDownloader] Content script ready and listening');
