/**
 * Contextual Help System
 * Provides context-aware help based on current page/section
 */

class ContextualHelp {
  constructor() {
    this.helpContent = {
      workspace: {
        title: 'Workspace Help',
        sections: [
          {
            title: 'Chat with Dameris',
            content: 'Use the chat sidebar to interact with your AI muse. Ask questions about your memories, explore patterns, or get creative suggestions.',
            icon: 'message-circle'
          },
          {
            title: 'Memory Visualization',
            content: 'Your imported memories appear in the center canvas. Click any memory to explore its connections and patterns.',
            icon: 'brain'
          },
          {
            title: 'Pattern Detection',
            content: 'AI automatically analyzes your memories to find recurring themes, emotional patterns, and hidden connections.',
            icon: 'network'
          },
          {
            title: 'Creative Generation',
            content: 'Generate visual artifacts from your memories or prompts. Each generation is saved to your gallery.',
            icon: 'palette'
          }
        ],
        links: [
          { text: 'Getting Started Guide', url: '../guide.html' },
          { text: 'What This Is', url: '../what-this-is.html' }
        ]
      },
      initialization: {
        title: 'Initialization Help',
        sections: [
          {
            title: 'Connect Data Sources',
            content: 'Choose which services to connect. Gmail and Notion are most popular. Advanced options include local files and custom integrations.',
            icon: 'link'
          },
          {
            title: 'Choose Your Muse',
            content: 'Select how Dameris interprets your memories. Each Muse has a different personality and output style. Hover over cards for details.',
            icon: 'sparkles'
          },
          {
            title: 'First Scan',
            content: 'After setup, FugueState will analyze your connected sources and import your first memories.',
            icon: 'fingerprint'
          }
        ],
        links: [
          { text: 'About FugueState', url: '../about.html' },
          { text: 'Privacy & Security', url: '../studio/privacy.html' }
        ]
      },
      chat: {
        title: 'Chat Help',
        sections: [
          {
            title: 'Conversing with Dameris',
            content: 'Dameris learns from your memories. Ask questions, explore ideas, or request creative interpretations.',
            icon: 'message-circle'
          },
          {
            title: 'Voice Narration',
            content: 'Enable voice narration to hear Dameris speak. You can adjust voice settings in preferences.',
            icon: 'mic-2'
          }
        ],
        links: [
          { text: 'Learn More About Dameris', url: '../dameris.html' }
        ]
      }
    };
    this.init();
  }

  init() {
    this.detectContext();
    this.createHelpButton();
    this.trackHelpUsage();
  }

  detectContext() {
    const path = window.location.pathname;
    
    if (path.includes('workspace')) {
      this.currentContext = 'workspace';
    } else if (path.includes('initialization')) {
      this.currentContext = 'initialization';
    } else if (path.includes('chat')) {
      this.currentContext = 'chat';
    } else {
      this.currentContext = 'workspace'; // Default
    }
  }

  createHelpButton() {
    // Check if help button already exists
    if (document.getElementById('contextual-help-btn')) {
      return;
    }

    const helpBtn = document.createElement('button');
    helpBtn.id = 'contextual-help-btn';
    helpBtn.className = 'fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-zinc-900 border border-white/10 hover:border-indigo-500/50 flex items-center justify-center text-zinc-400 hover:text-indigo-400 transition-all shadow-lg hover:shadow-xl hover:scale-110';
    helpBtn.innerHTML = '<i data-lucide="help-circle" class="w-6 h-6"></i>';
    helpBtn.onclick = () => this.showHelp();
    helpBtn.title = 'Get Help';

    document.body.appendChild(helpBtn);

    // Refresh icons
    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 100);
    }
  }

  showHelp() {
    const content = this.helpContent[this.currentContext] || this.helpContent.workspace;
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'help-overlay';
    overlay.className = 'fixed inset-0 z-[10002] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4';
    overlay.onclick = (e) => {
      if (e.target === overlay) this.closeHelp();
    };

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl';
    modal.onclick = (e) => e.stopPropagation();

    const sectionsHTML = content.sections.map(section => `
      <div class="p-4 rounded-lg bg-zinc-950/50 border border-white/5 mb-4">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <i data-lucide="${section.icon}" class="w-5 h-5 text-indigo-400"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-zinc-200 mb-1">${section.title}</h3>
            <p class="text-xs text-zinc-400 leading-relaxed">${section.content}</p>
          </div>
        </div>
      </div>
    `).join('');

    const linksHTML = content.links.map(link => `
      <a href="${link.url}" class="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors">
        ${link.text}
      </a>
    `).join('');

    modal.innerHTML = `
      <div class="flex items-start justify-between mb-6">
        <div>
          <h2 class="text-2xl font-semibold text-zinc-200 mb-1">${content.title}</h2>
          <p class="text-sm text-zinc-400">Contextual help for this page</p>
        </div>
        <button onclick="window.contextualHelp.closeHelp()" class="text-zinc-500 hover:text-zinc-400 transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="space-y-4 mb-6">
        ${sectionsHTML}
      </div>

      ${content.links.length > 0 ? `
      <div class="pt-4 border-t border-white/5">
        <h3 class="text-sm font-semibold text-zinc-300 mb-3">Related Resources</h3>
        <div class="flex flex-wrap gap-2">
          ${linksHTML}
        </div>
      </div>
      ` : ''}

      <div class="mt-6 pt-4 border-t border-white/5">
        <div class="flex items-center justify-between">
          <button onclick="window.contextualHelp.replayTooltips()" class="text-xs text-zinc-500 hover:text-zinc-400 transition-colors">
            Replay Tooltips
          </button>
          <button onclick="window.contextualHelp.replayTour()" class="text-xs text-zinc-500 hover:text-zinc-400 transition-colors">
            Take Tour Again
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Refresh icons
    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 100);
    }

    // Track help view
    this.trackHelpView(this.currentContext);
  }

  closeHelp() {
    const overlay = document.getElementById('help-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  replayTooltips() {
    this.closeHelp();
    if (window.onboardingTooltips) {
      window.onboardingTooltips.replay();
    }
  }

  replayTour() {
    this.closeHelp();
    if (window.welcomeTour) {
      window.welcomeTour.replay();
    }
  }

  trackHelpUsage() {
    // Track which help topics have been viewed
    const viewed = JSON.parse(localStorage.getItem('fuguestate_help_topics_viewed') || '[]');
    // Could be used to show "New" badges on help icon
  }

  trackHelpView(context) {
    const viewed = JSON.parse(localStorage.getItem('fuguestate_help_topics_viewed') || '[]');
    if (!viewed.includes(context)) {
      viewed.push(context);
      localStorage.setItem('fuguestate_help_topics_viewed', JSON.stringify(viewed));
    }
  }
}

// Initialize
window.contextualHelp = new ContextualHelp();



















