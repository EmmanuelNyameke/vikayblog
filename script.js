// Configuration
const API_BASE_URL = 'https://news-management-system.onrender.com';
const PAGE_SIZE = 9;
let currentPage = 0;
let isLoading = false;
let hasMore = true;
let currentSearch = '';
let likedArticles = new Set();

// DOM Elements
const articlesGrid = document.getElementById('articlesGrid');
const loadingElement = document.getElementById('loading');
const emptyState = document.getElementById('emptyState');
const loadMoreContainer = document.getElementById('loadMoreContainer');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const totalArticles = document.getElementById('totalArticles');
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    setupEventListeners();
    loadLikedArticles();
});

// Event Listeners
function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    loadMoreBtn.addEventListener('click', loadMoreArticles);
}

// Search Handler
function handleSearch() {
    const searchTerm = searchInput.value.trim();
    if (searchTerm !== currentSearch) {
        currentSearch = searchTerm;
        currentPage = 0;
        articlesGrid.innerHTML = '';
        loadArticles();
    }
}

// Load Articles
async function loadArticles() {
    if (isLoading) return;
    
    isLoading = true;
    showLoading();
    hideEmptyState();
    
    try {
        const articles = await fetchArticles();
        
        if (currentPage === 0) {
            articlesGrid.innerHTML = '';
            updateTotalArticles(articles.length);
        }
        
        if (articles.length > 0) {
            renderArticles(articles);
            showArticlesGrid();
            checkLoadMore(articles.length);
        } else if (currentPage === 0) {
            showEmptyState();
        }
        
        currentPage++;
    } catch (error) {
        console.error('Error loading articles:', error);
        showToast('Error loading articles. Please try again.', 'error');
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Load More Articles
async function loadMoreArticles() {
    loadMoreBtn.disabled = true;
    loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    await loadArticles();
    
    loadMoreBtn.disabled = false;
    loadMoreBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Load More Articles';
}

// Fetch Articles from API
async function fetchArticles() {
    const params = new URLSearchParams({
        page_size: PAGE_SIZE,
        page_token: currentPage > 0 ? currentPage.toString() : ''
    });
    
    if (currentSearch) {
        params.append('q', currentSearch);
    }
    
    const response = await fetch(`${API_BASE_URL}/articles/?${params}`);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

// Render Articles
function renderArticles(articles) {
    articles.forEach(article => {
        const articleElement = createArticleElement(article);
        articlesGrid.appendChild(articleElement);
    });
}

// Create Article Element
function createArticleElement(article) {
    const articleDiv = document.createElement('div');
    articleDiv.className = 'article-card clickable-card';
    articleDiv.dataset.id = article.id;
    
    const isLiked = likedArticles.has(article.id);
    
    const thumbnail = article.thumbnail_url 
        ? `<img src="${article.thumbnail_url}" alt="${article.title}" onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"%234CAF50\" opacity=\"0.1\"/><text x=\"50\" y=\"50\" font-size=\"30\" text-anchor=\"middle\" dy=\".3em\" fill=\"%234CAF50\">📰</text></svg>'">`
        : `<div class="placeholder"><i class="fas fa-newspaper"></i></div>`;
    
    const date = formatDate(article.created_at);
    
    articleDiv.innerHTML = `
        <div class="article-thumbnail">
            ${thumbnail}
        </div>
        <div class="article-content">
            <h3 class="article-title">${escapeHtml(article.title)}</h3>
            <p class="article-excerpt">${escapeHtml(article.content.substring(0, 150))}...</p>
            
            <div class="article-meta">
                <span class="article-date">
                    <i class="far fa-calendar"></i> ${date}
                </span>
                <div class="article-stats">
                    <span class="stat">
                        <i class="fas fa-heart"></i> ${article.likes_count || 0}
                    </span>
                    <span class="stat">
                        <i class="fas fa-comment"></i> ${article.comments_count || 0}
                    </span>
                    <span class="stat">
                        <i class="fas fa-share"></i> ${article.shares_count || 0}
                    </span>
                </div>
            </div>
            
            <div class="article-actions">
                <button class="action-btn like-btn ${isLiked ? 'active' : ''}" onclick="event.stopPropagation(); handleLike('${article.id}', this)">
                    <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                    ${isLiked ? 'Liked' : 'Like'}
                </button>
                <button class="action-btn comment-btn" onclick="event.stopPropagation(); viewArticle('${article.id}')">
                    <i class="fas fa-comment"></i> Comment
                </button>
                <button class="action-btn share-btn" onclick="event.stopPropagation(); shareArticle('${article.id}')">
                    <i class="fas fa-share"></i> Share
                </button>
            </div>
        </div>
    `;
    
    // Make entire card clickable
    articleDiv.addEventListener('click', function(e) {
        // Don't trigger if clicking on buttons
        if (!e.target.closest('.action-btn')) {
            viewArticle(article.id);
        }
    });
    
    return articleDiv;
}

// Like Handler
async function handleLike(articleId, button) {
    try {
        const response = await fetch(`${API_BASE_URL}/articles/${articleId}/like`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to like article');
        }
        
        const data = await response.json();
        const isLiked = data.liked;
        
        // Update UI
        const icon = button.querySelector('i');
        const heartIcon = button.querySelector('.fa-heart');
        
        if (isLiked) {
            button.classList.add('active');
            button.innerHTML = '<i class="fas fa-heart"></i> Liked';
            likedArticles.add(articleId);
            
            // Update count
            const articleCard = button.closest('.article-card');
            const likeCount = articleCard.querySelector('.fa-heart').closest('.stat');
            const currentCount = parseInt(likeCount.textContent.match(/\d+/)[0]);
            likeCount.innerHTML = `<i class="fas fa-heart"></i> ${currentCount + 1}`;
            
            showToast('Article liked!', 'success');
        } else {
            button.classList.remove('active');
            button.innerHTML = '<i class="far fa-heart"></i> Like';
            likedArticles.delete(articleId);
            
            // Update count
            const articleCard = button.closest('.article-card');
            const likeCount = articleCard.querySelector('.fa-heart').closest('.stat');
            const currentCount = parseInt(likeCount.textContent.match(/\d+/)[0]);
            likeCount.innerHTML = `<i class="fas fa-heart"></i> ${Math.max(0, currentCount - 1)}`;
            
            showToast('Article unliked', 'info');
        }
        
        saveLikedArticles();
    } catch (error) {
        console.error('Error liking article:', error);
        showToast('Failed to like article. Please try again.', 'error');
    }
}

// Share Handler
async function shareArticle(articleId) {
    try {
        const response = await fetch(`${API_BASE_URL}/articles/${articleId}/share`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to share article');
        }
        
        const data = await response.json();
        const shareUrl = data.share_url || `https://vikayblog.com/articles/${articleId}`;
        
        // Use Web Share API if available
        if (navigator.share) {
            await navigator.share({
                title: 'Check out this article',
                url: shareUrl
            });
        } else {
            // Fallback to clipboard
            await navigator.clipboard.writeText(shareUrl);
            showToast('Link copied to clipboard!', 'success');
        }
        
        // Update share count in UI
        const articleCard = document.querySelector(`.article-card[data-id="${articleId}"]`);
        if (articleCard) {
            const shareCount = articleCard.querySelector('.fa-share').closest('.stat');
            const currentCount = parseInt(shareCount.textContent.match(/\d+/)[0]);
            shareCount.innerHTML = `<i class="fas fa-share"></i> ${currentCount + 1}`;
        }
    } catch (error) {
        console.error('Error sharing article:', error);
        showToast('Failed to share article. Please try again.', 'error');
    }
}

// View Article
function viewArticle(articleId) {
    window.location.href = `article-detail.html?id=${articleId}`;
}

// Update Total Articles
function updateTotalArticles(count) {
    totalArticles.textContent = count;
}

// Check if more articles can be loaded
function checkLoadMore(loadedCount) {
    hasMore = loadedCount === PAGE_SIZE;
    
    if (hasMore) {
        loadMoreContainer.style.display = 'block';
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load Liked Articles from Local Storage
function loadLikedArticles() {
    const saved = localStorage.getItem('likedArticles');
    if (saved) {
        likedArticles = new Set(JSON.parse(saved));
    }
}

// Save Liked Articles to Local Storage
function saveLikedArticles() {
    localStorage.setItem('likedArticles', JSON.stringify([...likedArticles]));
}

// Show/Hide UI Elements
function showLoading() {
    loadingElement.style.display = 'block';
}

function hideLoading() {
    loadingElement.style.display = 'none';
}

function showArticlesGrid() {
    articlesGrid.style.display = 'grid';
}

function hideArticlesGrid() {
    articlesGrid.style.display = 'none';
}

function showEmptyState() {
    emptyState.style.display = 'block';
}

function hideEmptyState() {
    emptyState.style.display = 'none';
}

// Toast Notification
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = 'toast';
    
    switch(type) {
        case 'success':
            toast.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            toast.style.backgroundColor = '#F44336';
            break;
        case 'info':
            toast.style.backgroundColor = '#2196F3';
            break;
        default:
            toast.style.backgroundColor = '#4CAF50';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}