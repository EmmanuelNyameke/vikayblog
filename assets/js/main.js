function fetchFromPythonOrNode(apiPath, callback) {
    fetch(`http://127.0.0.1:9000${apiPath}`)
        .then(res => {
            if (!res.ok) throw new Error("Python backend error");
            return res.json();
        })
        .then(data => callback(data, "python"))
        .catch(err => {
            console.warn("Python backend not available, falling back to Node backend:", err.message);
            fetch(`https://vikayblog.onrender.com${apiPath}`)
                .then(res => res.json())
                .then(data => callback(data, "node"))
                .catch(err => console.error("Failed to fetch from both backends:", err));
        });
}


let carouselIndex = 0;
function fetchCarouselNews() {
    fetchFromPythonOrNode("/api/news/edited?limit=5", (data, source) => {
        const carousel = document.getElementById("carousel");
        carousel.innerHTML = "";
        (data.results || data).forEach(news => {
            const item = document.createElement("div");
            item.className = "carousel-item";
            item.innerHTML = `
                <a href="details.html?id=${news.id}">
                    <img src="${news.thumbnail}" alt="${news.title}">
                    <h3>${news.title}</h3>
                </a>
            `;
            carousel.appendChild(item);
        });
    });
}

function showSlide(index){
    const carousel = document.getElementById("carousel");
    const totalSlides = carousel.children.length;
    if(index < 0) carouselIndex = totalSlides - 1;
    else if(index >= totalSlides) carouselIndex = 0;
    else carouselIndex = index;
    const offset = -carouselIndex * 100;
    carousel.style.transform = `translateX(${offset}%)`;
}

function nextSlide(){
    showSlide(carouselIndex + 1);
}

function prevSlide(){
    showSlide(carouselIndex - 1);
}

const searchInput = document.getElementById("search-input");
const searchForm = document.getElementById("search-form");
const clearBtn = document.getElementById("clear-search");
const historyList = document.getElementById("search-history");

searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    clearBtn.style.display = query.length > 0 ? "block" : "none";
    showSearchHistory(query);

    if (query.length >= 2){
        searchNews(query);
    }
    else if(query === ""){
        fetchNews();
        historyList.style.display = "none";
    }
});

clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearBtn.style.display = "none";
    fetchNews();
    historyList.style.display = "none";
});

searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if(query !== ""){
        saveSearchToHistory(query);
        searchNews(query);
        historyList.style.display = "none";
    }
    else {
        fetchNews();
    }
});

historyList.addEventListener("click", (e) => {
    if(e.target.tagName === "LI"){
        const keyword = e.target.innerText;
        searchInput.value = keyword;
        saveSearchToHistory(keyword);
        searchNews(keyword);
        historyList.style.display = "none";
    }
});


function searchNews(query) {
    fetch(`https://vikayblog.onrender.com/api/news/edited`)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById("news-list");
            container.innerHTML = "";

            const matches = data.results.filter(news =>
                news.title.toLowerCase().includes(query.toLowerCase()) ||
                (news.original_text && news.original_text.toLowerCase().includes(query.toLowerCase()))
            );

            if (matches.length === 0) {
                container.innerHTML = "<p>No results found.</p>";
                document.getElementById("page-info").innerText = "";
                return;
            }

            // Move best match (first title match) to the top
            const bestMatchIndex = matches.findIndex(news =>
                news.title.toLowerCase().includes(query.toLowerCase())
            );
            if (bestMatchIndex > -1) {
                const bestMatch = matches.splice(bestMatchIndex, 1)[0];
                matches.unshift(bestMatch);
            }

            matches.forEach(news => {
                const item = document.createElement("div");
                item.className = "news-item";

                const titleWithHighlight = news.title.replace(
                    new RegExp(`(${query})`, "gi"),
                    "<i><b>$1</b></i>"
                );

                item.innerHTML = `
                    <a href="details.html?id=${news.id}">
                        <img src="${news.thumbnail}" width="100%" alt="${news.title}">
                        <h3>${titleWithHighlight}</h3>
                    </a>
                `;
                container.appendChild(item);
            });

            document.getElementById("page-info").innerText = `Search results for "${query}"`;
        });
}


function saveSearchToHistory(keyword){
    let history = JSON.parse(localStorage.getItem("searchHistory")) || [];
    history = history.filter(item => item.toLowerCase() !== keyword.toLowerCase());
    history.unshift(keyword);
    if(history.length > 10)
        history.pop();

    localStorage.setItem("searchHistory", JSON.stringify(history));
}

function showSearchHistory(query){
    const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
    const filtered = history.filter(h => h.toLowerCase().includes(query.toLowerCase()));
    historyList.innerHTML = "";
    if(filtered.length > 0){
        filtered.forEach(item => {
            const li = document.createElement("li");
            li.innerText = item;

            historyList.appendChild(li);
        });
        historyList.style.display = "block";
    }
    else {
        historyList.style.display = "none";
    }
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


let page = 0;
const limit = 20;
let total = 0;

function fetchNews() {
    fetchFromPythonOrNode(`/api/news/edited?skip=${page * limit}&limit=${limit}`, (data, source) => {
        total = data.total || data.length || 0;
        const container = document.getElementById("news-list");
        container.innerHTML = "";

        (data.results || data).forEach(news => {
            const timeAgo = getTimeAgo(news.created_at);
            const item = document.createElement("div");
            item.className = "news-item";
            item.innerHTML = `
                <a href="details.html?id=${news.id}">
                    <img src="${news.thumbnail}" width="100%" style="cursor: pointer;">
                    <h3>${news.title}</h3>
                    <p>${timeAgo}</p>
                </a>
                <hr>
            `;
            container.appendChild(item);
        });

        const totalPages = Math.ceil(total / limit);
        document.getElementById("page-info").innerText = `Page: ${page + 1} of ${totalPages}`;
    });
}

function syncNewsToNodeBackend(){
    fetch(`http://127.0.0.1:9000/api/news/edited?skip=${page * limit}&limit=${limit}`).then(res => res.json()).then(data => {
        data.results.forEach(news => {
            fetch("https://vikayblog.onrender.com/api/news/store", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(news)
            }).then(res => {
                if(!res.ok && res.status !== 409){
                    console.error("Failed to store news:", news.title);
                }
            }).catch(err => console.error("Error posting to node backend:", err));
        });
    });
}


function nextPage(){
    if((page + 1) * limit < total){
        page++;
        fetchNews();
    }
}

function prevPage(){
    if(page > 0){
        page--;
        fetchNews();
    }
}

window.onload = () => {
    fetchCarouselNews();
    fetchNews();
    syncNewsToNodeBackend();
    setInterval(() => nextSlide(), 5000);
};