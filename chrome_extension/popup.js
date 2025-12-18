document.addEventListener('DOMContentLoaded', () => {
  const fetchBtn = document.getElementById('fetch-btn');
  const downloadAllBtn = document.getElementById('download-all-btn');
  const videoList = document.getElementById('video-list');
  const videoCount = document.getElementById('video-count');

  let detectedVideos = [];

  function renderVideos(videos) {
    videoList.innerHTML = '';
    detectedVideos = videos;
    videoCount.textContent = `${videos.length} found`;

    if (videos.length === 0) {
      videoList.innerHTML = `
        <div class="empty-state">
          <p>No videos found on this page.</p>
          <p class="sub-text">Try scrolling or wait for page to load completely.</p>
        </div>
      `;
      downloadAllBtn.disabled = true;
      return;
    }

    downloadAllBtn.disabled = false;

    videos.forEach((video, index) => {
      const div = document.createElement('div');
      div.className = 'video-item';
      
      // Extract filename from URL
      let filename = 'video';
      try {
        const urlObj = new URL(video.src);
        const path = urlObj.pathname;
        const match = path.match(/([^\/]+)(\.[^.]+)?$/);
        if (match && match[1]) {
          filename = match[1].replace(/[^a-z0-9_-]/gi, '_');
        }
      } catch (e) {}

      div.innerHTML = `
        <div class="checkbox-wrapper">
          <input type="checkbox" id="vid-${index}" checked>
        </div>
        <div class="video-info">
          <div class="video-title">${filename || 'Video ' + (index + 1)}</div>
          <div class="video-meta">
            <span class="video-url">${video.src.substring(0, 50)}...</span>
          </div>
          <div class="progress-bar" id="progress-${index}">
            <div class="progress-fill"></div>
          </div>
        </div>
        <button class="download-btn" data-index="${index}" title="Download this video">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        </button>
      `;
      videoList.appendChild(div);
    });

    // Add event listeners
    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = e.currentTarget.getAttribute('data-index');
        downloadVideo(detectedVideos[index], index);
      });
    });
  }

  function downloadVideo(video, index) {
    const progressBar = document.getElementById(`progress-${index}`);
    const progressFill = progressBar.querySelector('.progress-fill');
    
    progressBar.style.display = 'block';
    progressFill.style.width = '10%';

    // Generate filename
    let filename = 'video_' + Date.now() + '.mp4';
    try {
      const urlObj = new URL(video.src);
      const path = urlObj.pathname;
      const match = path.match(/([^\/]+)(\.[^.]+)?$/);
      if (match && match[1]) {
        filename = match[1];
      }
    } catch (e) {}

    chrome.runtime.sendMessage({
      action: 'DOWNLOAD_VIDEO',
      url: video.src,
      filename: filename
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        progressFill.style.backgroundColor = '#ef4444';
        progressFill.style.width = '100%';
        return;
      }

      if (response && response.success) {
        // Simulate progress
        let width = 10;
        const interval = setInterval(() => {
          width += Math.random() * 30;
          if (width > 95) width = 95;
          progressFill.style.width = width + '%';
          
          if (width >= 95) clearInterval(interval);
        }, 300);

        // Mark as complete after timeout
        setTimeout(() => {
          progressFill.style.width = '100%';
          progressFill.style.backgroundColor = '#22c55e';
        }, 3000);
      } else {
        progressFill.style.backgroundColor = '#ef4444';
        progressFill.style.width = '100%';
      }
    });
  }

  // Fetch videos action
  fetchBtn.addEventListener('click', async () => {
    fetchBtn.disabled = true;
    fetchBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 8"/><path d="M3 3v5h5"/></svg>
      Scanning...
    `;
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { action: 'SCAN_VIDEOS' }, (response) => {
          fetchBtn.disabled = false;
          fetchBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            Fetch Videos
          `;
          
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            videoList.innerHTML = `<div class="empty-state"><p>Error: ${chrome.runtime.lastError.message}</p></div>`;
            return;
          }
          
          if (response && response.videos) {
            renderVideos(response.videos);
          } else {
            renderVideos([]);
          }
        });
      }
    } catch (e) {
      console.error(e);
      fetchBtn.disabled = false;
      fetchBtn.innerHTML = `Fetch Videos`;
      videoList.innerHTML = `<div class="empty-state"><p>Error: ${e.message}</p></div>`;
    }
  });

  // Download all
  downloadAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    let count = 0;
    
    checkboxes.forEach(cb => {
      const index = parseInt(cb.id.split('-')[1]);
      if (!isNaN(index) && detectedVideos[index]) {
        setTimeout(() => {
          downloadVideo(detectedVideos[index], index);
        }, count * 500); // Stagger downloads
        count++;
      }
    });
  });

  // Try to fetch videos on popup open
  setTimeout(() => {
    fetchBtn.click();
  }, 500);
});
