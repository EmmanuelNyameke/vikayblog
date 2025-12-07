const API_BASE_URL = 'https://news-management-system.onrender.com';
let currentArticleId = null;
let likedArticles = JSON.parse(localStorage.getItem('likedArticles') || '[]');

// DOM Elements
const articlesGrid = document.getElementById('articlesGrid');
const loadingContainer = document.getElementById('loadingContainer');
const articleModal = document.getElementById('articleModal');
const closeModal = document.getElementById('closeModal');
const searchInput = document.getElementById('searchInput');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const logoImg = document.querySelector('.logo-image');
    const loadingLogo = document.querySelector('.logo-loading');
    if (logoImg && logoImg.src) {
        const img = new Image();
        img.src = logoImg.src; 
    }
    if (loadingLogo && loadingLogo.src) {
        const img2 = new Image();
        img2.src = loadingLogo.src;
    }
});

// Event listeners
function setupEventListeners() {
    closeModal.addEventListener('click', closeArticleModal);
    articleModal.addEventListener('click', (e) => {
        if (e.target === articleModal) closeArticleModal();
    });

    searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeArticleModal();
    });
    
}

// Load Articles
async function loadArticles(query = '') {
    try {
        showLoading(true);
        const url = query ? `${API_BASE_URL}/articles/?q=${encodeURIComponent(query)}&page_size=20` : `${API_BASE_URL}/articles/?page_size=20`;

        const response = await fetch(url);
        const articles = await response.json();

        renderArticles(articles);
        showLoading(false);
    } catch (error) {
        console.error('Error loading articles:', error);
        showError('Failed to load articles. Please try again.');
        showLoading(false);
    }
}

// Render Articles
        function renderArticles(articles) {
            if (!articles || articles.length === 0) {
                articlesGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 60px 0;">
                        <i class="fas fa-newspaper" style="font-size: 64px; color: #ccc; margin-bottom: 20px;"></i>
                        <h3 style="color: #666; margin-bottom: 10px;">No articles found</h3>
                        <p style="color: #999;">Try a different search or check back later for new articles.</p>
                    </div>
                `;
                return;
            }

            articlesGrid.innerHTML = articles.map(article => `
                <div class="article-card" data-id="${article.id}">
                    <img src="${article.thumbnail_url || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=400&h=200&fit=crop'}" 
                         alt="${article.title}" 
                         class="article-image"
                         onerror="this.src='https://images.unsplash.com/photo-1495020689067-958852a7765e?w=400&h=200&fit=crop'">
                    
                    <div class="article-content">
                        <span class="article-category">${article.tags && article.tags.length > 0 ? article.tags[0] : 'General'}</span>
                        <h3 class="article-title" onclick="openArticleModal('${article.id}')">
                            ${article.title}
                        </h3>
                        <p class="article-excerpt">
                            ${article.content.substring(0, 150)}${article.content.length > 150 ? '...' : ''}
                        </p>
                        
                        <div class="article-meta">
                            <span class="article-date">
                                <i class="far fa-calendar"></i>
                                ${formatDate(article.created_at)}
                            </span>
                            <div class="article-stats">
                                <span class="stat ${likedArticles.includes(article.id) ? 'liked' : ''}" 
                                      onclick="handleLike('${article.id}', this)">
                                    <i class="${likedArticles.includes(article.id) ? 'fas' : 'far'} fa-heart"></i>
                                    ${article.likes_count || 0}
                                </span>
                                <span class="stat" onclick="openArticleModal('${article.id}')">
                                    <i class="far fa-comment"></i>
                                    ${article.comments_count || 0}
                                </span>
                                <span class="stat" onclick="handleShare('${article.id}')">
                                    <i class="fas fa-share"></i>
                                    ${article.shares_count || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="btn btn-like ${likedArticles.includes(article.id) ? 'liked' : ''}" 
                                onclick="handleLike('${article.id}', this)">
                            <i class="${likedArticles.includes(article.id) ? 'fas' : 'far'} fa-heart"></i>
                            ${likedArticles.includes(article.id) ? 'Liked' : 'Like'} (${article.likes_count || 0})
                        </button>
                        <button class="btn btn-comment" onclick="openArticleModal('${article.id}')">
                            <i class="far fa-comment"></i>
                            Comment (${article.comments_count || 0})
                        </button>
                        <button class="btn btn-share" onclick="handleShare('${article.id}')">
                            <i class="fas fa-share"></i>
                            Share (${article.shares_count || 0})
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // Open Article Modal
        async function openArticleModal(articleId) {
            try {
                showLoading(true);
                currentArticleId = articleId;
                
                // Load article details
                const articleResponse = await fetch(`${API_BASE_URL}/articles/${articleId}`);
                const article = await articleResponse.json();
                
                // Load comments
                const commentsResponse = await fetch(`${API_BASE_URL}/articles/${articleId}/comments`);
                const comments = await commentsResponse.json();
                
                // Populate modal
                document.getElementById('modalTitle').textContent = article.title;
                document.getElementById('modalDate').innerHTML = `<i class="far fa-calendar"></i> ${formatDate(article.created_at)}`;
                document.getElementById('modalAuthor').innerHTML = `<i class="far fa-user"></i> ${article.author_id || 'Anonymous'}`;
                document.getElementById('modalImage').src = article.thumbnail_url || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=400&fit=crop';
                document.getElementById('modalImage').onerror = function() {
                    this.src = 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=400&fit=crop';
                };
                document.getElementById('modalContent').innerHTML = article.content.split('\n').map(p => `<p>${p}</p>`).join('');
                document.getElementById('modalLikeCount').textContent = article.likes_count || 0;
                document.getElementById('commentsCount').textContent = article.comments_count || 0;
                
                // Update modal like button
                const modalLikeBtn = document.getElementById('modalLikeBtn');
                modalLikeBtn.className = `btn btn-like ${likedArticles.includes(articleId) ? 'liked' : ''}`;
                modalLikeBtn.innerHTML = `<i class="${likedArticles.includes(articleId) ? 'fas' : 'far'} fa-heart"></i>
                                          <span id="modalLikeCount">${article.likes_count || 0}</span>`;
                
                // Set up modal button handlers
                modalLikeBtn.onclick = () => handleLike(articleId, modalLikeBtn);
                document.getElementById('modalShareBtn').onclick = () => handleShare(articleId);
                document.getElementById('modalCommentBtn').onclick = () => {
                    document.getElementById('commentInput').focus();
                };
                
                // Render tags
                const tagsContainer = document.getElementById('modalTags');
                tagsContainer.innerHTML = '';
                if (article.tags && article.tags.length > 0) {
                    article.tags.forEach(tag => {
                        const tagEl = document.createElement('span');
                        tagEl.className = 'tag';
                        tagEl.textContent = tag;
                        tagsContainer.appendChild(tagEl);
                    });
                }
                
                // Render comments
                renderComments(comments);
                
                // Set up comment submission
                document.getElementById('submitComment').onclick = handleSubmitComment;
                document.getElementById('commentInput').onkeydown = (e) => {
                    if (e.ctrlKey && e.key === 'Enter') {
                        handleSubmitComment();
                    }
                };
                
                // Show modal
                articleModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                showLoading(false);
                
            } catch (error) {
                console.error('Error loading article:', error);
                showError('Failed to load article. Please try again.');
                showLoading(false);
            }
        }

        // Close Article Modal
        function closeArticleModal() {
            articleModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            currentArticleId = null;
        }

        // Handle Like
        async function handleLike(articleId, element) {
            try {
                const response = await fetch(`${API_BASE_URL}/articles/${articleId}/like`, {
                    method: 'POST'
                });
                
                const data = await response.json();
                
                // Update UI
                const isLiked = likedArticles.includes(articleId);
                if (isLiked) {
                    // Unlike
                    likedArticles = likedArticles.filter(id => id !== articleId);
                    updateLikeUI(element, false);
                } else {
                    // Like
                    likedArticles.push(articleId);
                    updateLikeUI(element, true);
                }
                
                // Save to localStorage
                localStorage.setItem('likedArticles', JSON.stringify(likedArticles));
                
                showToast(isLiked ? 'Article unliked' : 'Article liked!');
                
            } catch (error) {
                console.error('Error liking article:', error);
                showError('Failed to like article. Please try again.');
            }
        }

        // Update Like UI
        function updateLikeUI(element, isLiked) {
            // Update button text and icon
            if (element.classList.contains('btn-like')) {
                element.classList.toggle('liked', isLiked);
                const icon = element.querySelector('i');
                icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
                
                // Update count
                const countSpan = element.querySelector('span:not(.fa-heart)');
                if (countSpan) {
                    let count = parseInt(countSpan.textContent) || 0;
                    count = isLiked ? count + 1 : Math.max(0, count - 1);
                    countSpan.textContent = count;
                }
            }
            
            // Update stats in article card
            const stat = element.closest('.article-card')?.querySelector('.stat .fa-heart')?.closest('.stat');
            if (stat) {
                stat.classList.toggle('liked', isLiked);
                const icon = stat.querySelector('i');
                icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
                
                // Update count
                const count = parseInt(stat.textContent) || 0;
                stat.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                                 ${isLiked ? count + 1 : Math.max(0, count - 1)}`;
            }
            
            // Update modal if open
            if (currentArticleId) {
                const modalLikeBtn = document.getElementById('modalLikeBtn');
                const modalCount = document.getElementById('modalLikeCount');
                if (modalLikeBtn && modalCount) {
                    modalLikeBtn.classList.toggle('liked', isLiked);
                    const modalIcon = modalLikeBtn.querySelector('i');
                    modalIcon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
                    
                    let modalCountNum = parseInt(modalCount.textContent) || 0;
                    modalCountNum = isLiked ? modalCountNum + 1 : Math.max(0, modalCountNum - 1);
                    modalCount.textContent = modalCountNum;
                }
            }
        }

        // Handle Share
        async function handleShare(articleId) {
            try {
                const response = await fetch(`${API_BASE_URL}/articles/${articleId}/share`, {
                    method: 'POST'
                });
                
                const data = await response.json();
                
                // Copy share URL to clipboard
                const shareUrl = data.share_url || `${API_BASE_URL}/articles/${articleId}`;
                await navigator.clipboard.writeText(shareUrl);
                
                // Update UI
                const articleCard = document.querySelector(`[data-id="${articleId}"]`);
                if (articleCard) {
                    const shareStat = articleCard.querySelector('.stat .fa-share')?.closest('.stat');
                    if (shareStat) {
                        const count = parseInt(shareStat.textContent) || 0;
                        shareStat.innerHTML = `<i class="fas fa-share"></i>${count + 1}`;
                    }
                    
                    const shareBtn = articleCard.querySelector('.btn-share');
                    if (shareBtn) {
                        const countSpan = shareBtn.querySelector('span:not(.fa-share)');
                        if (countSpan) {
                            const count = parseInt(countSpan.textContent.match(/\d+/)) || 0;
                            shareBtn.innerHTML = `<i class="fas fa-share"></i> Share (${count + 1})`;
                        }
                    }
                }
                
                showToast('Link copied to clipboard!');
                
            } catch (error) {
                console.error('Error sharing article:', error);
                showError('Failed to share article. Please try again.');
            }
        }

        // Handle Submit Comment
        async function handleSubmitComment() {
            const commentInput = document.getElementById('commentInput');
            const commentText = commentInput.value.trim();
            
            if (!commentText) {
                showError('Please enter a comment');
                return;
            }
            
            if (!currentArticleId) return;
            
            try {
                const response = await fetch(`${API_BASE_URL}/articles/${currentArticleId}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text: commentText
                    })
                });
                
                if (!response.ok) throw new Error('Failed to post comment');
                
                const comment = await response.json();
                
                // Add comment to list
                const commentsList = document.getElementById('commentsList');
                const commentElement = createCommentElement(comment);
                commentsList.insertBefore(commentElement, commentsList.firstChild);
                
                // Update comment count
                const commentsCount = document.getElementById('commentsCount');
                let count = parseInt(commentsCount.textContent) || 0;
                commentsCount.textContent = count + 1;
                
                // Clear input
                commentInput.value = '';
                
                // Update article card comment count
                const articleCard = document.querySelector(`[data-id="${currentArticleId}"]`);
                if (articleCard) {
                    const commentStat = articleCard.querySelector('.stat .fa-comment')?.closest('.stat');
                    if (commentStat) {
                        const currentCount = parseInt(commentStat.textContent) || 0;
                        commentStat.innerHTML = `<i class="far fa-comment"></i>${currentCount + 1}`;
                    }
                    
                    const commentBtn = articleCard.querySelector('.btn-comment');
                    if (commentBtn) {
                        const countSpan = commentBtn.querySelector('span:not(.fa-comment)');
                        if (countSpan) {
                            const count = parseInt(countSpan.textContent.match(/\d+/)) || 0;
                            commentBtn.innerHTML = `<i class="far fa-comment"></i> Comment (${count + 1})`;
                        }
                    }
                }
                
                showToast('Comment posted successfully!');
                
            } catch (error) {
                console.error('Error posting comment:', error);
                showError('Failed to post comment. Please try again.');
            }
        }

        // Render Comments
        function renderComments(comments) {
            const commentsList = document.getElementById('commentsList');
            if (!comments || comments.length === 0) {
                commentsList.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #666;">
                        <i class="far fa-comment" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                        <p>No comments yet. Be the first to comment!</p>
                    </div>
                `;
                return;
            }
            
            commentsList.innerHTML = comments.map(comment => `
                <div class="comment-item">
                    <div class="comment-header">
                        <span class="comment-user">
                            <i class="far fa-user"></i>
                            ${comment.user_id || 'Anonymous'}
                        </span>
                        <span class="comment-date">${formatDate(comment.created_at)}</span>
                    </div>
                    <p class="comment-text">${comment.text}</p>
                </div>
            `).join('');
        }

        // Create Comment Element
        function createCommentElement(comment) {
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = `
                <div class="comment-header">
                    <span class="comment-user">
                        <i class="far fa-user"></i>
                        ${comment.user_id || 'Anonymous'}
                    </span>
                    <span class="comment-date">${formatDate(comment.created_at)}</span>
                </div>
                <p class="comment-text">${comment.text}</p>
            `;
            return div;
        }

        // Handle Search
        function handleSearch() {
            const query = searchInput.value.trim();
            loadArticles(query);
        }

        // Show/Hide Loading
        function showLoading(show) {
            loadingContainer.style.display = show ? 'block' : 'none';
            articlesGrid.style.display = show ? 'none' : 'grid';
        }

        // Show Toast
        function showToast(message) {
            toastMessage.textContent = message;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        // Show Error
        function showError(message) {
            toastMessage.textContent = message;
            toast.style.backgroundColor = '#D32F2F';
            toast.querySelector('i').className = 'fas fa-exclamation-circle';
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
                toast.style.backgroundColor = '';
                toast.querySelector('i').className = 'fas fa-check-circle';
            }, 3000);
        }

        // Format Date
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Debounce Function
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // Make functions available globally
        window.openArticleModal = openArticleModal;
        window.handleLike = handleLike;
        window.handleShare = handleShare;
        window.closeArticleModal = closeArticleModal;
        window.handleSubmitComment = handleSubmitComment;

        // Initialize the application
        setupEventListeners();
        loadArticles();