/**
 * UX Enhancements
 * Provides consistent UX improvements across the application:
 * - Keyboard navigation
 * - Focus management
 * - Form validation
 * - Loading states
 * - Smooth transitions
 */

class UXEnhancements {
    constructor() {
        this.init();
    }

    init() {
        // Add keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Improve focus management
        this.setupFocusManagement();
        
        // Add form validation enhancements
        this.setupFormValidation();
        
        // Add loading state helpers
        this.setupLoadingStates();
        
        // Add smooth scroll behavior
        this.setupSmoothScrolling();
        
        // Add focus-visible polyfill for better keyboard navigation
        this.setupFocusVisible();
    }

    /**
     * Keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape key - close modals, clear focus
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('[role="dialog"], .modal, [data-modal]');
                modals.forEach(modal => {
                    if (!modal.classList.contains('hidden') && modal.style.display !== 'none') {
                        const closeBtn = modal.querySelector('[data-close-modal], .close-modal');
                        if (closeBtn) {
                            closeBtn.click();
                        }
                    }
                });
                
                // Clear any active search/filter inputs
                const activeInput = document.activeElement;
                if (activeInput && activeInput.tagName === 'INPUT' && activeInput.type === 'search') {
                    activeInput.blur();
                }
            }

            // Cmd/Ctrl + K - Focus search (if available)
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }

            // Enter key on buttons - ensure proper behavior
            if (e.key === 'Enter' && document.activeElement.tagName === 'BUTTON') {
                const button = document.activeElement;
                if (button.disabled) {
                    e.preventDefault();
                }
            }
        });
    }

    /**
     * Focus management
     */
    setupFocusManagement() {
        // Trap focus in modals
        document.addEventListener('keydown', (e) => {
            const modal = document.querySelector('[role="dialog"]:not(.hidden), .modal:not(.hidden)');
            if (!modal || e.key !== 'Tab') return;

            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

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
        });

        // Improve focus visibility
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('button, a, input, select, textarea, [tabindex]')) {
                e.target.classList.add('focus-visible');
            }
        });

        document.addEventListener('focusout', (e) => {
            e.target.classList.remove('focus-visible');
        });
    }

    /**
     * Form validation enhancements
     */
    setupFormValidation() {
        // Add real-time validation to inputs
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[required], textarea[required], select[required]')) {
                this.validateField(e.target);
            }
        });

        // Validate on blur
        document.addEventListener('blur', (e) => {
            if (e.target.matches('input[required], textarea[required], select[required]')) {
                this.validateField(e.target);
            }
        }, true);
    }

    validateField(field) {
        const isValid = field.checkValidity();
        const container = field.closest('.form-group, div') || field.parentElement;
        
        // Remove existing validation classes
        field.classList.remove('border-red-500/50', 'border-emerald-500/50');
        container?.classList.remove('has-error', 'has-success');
        
        // Remove existing error message
        const existingError = container?.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        if (field.value.trim() === '' && field.hasAttribute('required')) {
            field.classList.add('border-red-500/50');
            container?.classList.add('has-error');
            
            if (!existingError) {
                const errorMsg = document.createElement('span');
                errorMsg.className = 'field-error text-xs text-red-400 mt-1 block';
                errorMsg.textContent = 'This field is required';
                container?.appendChild(errorMsg);
            }
            return false;
        } else if (field.value.trim() !== '') {
            field.classList.add('border-emerald-500/50');
            container?.classList.add('has-success');
        }

        return isValid;
    }

    /**
     * Loading state helpers
     */
    setupLoadingStates() {
        // Add loading state to buttons during async operations
        window.setButtonLoading = (button, isLoading, loadingText = 'Loading...') => {
            if (!button) return;
            
            if (isLoading) {
                button.dataset.originalText = button.textContent || button.innerHTML;
                button.disabled = true;
                button.innerHTML = `
                    <span class="flex items-center gap-2">
                        <span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                        ${loadingText}
                    </span>
                `;
                button.classList.add('opacity-75', 'cursor-not-allowed');
            } else {
                button.disabled = false;
                button.innerHTML = button.dataset.originalText || button.textContent;
                button.classList.remove('opacity-75', 'cursor-not-allowed');
                delete button.dataset.originalText;
            }
        };
    }

    /**
     * Smooth scrolling
     */
    setupSmoothScrolling() {
        // Add smooth scroll to anchor links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (link && link.getAttribute('href') !== '#') {
                const targetId = link.getAttribute('href').substring(1);
                const target = document.getElementById(targetId);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    }

    /**
     * Focus-visible polyfill
     */
    setupFocusVisible() {
        // Add focus-visible class for keyboard navigation
        let hadKeyboardEvent = false;
        
        document.addEventListener('keydown', () => {
            hadKeyboardEvent = true;
        }, true);
        
        document.addEventListener('mousedown', () => {
            hadKeyboardEvent = false;
        }, true);
        
        document.addEventListener('focusin', (e) => {
            if (hadKeyboardEvent) {
                e.target.classList.add('focus-visible');
            }
        }, true);
        
        document.addEventListener('focusout', (e) => {
            e.target.classList.remove('focus-visible');
        }, true);
    }

    /**
     * Show loading overlay
     */
    showLoadingOverlay(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center';
        overlay.innerHTML = `
            <div class="text-center">
                <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p class="text-zinc-300 text-sm">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
    }
}

// Initialize UX enhancements
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.uxEnhancements = new UXEnhancements();
    });
} else {
    window.uxEnhancements = new UXEnhancements();
}

// Add CSS for focus-visible
if (!document.getElementById('focus-visible-styles')) {
    const style = document.createElement('style');
    style.id = 'focus-visible-styles';
    style.textContent = `
        .focus-visible {
            outline: 2px solid rgba(99, 102, 241, 0.6);
            outline-offset: 2px;
        }
        .focus-visible:focus {
            outline: 2px solid rgba(99, 102, 241, 0.8);
        }
    `;
    document.head.appendChild(style);
}
























