// Token validation: prevent access if not logged in
const token = localStorage.getItem("token");
if(!token){
  window.location.href = "../../auth/login.html" // Redirect if not logged in
}
else{
  // Validate token by calling protected backend endpoint
  fetch("http://127.0.0.1:9000/api/validate_token", {
    headers: { "Authorization": `Bearer ${token}`}
  }).then(res => {
    if(!res.ok){
      window.location.href = "../../auth/login.html";
    }
    else{
      fetchNews();
    }
  }).catch(() => {
    window.location.href = "../../auth/login.html";
  });
}

const API_BASE = "http://127.0.0.1:9000/api";
  let page = 0;
  const limit = 20;
  let total = 0;

  function fetchNews() {
    const skip = page * limit;
    fetch(`${API_BASE}/news?skip=${skip}&limit=${limit}`)
      .then(res => res.json())
      .then(data => {
        total = data.total;
        renderNews(data.results);
        updatePageInfo();
      });
  }

  function renderNews(newsList) {
    const container = document.getElementById("news-list");
    container.innerHTML = "";
  
    newsList.forEach(news => {
      const newsCard = document.createElement("div");
      newsCard.className = "news-item";
  
      newsCard.innerHTML = `
        <a href="read.html?id=${news.id}">
          <img src="${news.thumbnail}" alt="Thumbnail" width="50%">
          <h3>${news.title}</h3>
        </a>
        <button class="edit-btn"
                data-id="${news.id}"
                data-title="${encodeURIComponent(news.title)}"
                data-text="${encodeURIComponent(news.original_text)}"
                data-thumbnail="${encodeURIComponent(news.thumbnail || '')}">Edit</button>
        <button onclick="deleteNews(${news.id})">Delete</button>
      `;
      container.appendChild(newsCard);
    });
    const totalPages = Math.ceil(total / limit);
    const count = document.getElementById("page-info");
    count.innerText = `Page: ${page + 1} of ${totalPages}`;
  
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", function() {
        const id = this.getAttribute("data-id");
        const title = decodeURIComponent(this.getAttribute("data-title"));
        const text = decodeURIComponent(this.getAttribute("data-text"));
        const thumbnail = decodeURIComponent(this.getAttribute("data-thumbnail"));
        editNews(id, title, text, thumbnail);
      });
    });
  }

  function updatePageInfo() {
    const totalPages = Math.ceil(total / limit);
    document.getElementById("page-info").textContent = `Page ${page + 1} of ${totalPages}`;
  }

  function nextPage() {
    if ((page + 1) * limit < total) {
      page++;
      fetchNews();
    }
  }

  function prevPage() {
    if (page > 0) {
      page--;
      fetchNews();
    }
  }

  function editNews(id, title, text, thumbnail) {
    document.getElementById("editThumbnail").value = thumbnail || "";
    document.getElementById("editId").value = id;
    document.getElementById("editTitle").value = title;
    document.getElementById("editText").value = text;
    document.getElementById("editModal").style.display = "block";
  }

  function deleteNews(id) {
    if (confirm("Are you sure you want to delete this news?")) {
      fetch(`${API_BASE}/news/${id}`, {
        method: "DELETE"
      })
      .then(res => {
        if (res.ok) {
          fetchNews();
        } else {
          alert("Delete failed.");
        }
      });
    }
  }

  document.getElementById("editForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const id = document.getElementById("editId").value;
    const title = document.getElementById("editTitle").value;
    const text = document.getElementById("editText").value;
    const thumbnail = document.getElementById("editThumbnail").value;

    fetch(`${API_BASE}/news/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, original_text: text, thumbnail })
    })
    .then(res => {
      if (res.ok) {
        document.getElementById("editModal").style.display = "none";
        fetchNews();
      } else {
        alert("Update failed.");
      }
    });
  });

  document.getElementById("closeModal").onclick = function() {
    document.getElementById("editModal").style.display = "none";
  };

  function logout(){
    localStorage.clear();
    window.location.href = "../../auth/login.html";
  }