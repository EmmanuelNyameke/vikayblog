// Configuration
const API_BASE_URL = 'https://news-management-system.onrender.com';

// DOM Elements
const articleContent = document.getElementById('articleContent');
const loadingElement = document.getElementById('loading');
const errorState = document.getElementById('errorState');
const toast = document.getElementById('toast');

// Get article ID from URL
const urlParams = new URLSearchParams(window.location.search);
const articleId = urlParams.get('id');
let articleData = null;
let likedArticles = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!articleId) {
        showError();
        return;
    }
    
    loadLikedArticles();
    loadArticle();
    loadComments();
});

// Load Article
async function loadArticle() {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/articles/${articleId}`);
        
        if (!response.ok) {
            throw new Error('Article not found');
        }
        
        articleData = await response.json();

        // Update meta tags for social sharing
        updateMetaTags(articleData);

        renderArticle();
    } catch (error) {
        console.error('Error loading article:', error);
        showError();
    } finally {
        hideLoading();
    }
}

// Render Article
function renderArticle() {
    if (!articleData) return;
    
    const isLiked = likedArticles.has(articleData.id);
    
    const thumbnail = articleData.thumbnail_url 
        ? `<img src="${articleData.thumbnail_url}" alt="${articleData.title}" onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"%234CAF50\" opacity=\"0.1\"/><text x=\"50\" y=\"50\" font-size=\"30\" text-anchor=\"middle\" dy=\".3em\" fill=\"%234CAF50\">📰</text></svg>'">`
        : `<div class="placeholder"><i class="fas fa-newspaper"></i></div>`;
    
    const date = formatDate(articleData.created_at);
    
    articleContent.innerHTML = `
        <div class="article-detail">
            <div class="article-detail-header">
                <div class="article-detail-thumbnail">
                    ${thumbnail}
                </div>
            </div>
            
            <div class="article-detail-content">
                <h1 class="article-detail-title">${escapeHtml(articleData.title)}</h1>
                
                <div class="article-detail-meta">
                    <div class="article-detail-date">
                        <i class="far fa-calendar"></i> Published on ${date}
                    </div>
                    <div class="article-detail-stats">
                        <div class="article-detail-stat">
                            <i class="fas fa-heart"></i> ${articleData.likes_count || 0} Likes
                        </div>
                        <div class="article-detail-stat">
                            <i class="fas fa-comment"></i> ${articleData.comments_count || 0} Comments
                        </div>
                        <div class="article-detail-stat">
                            <i class="fas fa-share"></i> ${articleData.shares_count || 0} Shares
                        </div>
                    </div>
                </div>
                
                <div class="article-detail-body">
                    ${escapeHtml(articleData.content).replace(/\n/g, '<br>')}
                </div>
                
                <div class="article-detail-actions">
                    <button class="article-detail-btn like-btn ${isLiked ? 'active' : ''}" onclick="handleLike()">
                        <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                        ${isLiked ? 'Liked' : 'Like'}
                    </button>
                    <button class="article-detail-btn comment-btn" onclick="scrollToComments()">
                        <i class="fas fa-comment"></i> Comment
                    </button>
                    <button class="article-detail-btn share-btn" onclick="shareArticle()">
                        <i class="fas fa-share"></i> Share
                    </button>
                </div>
                
                <div id="commentsSection" class="comments-section">
                    <!-- Comments will be loaded here -->
                </div>
            </div>
        </div>
    `;
    
    articleContent.style.display = 'block';
}

// Handle Like
async function handleLike() {
    if (!articleData) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/articles/${articleData.id}/like`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to like article');
        }
        
        const data = await response.json();
        const isLiked = data.liked;
        
        // Update UI
        const likeBtn = document.querySelector('.like-btn');
        const likeIcon = likeBtn.querySelector('i');
        const likeCount = document.querySelector('.fa-heart').closest('.article-detail-stat');
        
        if (isLiked) {
            likeBtn.classList.add('active');
            likeBtn.innerHTML = '<i class="fas fa-heart"></i> Liked';
            likedArticles.add(articleData.id);
            
            // Update count
            const currentCount = parseInt(likeCount.textContent.match(/\d+/)[0]);
            likeCount.innerHTML = `<i class="fas fa-heart"></i> ${currentCount + 1} Likes`;
            
            showToast('Article liked!', 'success');
        } else {
            likeBtn.classList.remove('active');
            likeBtn.innerHTML = '<i class="far fa-heart"></i> Like';
            likedArticles.delete(articleData.id);
            
            // Update count
            const currentCount = parseInt(likeCount.textContent.match(/\d+/)[0]);
            likeCount.innerHTML = `<i class="fas fa-heart"></i> ${Math.max(0, currentCount - 1)} Likes`;
            
            showToast('Article unliked', 'info');
        }
        
        saveLikedArticles();
    } catch (error) {
        console.error('Error liking article:', error);
        showToast('Failed to like article. Please try again.', 'error');
    }
}

// Share Article
async function shareArticle() {
    if (!articleData) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/articles/${articleData.id}/share`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to share article');
        }
        
        const data = await response.json();
        
        // FIX: Construct proper URLs
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}${data.share_url.startsWith('/') ? '' : '/'}${data.share_url}`;
        
        // Use the image from the API response or from article data
        const shareImage = data.image || articleData.thumbnail_url;
        
        console.log('Sharing with:', {
            title: data.title,
            description: data.description,
            image: shareImage,
            url: shareUrl
        });
        
        // For Web Share API
        const shareFallbackText = `${data.title}\n\n${data.description}`;
        
        // For clipboard
        const clipboardText = `${data.title}\n\n${data.description}\n\nRead more: ${shareUrl}`;
        
        // Use Web Share API if available
        if (navigator.share) {
            try {
                await navigator.share({
                    title: data.title,
                    text: shareFallbackText,
                    url: shareUrl
                });
                
                updateShareCount();
                return;
            } catch (shareError) {
                if (shareError.name !== 'AbortError') {
                    await navigator.clipboard.writeText(clipboardText);
                    showToast('Article details copied to clipboard!', 'success');
                    updateShareCount();
                }
                return;
            }
        }
        
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(clipboardText);
        showToast('Article details copied to clipboard!', 'success');
        updateShareCount();
        
    } catch (error) {
        console.error('Error sharing article:', error);
        showToast('Failed to share article. Please try again.', 'error');
    }
}

// Helper function to update share count
function updateShareCount() {
    const shareCount = document.querySelector('.fa-share').closest('.article-detail-stat');
    if (shareCount) {
        const currentCount = parseInt(shareCount.textContent.match(/\d+/)[0]) || 0;
        shareCount.innerHTML = `<i class="fas fa-share"></i> ${currentCount + 1} Shares`;
    }
}

// Load Comments
async function loadComments() {
    try {
        const response = await fetch(`${API_BASE_URL}/articles/${articleId}/comments`);
        
        if (!response.ok) {
            throw new Error('Failed to load comments');
        }
        
        const comments = await response.json();
        renderComments(comments);
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

// Render Comments
function renderComments(comments) {
    const commentsSection = document.getElementById('commentsSection');
    if (!commentsSection) return;
    
    let commentsHTML = `
        <div class="comments-header">
            <h3><i class="fas fa-comments"></i> Comments (${comments.length})</h3>
        </div>
        
        <div class="comment-form">
            <textarea id="commentInput" placeholder="Write your comment here..."></textarea>
            <div class="comment-form-actions">
                <button class="btn-secondary" onclick="clearComment()">
                    <i class="fas fa-times"></i> Clear
                </button>
                <button class="btn-primary" onclick="postComment()">
                    <i class="fas fa-paper-plane"></i> Post Comment
                </button>
            </div>
        </div>
        
        <div class="comments-list" id="commentsList">
    `;
    
    if (comments.length === 0) {
        commentsHTML += `
            <div class="empty-comments">
                <i class="far fa-comment"></i>
                <p>No comments yet. Be the first to comment!</p>
            </div>
        `;
    } else {
        comments.forEach(comment => {
            const date = formatDate(comment.created_at);
            const userId = comment.user_id || 'anonymous';
            const userInitial = userId.charAt(0).toUpperCase();
            
            commentsHTML += `
                <div class="comment-card">
                    <div class="comment-header">
                        <div class="comment-author">
                            <div class="comment-avatar">${userInitial}</div>
                            <div class="comment-author-info">
                                <h4>User ${userId.substring(0, 8)}</h4>
                                <span>${userId}</span>
                            </div>
                        </div>
                        <div class="comment-date">${date}</div>
                    </div>
                    <div class="comment-text">${escapeHtml(comment.text)}</div>
                </div>
            `;
        });
    }
    
    commentsHTML += '</div>';
    commentsSection.innerHTML = commentsHTML;
}

// Post Comment
async function postComment() {
    const commentInput = document.getElementById('commentInput');
    const commentText = commentInput.value.trim();
    
    if (!commentText) {
        showToast('Please enter a comment', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/articles/${articleId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: commentText })
        });
        
        if (!response.ok) {
            throw new Error('Failed to post comment');
        }
        
        const newComment = await response.json();
        
        // Clear input
        commentInput.value = '';
        
        // Reload comments
        await loadComments();
        
        // Update comment count
        const commentCount = document.querySelector('.fa-comment').closest('.article-detail-stat');
        const currentCount = parseInt(commentCount.textContent.match(/\d+/)[0]);
        commentCount.innerHTML = `<i class="fas fa-comment"></i> ${currentCount + 1} Comments`;
        
        showToast('Comment posted successfully!', 'success');
    } catch (error) {
        console.error('Error posting comment:', error);
        showToast('Failed to post comment. Please try again.', 'error');
    }
}

// Clear Comment
function clearComment() {
    const commentInput = document.getElementById('commentInput');
    commentInput.value = '';
}

// Scroll to Comments
function scrollToComments() {
    const commentsSection = document.getElementById('commentsSection');
    if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'smooth' });
        const commentInput = document.getElementById('commentInput');
        if (commentInput) {
            commentInput.focus();
        }
    }
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

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Function to update meta tags dynamically
function updateMetaTags(article) {
    const baseUrl = window.location.origin;
    const articleUrl = `${baseUrl}/article-detail.html?id=${article.id}`;
    const articleTitle = escapeHtml(article.title);
    const articleDescription = escapeHtml(article.meta_description || article.content.substring(0, 150));
    
    // FIX: Get the actual article thumbnail, not just fallback to app icon
    let articleImage = article.thumbnail_url;
    
    // If no thumbnail, check media_urls for images
    if (!articleImage && article.media_urls && article.media_urls.length > 0) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        for (const mediaUrl of article.media_urls) {
            if (imageExtensions.some(ext => mediaUrl.toLowerCase().endsWith(ext))) {
                articleImage = mediaUrl;
                break;
            }
        }
    }
    
    // Only use app icon as LAST resort
    if (!articleImage) {
        articleImage = `${baseUrl}/vikayblog_app_icon.png`;
    }
    
    console.log('Meta tags set:', {
        title: articleTitle,
        description: articleDescription,
        image: articleImage,
        url: articleUrl
    });
    
    // Update document title
    document.title = `ViKayBlog | ${articleTitle}`;
    
    // Update Open Graph tags
    updateMetaTag('og:title', articleTitle);
    updateMetaTag('og:description', articleDescription);
    updateMetaTag('og:image', articleImage);
    updateMetaTag('og:url', articleUrl);
    updateMetaTag('og:type', 'article');
    
    // Update Twitter Card tags
    updateMetaTag('twitter:title', articleTitle);
    updateMetaTag('twitter:description', articleDescription);
    updateMetaTag('twitter:image', articleImage);
    updateMetaTag('twitter:card', 'summary_large_image');
    
    // Update standard meta description
    updateMetaTag('description', articleDescription, 'name');
    
    // Update canonical URL
    updateMetaTag('canonical', articleUrl, 'rel');
}

// Helper function to update meta tags
function updateMetaTag(property, content, attr = 'property') {
    let tag = document.querySelector(`meta[${attr}="${property}"]`);
    
    if (!tag && attr === 'rel') {
        tag = document.querySelector(`link[${attr}="${property}"]`);
    }
    
    if (tag) {
        tag.setAttribute('content', content);
    } else {
        // Create the tag if it doesn't exist
        if (attr === 'rel') {
            tag = document.createElement('link');
            tag.setAttribute('rel', property);
            tag.setAttribute('href', content);
            document.head.appendChild(tag);
        } else {
            tag = document.createElement('meta');
            tag.setAttribute(attr, property);
            tag.setAttribute('content', content);
            document.head.appendChild(tag);
        }
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show/Hide UI Elements
function showLoading() {
    loadingElement.style.display = 'block';
}

function hideLoading() {
    loadingElement.style.display = 'none';
}

function showError() {
    errorState.style.display = 'block';
    hideLoading();
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