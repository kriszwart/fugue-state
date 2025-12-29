'use client';

import { useEffect } from 'react';

/**
 * KeyboardNavigation component
 * Enhances keyboard navigation and focus management across the application
 */
export default function KeyboardNavigation() {
  useEffect(() => {
    // Handle Escape key to close modals and clear focus
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close mobile sidebars
        const chatSidebar = document.getElementById('chat-sidebar');
        const navSidebar = document.getElementById('navigation-sidebar');
        if (chatSidebar && chatSidebar.classList.contains('translate-x-0')) {
          chatSidebar.classList.remove('translate-x-0');
          const toggle = document.getElementById('mobile-chat-toggle');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
        }
        if (navSidebar && navSidebar.classList.contains('translate-x-0')) {
          navSidebar.classList.remove('translate-x-0');
          const toggle = document.getElementById('mobile-menu-toggle');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
        }
        
        const modals = document.querySelectorAll('[role="dialog"], .modal, [data-modal]');
        modals.forEach((modal) => {
          if (!modal.classList.contains('hidden') && (modal as HTMLElement).style.display !== 'none') {
            const closeBtn = modal.querySelector('[data-close-modal], .close-modal') as HTMLElement;
            if (closeBtn) {
              closeBtn.click();
            }
          }
        });

        // Clear focus from search inputs
        const activeInput = document.activeElement as HTMLElement;
        if (activeInput && activeInput.tagName === 'INPUT' && activeInput.type === 'search') {
          activeInput.blur();
        }
      }
    };

    // Handle / key to focus chat input
    const handleChatFocus = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input/textarea
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        const chatInput = document.getElementById('dameris-input') as HTMLInputElement;
        if (chatInput) {
          chatInput.focus();
        }
      }
    };

    // Handle Cmd/Ctrl + / for keyboard shortcuts help
    const handleHelpShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        // Show keyboard shortcuts help (can be implemented as a modal or tooltip)
        const shortcuts = [
          '/ - Focus chat input',
          'Esc - Close modals/sidebars',
          'Cmd/Ctrl + K - Search',
          'Cmd/Ctrl + / - Show this help'
        ];
        alert(`Keyboard Shortcuts:\n\n${shortcuts.join('\n')}`);
      }
    };

    // Handle Cmd/Ctrl + K for search focus
    const handleSearchShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector(
          'input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        } else {
          // Fallback to chat input if no search input
          const chatInput = document.getElementById('dameris-input') as HTMLInputElement;
          if (chatInput) {
            chatInput.focus();
          }
        }
      }
    };

    // Handle Enter key on buttons
    const handleEnterKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && document.activeElement?.tagName === 'BUTTON') {
        const button = document.activeElement as HTMLButtonElement;
        if (button.disabled) {
          e.preventDefault();
        }
      }
    };

    // Trap focus in modals
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const modal = document.querySelector('[role="dialog"]:not(.hidden), .modal:not(.hidden)');
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleChatFocus);
    document.addEventListener('keydown', handleHelpShortcut);
    document.addEventListener('keydown', handleSearchShortcut);
    document.addEventListener('keydown', handleEnterKey);
    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleChatFocus);
      document.removeEventListener('keydown', handleHelpShortcut);
      document.removeEventListener('keydown', handleSearchShortcut);
      document.removeEventListener('keydown', handleEnterKey);
      document.removeEventListener('keydown', handleTabKey);
    };
  }, []);

  return null;
}










