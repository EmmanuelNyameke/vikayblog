// Update current date in policy
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentDate();
    setupPolicyNavigation();
});

// Update current date in policy pages
function updateCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Setup smooth navigation for policy pages
function setupPolicyNavigation() {
    // Smooth scroll for anchor links within policy pages
    document.querySelectorAll('.policy-section a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Add active state to footer links
function highlightActiveFooterLink() {
    const currentPage = window.location.pathname.split('/').pop();
    const footerLinks = document.querySelectorAll('.footer-link');
    
    footerLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', highlightActiveFooterLink);