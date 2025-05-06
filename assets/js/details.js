let page = 0;
const limit = 20;
let total = 0;


function getQueryParam(param){
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Helper function to calculate time ago
function getTimeAgo(created_at) {
    const now = new Date();
    const postDate = new Date(created_at);
    const diffMs = now - postDate;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
    const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    return `${years} year${years > 1 ? 's' : ''} ago`;
}


function loadNewsDetails(){
    const slug = getQueryParam("slug");
    if (!slug) {
        document.getElementById("news-detail").innerText = "News not found.";
        document.title = "News not found";
        return;
    }

    fetch(`https://vikayblog.onrender.com/api/news/edited/slug/${slug}`)
        .then(res => {
            if (!res.ok) throw new Error("News not found");
            return res.json();
        })
        .then(news => {
          document.title = news.title;
          document.getElementById("news-detail").innerHTML = `
                <h1 id="news-title">${news.title}</h1>
                <img src="${news.thumbnail}" id="news-thumbnail" width="400">
                <small><em>Published ${news.time_ago}</em></small>
                <p id="news-text">${news.original_text}<br><br>
                <strong>Source: ${news.channel}</strong></p>
                <div class="share-buttons">
                <button id="share-button" title="Share with device">
                <i class="bi bi-share-fill"></i> Share
                </button>
                <a href="https://wa.me/?text=${encodeURIComponent(news.title)}%20${encodeURIComponent(window.location.href)}" target="_blank" class="social-btn whatsapp" title="Share on WhatsApp">
                <i class="bi bi-whatsapp"></i>
                </a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" class="social-btn facebook" title="Share on Facebook">
                <i class="bi bi-facebook"></i>
                </a>
                <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(news.title)}&url=${encodeURIComponent(window.location.href)}" target="_blank" class="social-btn twitter" title="Share on X">
                <i class="bi bi-twitter-x"></i>
                </a>
                <button id="copy-link-btn" class="social-btn copy" title="Copy link">
                <i class="bi bi-link-45deg"></i>
                </button>
                </div>

                <p id="share-status"></p>
                <a href="index.html">Back to News</a>
            `;
            // Update meta tags for SEO & sharing
          document.getElementById("og-title").content = news.title;
          document.getElementById("og-description").content = news.original_text.slice(0, 50);
          document.getElementById("og-image").content = news.thumbnail;
          document.getElementById("og-url").content = window.location.href;

          document.getElementById("twitter-title").content = news.title;
          document.getElementById("twitter-description").content = news.original_text.slice(0, 50);
          document.getElementById("twitter-image").content = news.thumbnail;

          // Update favicon to news thumbnail
          document.getElementById("dynamic-favicon").href = news.thumbnail;

          // Canonical URL
          // Set canonical URL
          const canonical = document.getElementById("canonical-link");
          if (canonical) {
              canonical.href = window.location.href.split("#")[0]; // Strip fragment if present
            }

        })
        .catch(err => {
            console.error("Error fetching or displaying news: ", err);
            document.getElementById("news-detail").innerText = "Error loading news.";
        });
}


document.addEventListener("click", function (e) {
    if (e.target.closest("#share-button")) {
      const shareData = {
        title: document.getElementById("news-title").innerText,
        text: news.original_text.substring(0, 60),
        url: window.location.href
      };
  
      if (navigator.share) {
        navigator.share(shareData)
          .then(() => document.getElementById("share-status").innerText = "Thanks for sharing!")
          .catch((err) => console.error("Sharing failed:", err));
      } else {
        document.getElementById("share-status").innerText = "Web Share not supported on this device.";
      }
    }
  
    if (e.target.closest("#copy-link-btn")) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        document.getElementById("share-status").innerText = "Link copied to clipboard!";
      }).catch(() => {
        document.getElementById("share-status").innerText = "Failed to copy link.";
        document.getElementById("share-status").style.color = "red";
      });
    }
  });
  
  window.onload = loadNewsDetails;