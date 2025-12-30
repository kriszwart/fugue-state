/**
 * Onboarding Tooltips System
 * Contextual tooltips for first-time studio visitors
 */

class OnboardingTooltips {
  constructor() {
    this.tooltips = [
      {
        id: 'chat-sidebar',
        selector: '#chat-sidebar, .chat-sidebar, [data-chat-sidebar]',
        title: 'Chat with Dameris',
        description: 'Chat with Dameris here. Ask questions, explore memories, get insights.',
        position: 'right'
      },
      {
        id: 'memory-visualization',
        selector: '#memory-canvas, .memory-canvas, [data-memory-canvas]',
        title: 'Memory Visualization',
        description: 'Your memories appear here. Click to explore patterns and connections.',
        position: 'center'
      },
      {
        id: 'pattern-detection',
        selector: '#pattern-detection, .pattern-detection, [data-patterns]',
        title: 'Pattern Detection',
        description: 'AI analyzes your memories to find hidden patterns and themes.',
        position: 'bottom'
      },
      {
        id: 'creative-generation',
        selector: '#creative-gen, .creative-gen, [data-creative]',
        title: 'Creative Generation',
        description: 'Generate visual artifacts from your memories or prompts.',
        position: 'top'
      }
    ];
    this.currentTooltipIndex = 0;
    this.overlay = null;
    this.init();
  }

  init() {
    // Check if tooltips should be shown
    const tooltipsSeen = localStorage.getItem('fuguestate_tooltips_seen') === 'true';
    const firstVisit = localStorage.getItem('fuguestate_first_studio_visit');
    
    if (tooltipsSeen || !firstVisit) {
      return; // Don't show if already seen or not first visit
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      setTimeout(() => this.start(), 500); // Small delay to ensure elements are rendered
    }
  }

  start() {
    this.createOverlay();
    this.showTooltip(0);
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'onboarding-overlay';
    this.overlay.className = 'fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm transition-opacity';
    document.body.appendChild(this.overlay);
  }

  showTooltip(index) {
    if (index >= this.tooltips.length) {
      this.complete();
      return;
    }

    const tooltipData = this.tooltips[index];
    const element = document.querySelector(tooltipData.selector);

    if (!element) {
      // Element not found, skip to next
      this.showTooltip(index + 1);
      return;
    }

    // Highlight element
    const rect = element.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.id = 'onboarding-highlight';
    highlight.className = 'fixed z-[9999] border-2 border-indigo-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.8)] transition-all';
    highlight.style.left = `${rect.left - 4}px`;
    highlight.style.top = `${rect.top - 4}px`;
    highlight.style.width = `${rect.width + 8}px`;
    highlight.style.height = `${rect.height + 8}px`;
    document.body.appendChild(highlight);

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'onboarding-tooltip';
    tooltip.className = 'fixed z-[10000] max-w-sm bg-zinc-900 border border-indigo-500/30 rounded-xl p-4 shadow-xl';
    
    let tooltipLeft = rect.left + (rect.width / 2) - 150;
    let tooltipTop = rect.top - 120;

    // Adjust position based on tooltipData.position
    if (tooltipData.position === 'right') {
      tooltipLeft = rect.right + 20;
      tooltipTop = rect.top;
    } else if (tooltipData.position === 'left') {
      tooltipLeft = rect.left - 320;
      tooltipTop = rect.top;
    } else if (tooltipData.position === 'bottom') {
      tooltipLeft = rect.left + (rect.width / 2) - 150;
      tooltipTop = rect.bottom + 20;
    } else if (tooltipData.position === 'top') {
      tooltipLeft = rect.left + (rect.width / 2) - 150;
      tooltipTop = rect.top - 120;
    }

    // Keep tooltip in viewport
    if (tooltipLeft < 20) tooltipLeft = 20;
    if (tooltipLeft + 300 > window.innerWidth - 20) {
      tooltipLeft = window.innerWidth - 320;
    }
    if (tooltipTop < 20) tooltipTop = rect.bottom + 20;

    tooltip.style.left = `${tooltipLeft}px`;
    tooltip.style.top = `${tooltipTop}px`;

    tooltip.innerHTML = `
      <h3 class="text-lg font-semibold text-zinc-200 mb-2">${tooltipData.title}</h3>
      <p class="text-sm text-zinc-400 mb-4">${tooltipData.description}</p>
      <div class="flex items-center justify-between gap-2">
        <button onclick="window.onboardingTooltips.skipAll()" class="text-xs text-zinc-500 hover:text-zinc-400 transition-colors">
          Skip all
        </button>
        <div class="flex items-center gap-2">
          ${index > 0 ? '<button onclick="window.onboardingTooltips.previous()" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors">Previous</button>' : ''}
          <button onclick="window.onboardingTooltips.next()" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm text-white transition-colors">
            ${index === this.tooltips.length - 1 ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
      <div class="mt-3 flex items-center justify-center gap-1">
        ${this.tooltips.map((_, i) => `<div class="w-1.5 h-1.5 rounded-full ${i === index ? 'bg-indigo-500' : 'bg-zinc-700'}"></div>`).join('')}
      </div>
    `;

    document.body.appendChild(tooltip);
    this.currentTooltipIndex = index;

    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  next() {
    this.removeCurrentTooltip();
    this.showTooltip(this.currentTooltipIndex + 1);
  }

  previous() {
    this.removeCurrentTooltip();
    this.showTooltip(this.currentTooltipIndex - 1);
  }

  skipAll() {
    this.complete();
  }

  removeCurrentTooltip() {
    const tooltip = document.getElementById('onboarding-tooltip');
    const highlight = document.getElementById('onboarding-highlight');
    if (tooltip) tooltip.remove();
    if (highlight) highlight.remove();
  }

  complete() {
    this.removeCurrentTooltip();
    if (this.overlay) {
      this.overlay.remove();
    }
    localStorage.setItem('fuguestate_tooltips_seen', 'true');
  }

  replay() {
    localStorage.removeItem('fuguestate_tooltips_seen');
    this.currentTooltipIndex = 0;
    this.start();
  }
}

// Initialize
window.onboardingTooltips = new OnboardingTooltips();



















