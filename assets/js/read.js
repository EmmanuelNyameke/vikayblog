const API_BASE = "http://127.0.0.1:9000/api";
const urlParams = new URLSearchParams(window.location.search);
const newsId = urlParams.get("id");
fetch(`${API_BASE}/news/${newsId}`).then(res => res.json()).then(news => {
    document.getElementById("news-title").textContent = news.title;
    document.getElementById("news-thumbnail").src = news.thumbnail;
    document.getElementById("news-text").textContent = news.original_text;
    document.title = news.title;
}).catch(() => {
    document.title = "Not Found";
    document.getElementById("news-content").innerHTML = "<p>Failed to load article. </p>";
})