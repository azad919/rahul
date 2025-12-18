// This script runs in page context to intercept fetch/XHR requests
(function() {
  const originalFetch = window.fetch;
  const originalXHR = XMLHttpRequest.prototype.open;
  
  const capturedUrls = new Set();
  
  function checkIfVideo(url) {
    const videoPatterns = [
      /\.(mp4|mov|webm|mkv|avi|flv)(\?|$)/i,
      /\/video\/|\/media\/|\/cdn\/|vod-/i,
      /\.m3u8(\?|$)/i,
      /mpegurl|video-stream/i
    ];
    
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;
      return videoPatterns.some(p => p.test(path));
    } catch {
      return false;
    }
  }
  
  // Intercept fetch
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && checkIfVideo(url)) {
      capturedUrls.add(url);
      window.postMessage({ type: 'VIDEO_URL', url }, '*');
    }
    return originalFetch.apply(this, args);
  };
  
  // Intercept XMLHttpRequest
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (typeof url === 'string' && checkIfVideo(url)) {
      capturedUrls.add(url);
      window.postMessage({ type: 'VIDEO_URL', url }, '*');
    }
    return originalXHR.apply(this, [method, url, ...rest]);
  };
  
  // Scan for video tags and source elements
  function scanDOM() {
    const videos = [];
    
    document.querySelectorAll('video').forEach(video => {
      if (video.src && checkIfVideo(video.src)) {
        videos.push({ src: video.src, type: 'mp4' });
      }
      video.querySelectorAll('source').forEach(source => {
        if (source.src && checkIfVideo(source.src)) {
          videos.push({ src: source.src, type: source.type || 'mp4' });
        }
      });
    });
    
    return videos;
  }
  
  window.getVideos = scanDOM;
  
  // Monitor for dynamically added elements
  const observer = new MutationObserver(() => {
    const videos = scanDOM();
    if (videos.length > 0) {
      window.postMessage({ type: 'VIDEOS_FOUND', videos }, '*');
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  });
  
  console.log('Video interceptor active');
})();
