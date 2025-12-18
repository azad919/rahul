document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Popup] Initialized');

  const fetchBtn = document.getElementById('fetch-btn');
  const downloadAllBtn = document.getElementById('download-all-btn');
  const videoList = document.getElementById('video-list');
  const videoCount = document.getElementById('video-count');

  let videos = [];

  function renderVideos(videoList_) {
    videoList.innerHTML = '';
    videos = videoList_;
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
      const item = document.createElement('div');
      item.className = 'video-item';

      let filename = 'video';
      try {
        const url = new URL(video.src);
        const parts = url.pathname.split('/');
        filename = parts[parts.length - 1] || 'video';
        if (filename.length > 30) filename = filename.substring(0, 30) + '...';
      } catch (e) {
        filename = `video_${index + 1}`;
      }

      const urlPreview = video.src.substring(0, 50) + (video.src.length > 50 ? '...' : '');

      item.innerHTML = `
        <div class="checkbox-wrapper">
          <input type="checkbox" class="video-check" id="check-${index}" checked>
        </div>
        <div class="video-info">
          <div class="video-title">${filename}</div>
          <div class="video-url">${urlPreview}</div>
          <div class="progress-bar" id="progress-${index}">
            <div class="progress-fill"></div>
          </div>
        </div>
        <button class="download-btn" data-idx="${index}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        </button>
      `;

      videoList.appendChild(item);

      item.querySelector('.download-btn').addEventListener('click', () => {
        downloadSingle(video, index);
      });
    });
  }

  function downloadSingle(video, index) {
    const progressBar = document.getElementById(`progress-${index}`);
    const progressFill = progressBar.querySelector('.progress-fill');

    progressBar.style.display = 'block';
    progressFill.style.width = '5%';
    progressFill.style.backgroundColor = '#3b82f6';

    let filename = 'video_' + Date.now() + '.mp4';
    try {
      const url = new URL(video.src);
      const parts = url.pathname.split('/');
      const name = parts[parts.length - 1];
      if (name && name.length > 0) filename = name;
    } catch (e) {}

    chrome.runtime.sendMessage(
      { action: 'DOWNLOAD', url: video.src, filename },
      (response) => {
        if (chrome.runtime.lastError || !response.success) {
          progressFill.style.backgroundColor = '#ef4444';
          progressFill.style.width = '100%';
          console.error('Download failed');
          return;
        }

        // Animate progress
        let progress = 5;
        const interval = setInterval(() => {
          progress = Math.min(progress + Math.random() * 40, 95);
          progressFill.style.width = progress + '%';

          if (progress >= 95) {
            clearInterval(interval);
            setTimeout(() => {
              progressFill.style.width = '100%';
              progressFill.style.backgroundColor = '#22c55e';
            }, 100);
          }
        }, 200);
      }
    );
  }

  async function scanVideos() {
    console.log('[Popup] Scanning for videos...');
    fetchBtn.disabled = true;
    fetchBtn.style.opacity = '0.6';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('No active tab');

      console.log('[Popup] Sending GET_VIDEOS to tab:', tab.id);

      chrome.tabs.sendMessage(tab.id, { action: 'GET_VIDEOS' }, (response) => {
        console.log('[Popup] Response:', response);
        fetchBtn.disabled = false;
        fetchBtn.style.opacity = '1';

        if (chrome.runtime.lastError) {
          console.error('[Popup] Error:', chrome.runtime.lastError.message);
          videoList.innerHTML = `
            <div class="empty-state">
              <p>Connection Error</p>
              <p class="sub-text">${chrome.runtime.lastError.message}</p>
            </div>
          `;
          return;
        }

        if (response && response.success) {
          renderVideos(response.videos || []);
        } else {
          renderVideos([]);
        }
      });
    } catch (error) {
      console.error('[Popup] Error:', error);
      fetchBtn.disabled = false;
      fetchBtn.style.opacity = '1';
      videoList.innerHTML = `<div class="empty-state"><p>Error: ${error.message}</p></div>`;
    }
  }

  fetchBtn.addEventListener('click', scanVideos);

  downloadAllBtn.addEventListener('click', () => {
    const checked = document.querySelectorAll('.video-check:checked');
    let delay = 0;

    checked.forEach((check) => {
      const idx = parseInt(check.id.split('-')[1]);
      setTimeout(() => {
        downloadSingle(videos[idx], idx);
      }, delay);
      delay += 500;
    });
  });

  // Auto-scan on popup open
  setTimeout(scanVideos, 200);
});
