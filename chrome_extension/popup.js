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
          <p>No videos found.</p>
          <p class="sub-text">Make sure videos are loading on the page, then try again.</p>
        </div>
      `;
      downloadAllBtn.disabled = true;
      return;
    }

    downloadAllBtn.disabled = false;

    videos.forEach((video, index) => {
      const div = document.createElement('div');
      div.className = 'video-item';
      
      let filename = 'video';
      try {
        const urlObj = new URL(video.src);
        const path = urlObj.pathname;
        const match = path.match(/([^\/]+?)(\.[^.]*)?$/);
        if (match && match[1]) {
          filename = match[1].substring(0, 30);
        }
      } catch (e) {}

      const urlPreview = video.src.substring(0, 40) + (video.src.length > 40 ? '...' : '');

      div.innerHTML = `
        <div class="checkbox-wrapper">
          <input type="checkbox" id="vid-${index}" checked>
        </div>
        <div class="video-info">
          <div class="video-title">${filename}</div>
          <div class="video-url">${urlPreview}</div>
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

    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        downloadVideo(detectedVideos[index], index);
      });
    });
  }

  function downloadVideo(video, index) {
    const progressBar = document.getElementById(`progress-${index}`);
    const progressFill = progressBar.querySelector('.progress-fill');
    
    progressBar.style.display = 'block';
    progressFill.style.width = '10%';
    progressFill.style.backgroundColor = '#3b82f6';

    let filename = 'video_' + Date.now() + '.mp4';
    try {
      const urlObj = new URL(video.src);
      const path = urlObj.pathname;
      const match = path.match(/([^\/]+?)(\.[^.]*)?$/);
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
        console.error('Download error:', chrome.runtime.lastError);
        progressFill.style.backgroundColor = '#ef4444';
        progressFill.style.width = '100%';
        return;
      }

      if (response && response.success) {
        let width = 10;
        const interval = setInterval(() => {
          width = Math.min(width + Math.random() * 40, 95);
          progressFill.style.width = width + '%';
          
          if (width >= 95) {
            clearInterval(interval);
            setTimeout(() => {
              progressFill.style.width = '100%';
              progressFill.style.backgroundColor = '#22c55e';
            }, 200);
          }
        }, 300);
      } else {
        progressFill.style.backgroundColor = '#ef4444';
        progressFill.style.width = '100%';
      }
    });
  }

  fetchBtn.addEventListener('click', async () => {
    fetchBtn.disabled = true;
    fetchBtn.style.opacity = '0.6';
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        videoList.innerHTML = '<div class="empty-state"><p>Error: No active tab</p></div>';
        fetchBtn.disabled = false;
        fetchBtn.style.opacity = '1';
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'SCAN_VIDEOS' }, (response) => {
        fetchBtn.disabled = false;
        fetchBtn.style.opacity = '1';
        
        if (chrome.runtime.lastError) {
          console.error('Message error:', chrome.runtime.lastError.message);
          videoList.innerHTML = `
            <div class="empty-state">
              <p>Error: ${chrome.runtime.lastError.message}</p>
              <p class="sub-text">Try refreshing the page first.</p>
            </div>
          `;
          return;
        }

        if (response && Array.isArray(response.videos)) {
          renderVideos(response.videos);
        } else {
          renderVideos([]);
        }
      });
    } catch (e) {
      console.error('Error:', e);
      fetchBtn.disabled = false;
      fetchBtn.style.opacity = '1';
      videoList.innerHTML = `<div class="empty-state"><p>Error: ${e.message}</p></div>`;
    }
  });

  downloadAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    let delay = 0;
    
    checkboxes.forEach(cb => {
      const index = parseInt(cb.id.split('-')[1]);
      if (!isNaN(index) && detectedVideos[index]) {
        setTimeout(() => {
          downloadVideo(detectedVideos[index], index);
        }, delay);
        delay += 500;
      }
    });
  });

  // Auto-fetch on open
  setTimeout(() => {
    fetchBtn.click();
  }, 300);
});
