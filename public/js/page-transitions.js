/**
 * Page Transition System
 * Provides smooth transitions between pages
 */

class PageTransitions {
  constructor() {
    this.isTransitioning = false;
    this.transitionDuration = 300;
    this.init();
  }

  init() {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return; // Skip transitions if user prefers reduced motion
    }

    this.attachListeners();
  }

  attachListeners() {
    // Intercept link clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Only handle internal links
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      // Check if it's an external link
      if (href.startsWith('http') && !href.includes(window.location.hostname)) {
        return;
      }

      // Check if it's a download link
      if (link.hasAttribute('download')) {
        return;
      }

      // Check if it opens in new tab
      if (link.getAttribute('target') === '_blank') {
        return;
      }

      e.preventDefault();
      this.start(href);
    });

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      // Page will reload naturally, but we can add fade-in
      this.fadeIn();
    });
  }

  start(url) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Fade out current page
    this.fadeOut(() => {
      // Navigate to new page
      window.location.href = url;
    });
  }

  fadeOut(callback) {
    const body = document.body;
    body.style.transition = `opacity ${this.transitionDuration}ms ease-out`;
    body.style.opacity = '0';

    setTimeout(() => {
      if (callback) callback();
    }, this.transitionDuration);
  }

  fadeIn() {
    const body = document.body;
    body.style.opacity = '0';
    body.style.transition = `opacity ${this.transitionDuration}ms ease-in`;

    // Trigger reflow
    void body.offsetHeight;

    requestAnimationFrame(() => {
      body.style.opacity = '1';
      
      setTimeout(() => {
        body.style.transition = '';
        this.isTransitioning = false;
      }, this.transitionDuration);
    });
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.pageTransitions = new PageTransitions();
    });
  } else {
    window.pageTransitions = new PageTransitions();
  }
}


















