// Page context script - runs in the actual page
(function() {
  console.log('[VideoDownloader] Injected script loaded');
  
  const videos = new Map();
  
  // Store captured videos
  window.__videoDownloaderVideos = videos;
  
  // Intercept fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && isVideoUrl(url)) {
      console.log('[VideoDownloader] Captured video URL via fetch:', url);
      storeVideo(url);
    }
    return originalFetch.apply(this, args);
  };
  
  // Intercept XHR
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (url && isVideoUrl(url)) {
      console.log('[VideoDownloader] Captured video URL via XHR:', url);
      storeVideo(url);
    }
    return originalOpen.apply(this, [method, url, ...rest]);
  };
  
  function isVideoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    const videoPatterns = [
      /\.(mp4|webm|mov)(\?|#|$)/i,
      /\/video(s)?\/|\/media\/|\/cdn\/|vod[_-]/i,
      /\.m3u8(\?|#|$)/i,
      /\/reel\/|\/watch\/|\/video\/|\/v\//i
    ];
    
    try {
      const urlObj = new URL(url, window.location.href);
      return videoPatterns.some(p => p.test(urlObj.pathname + urlObj.search));
    } catch {
      return videoPatterns.some(p => p.test(url));
    }
  }
  
  function storeVideo(url) {
    if (!videos.has(url)) {
      videos.set(url, {
        src: url,
        type: 'video/mp4',
        timestamp: Date.now()
      });
    }
  }
  
  // Scan DOM for video tags
  function scanDOM() {
    document.querySelectorAll('video').forEach(video => {
      if (video.src && !videos.has(video.src)) {
        storeVideo(video.src);
      }
      video.querySelectorAll('source').forEach(source => {
        if (source.src && !videos.has(source.src)) {
          storeVideo(source.src);
        }
      });
    });
  }
  
  // Initial scan
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanDOM);
  } else {
    scanDOM();
  }
  
  // Monitor for new videos
  const observer = new MutationObserver(() => scanDOM());
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  });
  
  // Export getter function
  window.getDownloadedVideos = function() {
    return Array.from(videos.values());
  };
  
  console.log('[VideoDownloader] Monitoring active');
})();
