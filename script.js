const API_BASE_URL = 'https://news-management-system.onrender.com';
let currentArticleId = null;
let likedArticles = JSON.parse(localStorage.getItem('likedArticles') || '[]');

// DOM Elements
const articlesGrid = document.getElementById('articlesGrid');
const loadingContainer = document.getElementById('loadingContainer');
const searchInput = document.getElementById('searchInput');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// View elements
const articlesListView = document.getElementById('articlesListView');
const articleDetailView = document.getElementById('articleDetailView');
const backButton = document.getElementById('backButton');

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
    
    // Check if we're on an article detail page from URL
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('article');
    if (articleId) {
        openArticleDetailPage(articleId);
    } else {
        setupEventListeners();
        loadArticles();
    }
});

// Event listeners
function setupEventListeners() {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Back button
    backButton.addEventListener('click', () => {
        // Update URL without page reload
        window.history.pushState({}, '', 'index.html');
        showArticleListView();
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('article');
        
        if (articleId) {
            openArticleDetailPage(articleId);
        } else {
            showArticleListView();
        }
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
                <h3 class="article-title" onclick="openArticleDetailPage('${article.id}')">
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
                        <span class="stat" onclick="openArticleDetailPage('${article.id}')">
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
                <button class="btn btn-comment" onclick="openArticleDetailPage('${article.id}')">
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

// Open Article Detail Page
async function openArticleDetailPage(articleId) {
    try {
        showLoading(true);
        currentArticleId = articleId;
        
        // Update URL without reloading page
        window.history.pushState({}, '', `?article=${articleId}`);
        
        // Load article details
        const articleResponse = await fetch(`${API_BASE_URL}/articles/${articleId}`);
        const article = await articleResponse.json();
        
        // Load comments
        const commentsResponse = await fetch(`${API_BASE_URL}/articles/${articleId}/comments`);
        const comments = await commentsResponse.json();
        
        // Populate detail page
        document.getElementById('detailTitle').textContent = article.title;
        document.getElementById('detailDate').innerHTML = `<i class="far fa-calendar"></i> ${formatDate(article.created_at)}`;
        document.getElementById('detailAuthor').innerHTML = `<i class="far fa-user"></i> ${article.author_id || 'Anonymous'}`;
        document.getElementById('detailImage').src = article.thumbnail_url || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=400&fit=crop';
        document.getElementById('detailImage').onerror = function() {
            this.src = 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=400&fit=crop';
        };
        
        // Format content with paragraphs
        document.getElementById('detailContent').innerHTML = article.content.split('\n').map(p => `<p>${p}</p>`).join('');
        
        // Update counts
        document.getElementById('detailLikeCount').textContent = article.likes_count || 0;
        document.getElementById('detailCommentCount').textContent = article.comments_count || 0;
        document.getElementById('detailCommentsCount').textContent = article.comments_count || 0;
        
        // Update like button
        const detailLikeBtn = document.getElementById('detailLikeBtn');
        detailLikeBtn.className = `btn btn-like ${likedArticles.includes(articleId) ? 'liked' : ''}`;
        detailLikeBtn.innerHTML = `<i class="${likedArticles.includes(articleId) ? 'fas' : 'far'} fa-heart"></i>
                                  <span id="detailLikeCount">${article.likes_count || 0}</span>`;
        
        // Set up button handlers
        detailLikeBtn.onclick = () => handleLike(articleId, detailLikeBtn);
        document.getElementById('detailShareBtn').onclick = () => handleShare(articleId);
        document.getElementById('detailCommentBtn').onclick = () => {
            document.getElementById('detailCommentInput').focus();
        };
        
        // Render tags
        const tagsContainer = document.getElementById('detailTags');
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
        renderDetailComments(comments);
        
        // Set up comment submission
        document.getElementById('detailSubmitComment').onclick = handleDetailSubmitComment;
        document.getElementById('detailCommentInput').onkeydown = (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                handleDetailSubmitComment();
            }
        };
        
        // Show detail view
        showArticleDetailView();
        showLoading(false);
        
        // Update page title
        document.title = `${article.title} | VikayBlog`;
        
    } catch (error) {
        console.error('Error loading article:', error);
        showError('Failed to load article. Please try again.');
        showLoading(false);
        showArticleListView();
    }
}

// Show Article Detail View
function showArticleDetailView() {
    articlesListView.style.display = 'none';
    articleDetailView.style.display = 'block';
    document.getElementById('searchInput').style.display = 'none';
}

// Show Article List View
function showArticleListView() {
    articlesListView.style.display = 'block';
    articleDetailView.style.display = 'none';
    document.getElementById('searchInput').style.display = 'block';
    document.title = 'VikayBlog | News Articles';
    currentArticleId = null;
}

// Handle Detail Submit Comment
async function handleDetailSubmitComment() {
    const commentInput = document.getElementById('detailCommentInput');
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
        const commentsList = document.getElementById('detailCommentsList');
        const commentElement = createCommentElement(comment);
        commentsList.insertBefore(commentElement, commentsList.firstChild);
        
        // Update comment count
        const commentsCount = document.getElementById('detailCommentsCount');
        let count = parseInt(commentsCount.textContent) || 0;
        commentsCount.textContent = count + 1;
        
        // Update comment button count
        const detailCommentCount = document.getElementById('detailCommentCount');
        detailCommentCount.textContent = count + 1;
        
        // Clear input
        commentInput.value = '';
        
        // Update article card comment count (if still in DOM)
        const articleCard = document.querySelector(`[data-id="${currentArticleId}"]`);
        if (articleCard) {
            const commentStat = articleCard.querySelector('.stat .fa-comment')?.closest('.stat');
            if (commentStat) {
                const currentCount = parseInt(commentStat.textContent) || 0;
                commentStat.innerHTML = `<i class="far fa-comment"></i>${currentCount + 1}`;
            }
            
            const commentBtn = articleCard.querySelector('.btn-comment');
            if (commentBtn) {
                const countMatch = commentBtn.textContent.match(/\((\d+)\)/);
                const currentCount = countMatch ? parseInt(countMatch[1]) : 0;
                commentBtn.innerHTML = `<i class="far fa-comment"></i> Comment (${currentCount + 1})`;
            }
        }
        
        showToast('Comment posted successfully!');
        
    } catch (error) {
        console.error('Error posting comment:', error);
        showError('Failed to post comment. Please try again.');
    }
}

// Render Detail Comments
function renderDetailComments(comments) {
    const commentsList = document.getElementById('detailCommentsList');
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
    
    // Update detail page if open
    if (currentArticleId) {
        const detailLikeBtn = document.getElementById('detailLikeBtn');
        const detailLikeCount = document.getElementById('detailLikeCount');
        if (detailLikeBtn && detailLikeCount) {
            detailLikeBtn.classList.toggle('liked', isLiked);
            const modalIcon = detailLikeBtn.querySelector('i');
            modalIcon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
            
            let modalCountNum = parseInt(detailLikeCount.textContent) || 0;
            modalCountNum = isLiked ? modalCountNum + 1 : Math.max(0, modalCountNum - 1);
            detailLikeCount.textContent = modalCountNum;
        }
    }
}

        // Handle Share
async function handleShare(articleId) {
    try {
        const response = await fetch(`${API_BASE_URL}/articles/${articleId}/share`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to share article');
        }
        
        const data = await response.json();
        
        // Use the rich data from the API response
        const shareUrl = data.share_url;
        const articleTitle = data.article_title || 'Check out this article!';
        const articleDescription = data.article_description || '';
        const articleImage = data.article_image || '';
        const socialUrls = data.social_urls || {};
        
        // Check if Web Share API is available
        if (navigator.share) {
            try {
                const shareData = {
                    title: articleTitle,
                    text: articleDescription,
                    url: shareUrl,
                };
                
                // Try to include image if available
                if (articleImage && navigator.canShare) {
                    try {
                        // Convert image URL to blob for sharing
                        const imageResponse = await fetch(articleImage);
                        const blob = await imageResponse.blob();
                        const file = new File([blob], 'article-thumbnail.jpg', { type: blob.type });
                        
                        if (navigator.canShare({ files: [file] })) {
                            shareData.files = [file];
                        }
                    } catch (imageError) {
                        console.log('Cannot share image, sharing without it');
                    }
                }
                
                await navigator.share(shareData);
                
                // Only update counts if share was successful
                updateShareUI(articleId);
                showToast('Shared successfully!');
                return;
            } catch (shareError) {
                console.log('Web Share cancelled or failed, falling back to custom share dialog');
            }
        }
        
        // Fallback: Show custom share dialog with rich preview
        showSocialShareDialog(articleTitle, shareUrl, articleDescription, articleImage, socialUrls, articleId);
        
    } catch (error) {
        console.error('Error sharing article:', error);
        showError('Failed to share article. Please try again.');
    }
}

// Show Social Media Share Dialog
function showSocialShareDialog(title, url, text, imageUrl, socialUrls, articleId) {
    // Create share dialog overlay
    const shareDialog = document.createElement('div');
    shareDialog.className = 'share-dialog-overlay';
    shareDialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 4000;
        animation: fadeIn 0.3s ease;
    `;
    
    // Create share dialog content
    const shareContent = document.createElement('div');
    shareContent.className = 'share-dialog-content';
    shareContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        animation: slideUp 0.3s ease;
    `;
    
    // Use socialUrls from API or generate default ones
    const platforms = [
        {
            name: 'Twitter',
            icon: 'fab fa-twitter',
            color: '#1DA1F2',
            url: socialUrls.twitter || `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
        },
        {
            name: 'Facebook',
            icon: 'fab fa-facebook',
            color: '#4267B2',
            url: socialUrls.facebook || `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`
        },
        {
            name: 'LinkedIn',
            icon: 'fab fa-linkedin',
            color: '#0077B5',
            url: socialUrls.linkedin || `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(text)}`
        },
        {
            name: 'WhatsApp',
            icon: 'fab fa-whatsapp',
            color: '#25D366',
            url: socialUrls.whatsapp || `https://wa.me/?text=${encodeURIComponent(title + ' - ' + text + ' ' + url)}`
        },
        {
            name: 'Telegram',
            icon: 'fab fa-telegram',
            color: '#0088CC',
            url: socialUrls.telegram || `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
        },
        {
            name: 'Email',
            icon: 'fas fa-envelope',
            color: '#EA4335',
            url: socialUrls.email || `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\nRead more: ' + url)}`
        }
    ];
    
    // Build dialog HTML with rich preview
    shareContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; color: #212121;">Share Article</h3>
            <button class="close-share-dialog" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #757575;">&times;</button>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #eee;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                ${imageUrl ? `<img src="${imageUrl}" alt="Article thumbnail" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd;">` : ''}
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 8px 0; color: #212121; font-size: 16px; font-weight: 600;">${title.substring(0, 80)}${title.length > 80 ? '...' : ''}</h4>
                    <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.4;">${text}</p>
                </div>
            </div>
            <div style="color: #4CAF50; font-size: 12px; display: flex; align-items: center; gap: 5px;">
                <i class="fas fa-link"></i>
                <span>vikayblog.com</span>
            </div>
        </div>
        
        <p style="color: #666; margin-bottom: 20px; font-size: 14px;">Share this article on:</p>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;" id="shareButtonsContainer">
            <!-- Social buttons will be added here -->
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0; font-weight: 500; color: #212121;">Share Link:</p>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="shareUrlInput" value="${url}" readonly style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                <button id="copyShareLink" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Copy</button>
            </div>
        </div>
    `;
    
    // Add social buttons
    const buttonsContainer = shareContent.querySelector('#shareButtonsContainer');
    platforms.forEach(platform => {
        const button = document.createElement('button');
        button.className = 'social-share-btn';
        button.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 15px;
            background: white;
            border: 1px solid #eee;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        button.innerHTML = `
            <i class="${platform.icon}" style="font-size: 24px; margin-bottom: 8px; color: ${platform.color};"></i>
            <span style="font-size: 12px; color: #212121;">${platform.name}</span>
        `;
        
        button.onclick = () => {
            // Open share window
            window.open(platform.url, '_blank', 'width=600,height=400');
            
            // Update share count after a delay
            setTimeout(() => {
                updateShareUI(articleId);
                showToast(`Shared on ${platform.name}!`);
            }, 1000);
            
            // Close dialog
            shareDialog.remove();
        };
        
        button.onmouseover = () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            button.style.backgroundColor = '#f9f9f9';
        };
        
        button.onmouseout = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
            button.style.backgroundColor = 'white';
        };
        
        buttonsContainer.appendChild(button);
    });
    
    // Assemble dialog
    shareDialog.appendChild(shareContent);
    document.body.appendChild(shareDialog);
    
    // Add close functionality
    const closeBtn = shareContent.querySelector('.close-share-dialog');
    closeBtn.onclick = () => shareDialog.remove();
    
    // Close on overlay click
    shareDialog.onclick = (e) => {
        if (e.target === shareDialog) shareDialog.remove();
    };
    
    // Copy link functionality
    const copyBtn = shareContent.querySelector('#copyShareLink');
    const urlInput = shareContent.querySelector('#shareUrlInput');
    
    copyBtn.onclick = async () => {
        try {
            await navigator.clipboard.writeText(url);
            copyBtn.textContent = 'Copied!';
            copyBtn.style.background = '#388E3C';
            updateShareUI(articleId);
            showToast('Link copied to clipboard!');
            
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
                copyBtn.style.background = '#4CAF50';
            }, 2000);
        } catch (err) {
            // Fallback for older browsers
            urlInput.select();
            document.execCommand('copy');
            copyBtn.textContent = 'Copied!';
            copyBtn.style.background = '#388E3C';
            updateShareUI(articleId);
            showToast('Link copied to clipboard!');
            
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
                copyBtn.style.background = '#4CAF50';
            }, 2000);
        }
    };
}

// Update Share UI
function updateShareUI(articleId) {
    const articleCard = document.querySelector(`[data-id="${articleId}"]`);
    if (articleCard) {
        const shareStat = articleCard.querySelector('.stat .fa-share')?.closest('.stat');
        if (shareStat) {
            const count = parseInt(shareStat.textContent) || 0;
            shareStat.innerHTML = `<i class="fas fa-share"></i>${count + 1}`;
        }
        
        const shareBtn = articleCard.querySelector('.btn-share');
        if (shareBtn) {
            const countMatch = shareBtn.textContent.match(/\((\d+)\)/);
            const currentCount = countMatch ? parseInt(countMatch[1]) : 0;
            shareBtn.innerHTML = `<i class="fas fa-share"></i> Share (${currentCount + 1})`;
        }
        
        // Update modal share count if open
        if (currentArticleId === articleId) {
            const modalShareBtn = document.getElementById('modalShareBtn');
            if (modalShareBtn) {
                const modalCountMatch = modalShareBtn.textContent.match(/\((\d+)\)/);
                const modalCurrentCount = modalCountMatch ? parseInt(modalCountMatch[1]) : 0;
                modalShareBtn.innerHTML = `<i class="fas fa-share"></i> Share (${modalCurrentCount + 1})`;
            }
        }
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
window.openArticleDetailPage = openArticleDetailPage;
window.handleLike = handleLike;
window.handleShare = handleShare;
window.handleDetailSubmitComment = handleDetailSubmitComment;

// Initialize the application
if (!window.location.search.includes('article=')) {
    setupEventListeners();
    loadArticles();
}