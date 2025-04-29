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
    const newsId = getQueryParam("id");
    if (!newsId) {
        document.getElementById("news-detail").innerText = "News not found.";
        document.title = "News not found";
        return;
    }

    fetch(`https://vikayblog.onrender.com/api/news/edited/${newsId}`)
        .then(res => {
            if (!res.ok) throw new Error("News not found");
            return res.json();
        })
        .then(news => {
            document.title = news.title;
            document.getElementById("news-detail").innerHTML = `
                <h1 id="news-title">${news.title}</h1>
                <img src="${news.thumbnail}" id="news-thumbnail" width="400">
                <small>Published ${news.time_ago}</small>
                <p id="news-text">${news.original_text}</p>
                <a href="index.html">Back to News</a>
            `;
        })
        .catch(err => {
            console.error("Error fetching or displaying news: ", err);
            document.getElementById("news-detail").innerText = "Error loading news.";
        });
}
window.onload = loadNewsDetails;