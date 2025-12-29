/**
 * Toast Notification System
 * Provides consistent, accessible toast notifications across the application
 */

class ToastNotifications {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.maxToasts = 3;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    show(message, type = 'info', duration = 3000) {
        // Remove oldest toast if at max capacity
        if (this.toasts.length >= this.maxToasts) {
            this.remove(this.toasts[0]);
        }

        const toast = document.createElement('div');
        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        toast.id = toastId;
        
        // Base classes
        const baseClasses = 'px-4 py-3 rounded-lg text-sm font-medium shadow-lg backdrop-blur-md border transition-all duration-300 pointer-events-auto flex items-center gap-3 min-w-[280px] max-w-[400px] animate-slide-in-right';
        
        // Type-specific styling
        const typeClasses = {
            success: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200',
            error: 'bg-red-500/20 border-red-500/50 text-red-200',
            warning: 'bg-amber-500/20 border-amber-500/50 text-amber-200',
            info: 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200'
        };

        toast.className = `${baseClasses} ${typeClasses[type] || typeClasses.info}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        // Icon based on type
        const icons = {
            success: '<i data-lucide="check-circle" class="w-5 h-5 flex-shrink-0"></i>',
            error: '<i data-lucide="alert-circle" class="w-5 h-5 flex-shrink-0"></i>',
            warning: '<i data-lucide="alert-triangle" class="w-5 h-5 flex-shrink-0"></i>',
            info: '<i data-lucide="info" class="w-5 h-5 flex-shrink-0"></i>'
        };

        toast.innerHTML = `
            ${icons[type] || icons.info}
            <span class="flex-1">${message}</span>
            <button onclick="window.toastNotifications.remove('${toastId}')" class="text-current opacity-60 hover:opacity-100 transition-opacity" aria-label="Close notification">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        `;

        this.container.appendChild(toast);
        this.toasts.push(toastId);

        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toastId);
            }, duration);
        }

        return toastId;
    }

    /**
     * Remove a toast notification
     */
    remove(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                toast.remove();
                this.toasts = this.toasts.filter(id => id !== toastId);
            }, 300);
        }
    }

    /**
     * Clear all toasts
     */
    clear() {
        this.toasts.forEach(id => this.remove(id));
    }

    // Convenience methods
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration || 5000);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// Initialize global instance
window.toastNotifications = new ToastNotifications();

// Add CSS animation if not already present
if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
        @keyframes slide-in-right {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        .animate-slide-in-right {
            animation: slide-in-right 0.3s ease-out;
        }
    `;
    document.head.appendChild(style);
}























