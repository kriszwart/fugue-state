/**
 * Shared Footer Component
 * Provides consistent footer across all pages
 */

class SharedFooter {
  constructor(options = {}) {
    this.showLinks = options.showLinks !== false; // Default true
    this.init();
  }

  init() {
    this.render();
  }

  render() {
    const footerContainer = document.getElementById('shared-footer-container');
    if (!footerContainer) {
      // Create container if it doesn't exist
      const body = document.body;
      const footerDiv = document.createElement('footer');
      footerDiv.id = 'shared-footer-container';
      footerDiv.className = 'shared-footer-container';
      body.appendChild(footerDiv);
      this.render();
      return;
    }

    footerContainer.innerHTML = this.getFooterHTML();

    // Refresh icons if lucide is available
    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 100);
    }
  }

  getFooterHTML() {
    const currentYear = new Date().getFullYear();
    
    // Determine base path
    const path = window.location.pathname;
    let basePath = '';
    if (path.includes('/studio/')) {
      basePath = '../';
    } else if (path.includes('/initialization/')) {
      basePath = '../';
    } else if (path.includes('/modes/')) {
      basePath = '../';
    }
    
    return `
      <footer class="shared-footer">
        <div class="shared-footer-content">
          ${this.showLinks ? `
            <nav class="shared-footer-nav" aria-label="Footer navigation">
              <a href="${basePath}about.html" class="shared-footer-link">About</a>
              <span class="shared-footer-separator">•</span>
              <a href="${basePath}what-this-is.html" class="shared-footer-link">What This Is</a>
              <span class="shared-footer-separator">•</span>
              <a href="${basePath}guide.html" class="shared-footer-link">How It Works</a>
              <span class="shared-footer-separator">•</span>
              <a href="${basePath}studio/workspace.html" class="shared-footer-link">Studio</a>
            </nav>
          ` : ''}
          <div class="shared-footer-meta">
            <p class="shared-footer-tagline">Built on the science of memory</p>
            <p class="shared-footer-copyright">&copy; ${currentYear} FugueState.ai</p>
          </div>
        </div>
      </footer>
    `;
  }
}

// Auto-initialize if script is loaded
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.sharedFooter = new SharedFooter();
    });
  } else {
    window.sharedFooter = new SharedFooter();
  }
}




















