/**
 * Shared Navigation Component
 * Provides consistent navigation across all pages
 */

class SharedNavigation {
  constructor(options = {}) {
    this.currentPage = options.currentPage || '';
    this.isAuthenticated = options.isAuthenticated || false;
    this.showStudio = options.showStudio !== false; // Default true
    this.mobileMenuOpen = false;
    this.init();
  }

  init() {
    this.detectCurrentPage();
    this.checkAuthStatus();
    this.render();
    this.attachEventListeners();
  }

  detectCurrentPage() {
    if (!this.currentPage) {
      const path = window.location.pathname;
      const filename = path.split('/').pop() || 'index.html';
      
      const pageMap = {
        'index.html': 'home',
        'about.html': 'about',
        'what-this-is.html': 'what-this-is',
        'guide.html': 'guide',
        'dameris.html': 'dameris',
        'architecture.html': 'architecture',
        'workspace.html': 'studio',
        'empty-state.html': 'studio'
      };
      
      // Check if we're in initialization directory
      if (path.includes('/initialization/') || filename === '') {
        this.currentPage = 'initialize';
      }
      
      this.currentPage = pageMap[filename] || 'home';
    }
  }

  async checkAuthStatus() {
    try {
      const response = await fetch('/api/auth');
      const data = await response.json();
      this.isAuthenticated = !!data.user;
    } catch (error) {
      this.isAuthenticated = false;
    }
  }

  getNavLinks() {
    // Determine base path based on current location
    const path = window.location.pathname;
    let basePath = '';
    
    if (path.includes('/studio/')) {
      basePath = '../';
    } else if (path.includes('/initialization/')) {
      basePath = '../';
    } else if (path.includes('/modes/')) {
      basePath = '../';
    }
    
    const links = [
      { id: 'about', label: 'About', href: `${basePath}about.html` },
      { id: 'what-this-is', label: 'What This Is', href: `${basePath}what-this-is.html` },
      { id: 'guide', label: 'How It Works', href: `${basePath}guide.html` }
    ];

    // For initialization page, don't show studio link
    if (this.showStudio && this.currentPage !== 'initialize') {
      links.push({ id: 'studio', label: 'Studio', href: `${basePath}studio/workspace.html` });
    }

    return links;
  }

  render() {
    const navContainer = document.getElementById('shared-nav-container') || document.body;
    const existingNav = document.getElementById('shared-nav');
    
    if (existingNav) {
      existingNav.remove();
    }

    const nav = document.createElement('nav');
    nav.id = 'shared-nav';
    nav.className = 'shared-nav';
    nav.innerHTML = this.getNavHTML();

    // Insert at the beginning of body or specified container
    if (navContainer === document.body) {
      document.body.insertBefore(nav, document.body.firstChild);
    } else {
      navContainer.insertBefore(nav, navContainer.firstChild);
    }

    // Add mobile menu overlay
    const overlay = document.createElement('div');
    overlay.className = 'shared-nav-mobile-menu-overlay';
    overlay.id = 'nav-mobile-overlay';
    overlay.addEventListener('click', () => this.closeMobileMenu());
    document.body.appendChild(overlay);

    // Refresh icons
    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 100);
    }
  }

  getNavHTML() {
    const links = this.getNavLinks();
    const isHome = this.currentPage === 'home';
    const isInitialize = this.currentPage === 'initialize';
    
    // Determine base path for logo
    const path = window.location.pathname;
    let basePath = '';
    if (path.includes('/studio/') || path.includes('/initialization/') || path.includes('/modes/')) {
      basePath = '../';
    }
    const logoHref = isHome ? '#' : `${basePath}index.html`;
    
    // For initialization page, use minimal nav
    if (isInitialize) {
      return `
        <div class="shared-nav-container">
          <a href="${logoHref}" class="shared-nav-logo">
            <span>FugueState.ai</span>
          </a>
        </div>
      `;
    }

      return `
        <div class="shared-nav-container">
          <a href="${logoHref}" class="shared-nav-logo">
            <span>FugueState.ai</span>
          </a>
          
          <ul class="shared-nav-links">
            ${links.map(link => `
              <li>
                <a href="${link.href}" 
                   class="shared-nav-link ${this.currentPage === link.id ? 'active' : ''}"
                   data-page="${link.id}">
                  ${link.label}
                </a>
              </li>
            `).join('')}
          </ul>

          <button class="shared-nav-mobile-toggle" id="nav-mobile-toggle" aria-label="Toggle menu">
            <i data-lucide="menu" class="w-6 h-6"></i>
          </button>
        </div>

        <div class="shared-nav-mobile-menu" id="nav-mobile-menu">
          <div class="flex items-center justify-between mb-6">
            <span class="text-lg font-semibold text-zinc-200">Menu</span>
            <button class="text-zinc-400 hover:text-zinc-200" id="nav-mobile-close" aria-label="Close menu">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          <ul class="shared-nav-mobile-links">
            ${links.map(link => `
              <li>
                <a href="${link.href}" 
                   class="shared-nav-mobile-link ${this.currentPage === link.id ? 'active' : ''}"
                   data-page="${link.id}">
                  ${link.label}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
  }

  attachEventListeners() {
    // Mobile menu toggle
    const toggle = document.getElementById('nav-mobile-toggle');
    const close = document.getElementById('nav-mobile-close');
    const overlay = document.getElementById('nav-mobile-overlay');

    if (toggle) {
      toggle.addEventListener('click', () => this.toggleMobileMenu());
    }

    if (close) {
      close.addEventListener('click', () => this.closeMobileMenu());
    }

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.mobileMenuOpen) {
        this.closeMobileMenu();
      }
    });

    // Handle navigation clicks (for page transitions if implemented)
    const navLinks = document.querySelectorAll('.shared-nav-link, .shared-nav-mobile-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        // Close mobile menu if open
        if (this.mobileMenuOpen) {
          this.closeMobileMenu();
        }
        // Page transition will be handled by page-transitions.js if loaded
      });
    });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    const menu = document.getElementById('nav-mobile-menu');
    const overlay = document.getElementById('nav-mobile-overlay');
    
    if (menu && overlay) {
      if (this.mobileMenuOpen) {
        menu.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      } else {
        menu.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    }

    // Refresh icons
    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 100);
    }
  }

  closeMobileMenu() {
    if (this.mobileMenuOpen) {
      this.mobileMenuOpen = false;
      const menu = document.getElementById('nav-mobile-menu');
      const overlay = document.getElementById('nav-mobile-overlay');
      
      if (menu && overlay) {
        menu.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
  }
}

// Auto-initialize if script is loaded
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.sharedNav = new SharedNavigation();
    });
  } else {
    window.sharedNav = new SharedNavigation();
  }
}


















