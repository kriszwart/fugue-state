/**
 * Breadcrumb Component
 * Provides navigation breadcrumbs for wayfinding
 */

class Breadcrumbs {
  constructor(options = {}) {
    this.items = options.items || [];
    this.containerId = options.containerId || 'breadcrumbs-container';
    this.init();
  }

  init() {
    this.detectBreadcrumbs();
    this.render();
  }

  detectBreadcrumbs() {
    if (this.items.length === 0) {
      const path = window.location.pathname;
      const filename = path.split('/').pop() || 'index.html';
      
      // Determine base path
      let basePath = '';
      if (path.includes('/studio/')) {
        basePath = '../';
      } else if (path.includes('/initialization/')) {
        basePath = '../';
      } else if (path.includes('/modes/')) {
        basePath = '../';
      }
      
      // Default breadcrumb structure
      const breadcrumbMap = {
        'index.html': [{ label: 'Home', href: `${basePath}index.html` }],
        'about.html': [
          { label: 'Home', href: `${basePath}index.html` },
          { label: 'About', href: `${basePath}about.html` }
        ],
        'what-this-is.html': [
          { label: 'Home', href: `${basePath}index.html` },
          { label: 'What This Is', href: `${basePath}what-this-is.html` }
        ],
        'guide.html': [
          { label: 'Home', href: `${basePath}index.html` },
          { label: 'How It Works', href: `${basePath}guide.html` }
        ],
        'dameris.html': [
          { label: 'Home', href: `${basePath}index.html` },
          { label: 'Dameris', href: `${basePath}dameris.html` }
        ],
        'architecture.html': [
          { label: 'Home', href: `${basePath}index.html` },
          { label: 'Architecture', href: `${basePath}architecture.html` }
        ],
        'workspace.html': [
          { label: 'Home', href: `${basePath}index.html` },
          { label: 'Studio', href: `${basePath}studio/workspace.html` },
          { label: 'Workspace', href: `${basePath}studio/workspace.html` }
        ],
        'empty-state.html': [
          { label: 'Home', href: `${basePath}index.html` },
          { label: 'Studio', href: `${basePath}studio/workspace.html` },
          { label: 'Getting Started', href: `${basePath}studio/empty-state.html` }
        ]
      };

      this.items = breadcrumbMap[filename] || [{ label: 'Home', href: `${basePath}index.html` }];
    }
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      // Create container if it doesn't exist
      const main = document.querySelector('main');
      if (main) {
        const breadcrumbContainer = document.createElement('div');
        breadcrumbContainer.id = this.containerId;
        breadcrumbContainer.className = 'breadcrumbs-container';
        main.insertBefore(breadcrumbContainer, main.firstChild);
        this.render();
        return;
      }
      return;
    }

    if (this.items.length <= 1) {
      // Don't show breadcrumbs if only one item (home page)
      container.style.display = 'none';
      return;
    }

    container.innerHTML = `
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol class="breadcrumbs-list">
          ${this.items.map((item, index) => `
            <li class="breadcrumbs-item">
              ${index < this.items.length - 1 ? `
                <a href="${item.href}" class="breadcrumbs-link">${item.label}</a>
                <span class="breadcrumbs-separator" aria-hidden="true">/</span>
              ` : `
                <span class="breadcrumbs-current" aria-current="page">${item.label}</span>
              `}
            </li>
          `).join('')}
        </ol>
      </nav>
    `;
  }
}

// Auto-initialize if script is loaded
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.breadcrumbs = new Breadcrumbs();
    });
  } else {
    window.breadcrumbs = new Breadcrumbs();
  }
}




















