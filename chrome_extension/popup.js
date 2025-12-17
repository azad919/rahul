document.addEventListener('DOMContentLoaded', () => {
  const fetchBtn = document.getElementById('fetch-btn');
  const downloadAllBtn = document.getElementById('download-all-btn');
  const videoList = document.getElementById('video-list');
  const videoCount = document.getElementById('video-count');

  let detectedVideos = [];

  // Function to render videos
  function renderVideos(videos) {
    videoList.innerHTML = '';
    detectedVideos = videos;
    videoCount.textContent = `${videos.length} found`;

    if (videos.length === 0) {
      videoList.innerHTML = `
        <div class="empty-state">
          <p>No videos found on this page.</p>
          <p class="sub-text">Try scrolling down to load more content.</p>
        </div>
      `;
      downloadAllBtn.disabled = true;
      return;
    }

    downloadAllBtn.disabled = false;

    videos.forEach((video, index) => {
      const div = document.createElement('div');
      div.className = 'video-item';
      div.innerHTML = `
        <div class="checkbox-wrapper">
          <input type="checkbox" id="vid-${index}" checked>
        </div>
        <img src="${video.poster || 'icons/icon48.png'}" class="video-thumb" onerror="this.src='icons/icon48.png'">
        <div class="video-info">
          <div class="video-title">Video ${index + 1}</div>
          <div class="video-meta">
            <span>${video.duration ? formatDuration(video.duration) : 'Unknown duration'}</span>
            <span>•</span>
            <span>${video.type || 'MP4'}</span>
          </div>
          <div class="progress-bar" id="progress-${index}">
            <div class="progress-fill"></div>
          </div>
        </div>
        <button class="download-btn" data-index="${index}" title="Download">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        </button>
      `;
      videoList.appendChild(div);
    });

    // Add event listeners for individual download buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = e.currentTarget.getAttribute('data-index');
        downloadVideo(detectedVideos[index], index);
      });
    });
  }

  function formatDuration(seconds) {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function downloadVideo(video, index) {
    const progressBar = document.getElementById(`progress-${index}`);
    const progressFill = progressBar.querySelector('.progress-fill');
    
    progressBar.style.display = 'block';
    progressFill.style.width = '10%';

    chrome.downloads.download({
      url: video.src,
      filename: `video_${Date.now()}_${index}.mp4`,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        progressFill.style.backgroundColor = '#ef4444'; // Red for error
        return;
      }
      
      // Simulate progress since we can't easily track real-time download progress of the file content in popup
      // In a real app, we might listen to chrome.downloads.onChanged
      let width = 10;
      const interval = setInterval(() => {
        width += 10;
        if (width >= 100) {
          clearInterval(interval);
          width = 100;
        }
        progressFill.style.width = `${width}%`;
      }, 200);
    });
  }

  // Fetch videos action
  fetchBtn.addEventListener('click', async () => {
    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Scanning...';
    
    // Query active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      // Send message to content script
      try {
        chrome.tabs.sendMessage(tab.id, { action: "SCAN_VIDEOS" }, (response) => {
          fetchBtn.disabled = false;
          fetchBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            Fetch Videos
          `;
          
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            videoList.innerHTML = `<div class="empty-state"><p>Error connecting to page. Try refreshing the page.</p></div>`;
            return;
          }
          
          if (response && response.videos) {
            renderVideos(response.videos);
          } else {
            renderVideos([]);
          }
        });
      } catch (e) {
        console.error(e);
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Fetch Videos';
      }
    }
  });

  // Download all action
  downloadAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    checkboxes.forEach(cb => {
      const index = cb.id.split('-')[1];
      downloadVideo(detectedVideos[index], index);
    });
  });
});