// Inject the page-context script
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Listen for messages from injected script
const capturedVideos = new Set();

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'VIDEO_URL') {
    capturedVideos.add(event.data.url);
  }
  
  if (event.data.type === 'VIDEOS_FOUND') {
    event.data.videos.forEach(v => capturedVideos.add(v.src));
  }
});

// Respond to content script messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SCAN_VIDEOS') {
    const videos = Array.from(capturedVideos).map(url => ({
      src: url,
      type: 'video/mp4',
      duration: 0,
      poster: null
    }));
    
    // Also check for video tags on the page
    document.querySelectorAll('video').forEach(video => {
      if (video.src && !capturedVideos.has(video.src)) {
        videos.push({
          src: video.src,
          type: video.type || 'video/mp4',
          duration: video.duration || 0,
          poster: video.poster
        });
        capturedVideos.add(video.src);
      }
      
      video.querySelectorAll('source').forEach(source => {
        if (source.src && !capturedVideos.has(source.src)) {
          videos.push({
            src: source.src,
            type: source.type || 'video/mp4',
            duration: video.duration || 0,
            poster: video.poster
          });
          capturedVideos.add(source.src);
        }
      });
    });
    
    // Deduplicate
    const uniqueVideos = Array.from(new Map(videos.map(v => [v.src, v])).values());
    sendResponse({ videos: uniqueVideos });
  }
  
  if (request.action === 'GET_CAPTURED_VIDEOS') {
    const videos = Array.from(capturedVideos);
    sendResponse({ videos });
  }
});

console.log('Content script ready');
