// Helper to extract videos
function findVideos() {
  const videos = [];
  const videoElements = document.querySelectorAll('video');
  
  videoElements.forEach((vid) => {
    let src = vid.src;
    
    // Check for source elements if src is empty
    if (!src) {
      const source = vid.querySelector('source');
      if (source) src = source.src;
    }

    // Resolve relative URLs
    if (src) {
      try {
        src = new URL(src, window.location.href).href;
      } catch (e) {
        // invalid url, ignore
      }
    }

    if (src && (src.startsWith('http') || src.startsWith('blob:'))) {
      // Get poster image
      let poster = vid.poster;
      if (!poster) {
        // Try to find a sibling img that might be the poster (common in social media apps)
        // Heuristic: finding the largest image in the container or nearby
        const parent = vid.parentElement;
        if (parent) {
          const img = parent.querySelector('img');
          if (img) poster = img.src;
        }
      }
      
      if (poster) {
         try {
          poster = new URL(poster, window.location.href).href;
        } catch (e) {}
      }

      videos.push({
        src: src,
        type: 'video/mp4', // Assumption
        duration: vid.duration,
        poster: poster
      });
    }
  });

  // Unique by src
  const uniqueVideos = Array.from(new Map(videos.map(item => [item.src, item])).values());
  return uniqueVideos;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SCAN_VIDEOS") {
    const videos = findVideos();
    console.log("Videos found:", videos);
    sendResponse({ videos: videos });
  }
  return true; // Keep channel open
});

// Auto-scan on load to log
console.log("Social Video Downloader Content Script Loaded");