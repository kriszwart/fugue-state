/**
 * Onboarding Progress Tracking System
 * Tracks user progress through onboarding steps
 */

class OnboardingProgress {
  constructor() {
    this.UI_IDS = {
      root: 'onboarding-progress-ui',
      pill: 'onboarding-progress-pill',
      panel: 'onboarding-progress-panel',
      bar: 'onboarding-progress-bar',
      text: 'onboarding-progress-text',
      close: 'onboarding-progress-close',
      cta: 'onboarding-progress-cta'
    };

    this.STORAGE_KEYS = {
      progress: 'fuguestate_onboarding_progress',
      snoozedUntil: 'fuguestate_onboarding_progress_snoozed_until',
      lastShownProgress: 'fuguestate_onboarding_progress_last_shown_progress'
    };

    // Default snooze duration when user dismisses the UI
    this.SNOOZE_MS = 24 * 60 * 60 * 1000; // 24 hours

    this.steps = {
      dataSourcesConnected: { completed: false, weight: 20 },
      museSelected: { completed: false, weight: 15 },
      firstMemoryImported: { completed: false, weight: 20 },
      firstChat: { completed: false, weight: 15 },
      firstPatternDetected: { completed: false, weight: 15 },
      firstArtifactGenerated: { completed: false, weight: 15 }
    };
    this.loadProgress();
    this.init();
  }

  init() {
    // Load saved progress
    this.updateDisplay();
    
    // Listen for progress events
    this.setupEventListeners();
    
    // Check current state
    this.checkCurrentState();
  }

  loadProgress() {
    const saved = localStorage.getItem(this.STORAGE_KEYS.progress);
    if (saved) {
      try {
        const progress = JSON.parse(saved);
        Object.keys(this.steps).forEach(key => {
          if (progress[key] !== undefined) {
            this.steps[key].completed = progress[key];
          }
        });
      } catch (e) {
        console.error('Error loading progress:', e);
      }
    }
  }

  saveProgress() {
    const progress = {};
    Object.keys(this.steps).forEach(key => {
      progress[key] = this.steps[key].completed;
    });
    localStorage.setItem(this.STORAGE_KEYS.progress, JSON.stringify(progress));
    this.updateDisplay();
  }

  calculateProgress() {
    let totalWeight = 0;
    let completedWeight = 0;

    Object.values(this.steps).forEach(step => {
      totalWeight += step.weight;
      if (step.completed) {
        completedWeight += step.weight;
      }
    });

    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  }

  completeStep(stepKey) {
    if (this.steps[stepKey] && !this.steps[stepKey].completed) {
      this.steps[stepKey].completed = true;
      this.saveProgress();
      this.showCompletionMessage(stepKey);
      this.nudgeProgressPill();
    }
  }

  setupEventListeners() {
    // Listen for memory import
    document.addEventListener('memoryImported', () => {
      this.completeStep('firstMemoryImported');
    });

    // Listen for chat messages
    document.addEventListener('chatMessageSent', () => {
      this.completeStep('firstChat');
    });

    // Listen for pattern detection
    document.addEventListener('patternDetected', () => {
      this.completeStep('firstPatternDetected');
    });

    // Listen for artifact generation
    document.addEventListener('artifactGenerated', () => {
      this.completeStep('firstArtifactGenerated');
    });
  }

  async checkCurrentState() {
    // Check if muse is selected
    const museSelected = localStorage.getItem('fuguestate_muse');
    if (museSelected && !this.steps.museSelected.completed) {
      this.completeStep('museSelected');
    }

    // Check current state from API
    try {
      // Check memories count
      const memoriesResponse = await fetch('/api/memories?limit=1');
      if (memoriesResponse.ok) {
        const data = await memoriesResponse.json();
        if (data.memories && data.memories.length > 0 && !this.steps.firstMemoryImported.completed) {
          this.completeStep('firstMemoryImported');
        }
      }

      // Check patterns count
      const patternsResponse = await fetch('/api/memories/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 1 })
      });
      if (patternsResponse.ok) {
        const data = await patternsResponse.json();
        if (data.analysis && !this.steps.firstPatternDetected.completed) {
          // If analysis exists, patterns have been detected
          this.completeStep('firstPatternDetected');
        }
      }

      // Check artefacts count
      const artefactsResponse = await fetch('/api/export?format=json');
      // Note: This is a proxy check - in real implementation, add a dedicated endpoint
      // For now, we'll rely on events from generation API
    } catch (error) {
      console.error('Error checking current state:', error);
    }

    // Check URL params for source count
    const urlParams = new URLSearchParams(window.location.search);
    const sourceCount = urlParams.get('sources');
    if (sourceCount && parseInt(sourceCount) > 0 && !this.steps.dataSourcesConnected.completed) {
      this.markDataSourcesConnected(parseInt(sourceCount));
    }
  }

  // Handle API response and fire events if needed
  handleAPIResponse(response, eventType) {
    if (response && response.onboardingEvent === eventType) {
      document.dispatchEvent(new CustomEvent(eventType, { 
        detail: response 
      }));
    }
  }

  updateDisplay() {
    const progress = this.calculateProgress();
    
    // Update any existing in-page progress elements (if they exist)
    const progressBar = document.getElementById(this.UI_IDS.bar);
    if (progressBar) progressBar.style.width = `${progress}%`;

    const progressText = document.getElementById(this.UI_IDS.text);
    if (progressText) progressText.textContent = `${progress}% Complete`;

    // Smart, non-blocking onboarding progress UI
    if (this.shouldRenderProgressUI(progress)) {
      this.renderProgressUI(progress);
    } else {
      this.removeProgressUI();
    }
  }

  shouldRenderProgressUI(progress) {
    // Only show when progress is incomplete (1–99%)
    if (!(progress > 0 && progress < 100)) return false;

    // Never show on initialization pages (avoid UI competing with setup flow itself)
    const path = (window.location && window.location.pathname) ? window.location.pathname : '';
    if (path.includes('/initialization')) return false;

    // Respect snooze/dismiss
    if (this.isSnoozed()) return false;

    return true;
  }

  isSnoozed() {
    const raw = localStorage.getItem(this.STORAGE_KEYS.snoozedUntil);
    if (!raw) return false;
    const until = new Date(raw).getTime();
    if (Number.isNaN(until)) return false;
    return Date.now() < until;
  }

  snooze() {
    const until = new Date(Date.now() + this.SNOOZE_MS).toISOString();
    localStorage.setItem(this.STORAGE_KEYS.snoozedUntil, until);
    this.removeProgressUI();
  }

  clearSnooze() {
    localStorage.removeItem(this.STORAGE_KEYS.snoozedUntil);
  }

  ensureProgressUI() {
    let root = document.getElementById(this.UI_IDS.root);
    if (root) return root;

    root = document.createElement('div');
    root.id = this.UI_IDS.root;
    // Bottom-left to avoid colliding with the sound widget (bottom-right)
    root.className = 'fixed bottom-6 left-6 z-50';

    root.innerHTML = `
      <style>
        #${this.UI_IDS.root} .fsop-pulse {
          animation: fsop-pulse 1.2s ease-in-out 1;
        }
        @keyframes fsop-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139,92,246,0.45); }
          40% { transform: scale(1.04); box-shadow: 0 0 0 10px rgba(139,92,246,0.0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139,92,246,0.0); }
        }
      </style>

      <!-- Collapsed pill -->
      <button
        id="${this.UI_IDS.pill}"
        class="group inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-zinc-900/90 border border-indigo-500/25 backdrop-blur-xl shadow-lg hover:shadow-xl hover:border-indigo-500/40 transition-all select-none"
        type="button"
        aria-expanded="false"
        aria-controls="${this.UI_IDS.panel}"
      >
        <span class="text-[11px] font-medium tracking-wide text-zinc-200">Setup</span>
        <span class="text-[11px] text-zinc-400">·</span>
        <span id="${this.UI_IDS.text}" class="text-[11px] font-mono text-violet-300">0% Complete</span>
      </button>

      <!-- Expanded panel -->
      <div
        id="${this.UI_IDS.panel}"
        class="hidden mt-3 w-80 max-w-[90vw] bg-zinc-900/95 border border-indigo-500/25 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl"
        role="dialog"
        aria-label="Setup Progress"
      >
        <div class="flex items-start justify-between gap-4 mb-3">
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-zinc-200 leading-tight">Setup Progress</h3>
            <p class="text-xs text-zinc-400 mt-0.5">You’re <span class="text-zinc-200 font-medium"><span data-fsop-progress></span>%</span> set up.</p>
          </div>
          <button
            id="${this.UI_IDS.close}"
            class="text-zinc-500 hover:text-zinc-300 transition-colors"
            type="button"
            title="Hide setup progress"
          >
            <span class="sr-only">Hide</span>
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
          <div id="${this.UI_IDS.bar}" class="h-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-500" style="width: 0%"></div>
        </div>

        <a
          id="${this.UI_IDS.cta}"
          href="../initialization/index.html?return=workspace"
          class="hidden block w-full text-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm text-white transition-colors"
        >
          Complete Setup
        </a>
      </div>
    `;

    document.body.appendChild(root);

    // Attach event listeners once
    const pill = document.getElementById(this.UI_IDS.pill);
    const panel = document.getElementById(this.UI_IDS.panel);
    const close = document.getElementById(this.UI_IDS.close);

    if (pill && panel) {
      pill.addEventListener('click', () => {
        const isHidden = panel.classList.contains('hidden');
        if (isHidden) {
          panel.classList.remove('hidden');
          pill.setAttribute('aria-expanded', 'true');
          this.saveLastShownProgress();
          if (window.lucide) window.lucide.createIcons();
        } else {
          panel.classList.add('hidden');
          pill.setAttribute('aria-expanded', 'false');
        }
      });
    }

    if (close) {
      close.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.snooze();
      });
    }

    return root;
  }

  renderProgressUI(progress) {
    const root = this.ensureProgressUI();
    if (!root) return;

    const textEl = document.getElementById(this.UI_IDS.text);
    if (textEl) textEl.textContent = `${progress}% Complete`;

    const panel = document.getElementById(this.UI_IDS.panel);
    if (panel) {
      const progressSpans = panel.querySelectorAll('[data-fsop-progress]');
      progressSpans.forEach((el) => { el.textContent = String(progress); });
    }

    const bar = document.getElementById(this.UI_IDS.bar);
    if (bar) bar.style.width = `${progress}%`;

    const cta = document.getElementById(this.UI_IDS.cta);
    if (cta) {
      if (progress < 50) cta.classList.remove('hidden');
      else cta.classList.add('hidden');
    }

    // Refresh lucide icons if available
    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 50);
    }
  }

  removeProgressUI() {
    const root = document.getElementById(this.UI_IDS.root);
    if (root) root.remove();
  }

  saveLastShownProgress() {
    try {
      localStorage.setItem(this.STORAGE_KEYS.lastShownProgress, String(this.calculateProgress()));
    } catch (_) {
      // ignore
    }
  }

  nudgeProgressPill() {
    const progress = this.calculateProgress();
    if (!this.shouldRenderProgressUI(progress)) return;

    // Ensure UI exists but keep it collapsed (smart/ambient)
    this.renderProgressUI(progress);

    const pill = document.getElementById(this.UI_IDS.pill);
    if (!pill) return;

    pill.classList.remove('fsop-pulse');
    // Force reflow to restart animation
    // eslint-disable-next-line no-unused-expressions
    pill.offsetHeight;
    pill.classList.add('fsop-pulse');
  }

  showCompletionMessage(stepKey) {
    const messages = {
      dataSourcesConnected: 'Data sources connected!',
      museSelected: 'Muse selected!',
      firstMemoryImported: 'First memory imported!',
      firstChat: 'First chat with Dameris!',
      firstPatternDetected: 'Pattern detected!',
      firstArtifactGenerated: 'Artifact generated!'
    };

    const message = messages[stepKey];
    if (message && window.toastNotifications) {
      window.toastNotifications.success(message);
    }
  }

  // Public methods for external use
  markDataSourcesConnected(count) {
    if (count > 0) {
      this.completeStep('dataSourcesConnected');
    }
  }

  markMuseSelected() {
    this.completeStep('museSelected');
  }

  getProgress() {
    return this.calculateProgress();
  }

  reset() {
    Object.keys(this.steps).forEach(key => {
      this.steps[key].completed = false;
    });
    localStorage.removeItem(this.STORAGE_KEYS.progress);
    localStorage.removeItem(this.STORAGE_KEYS.lastShownProgress);
    this.clearSnooze();
    this.updateDisplay();
  }
}

// Initialize
window.onboardingProgress = new OnboardingProgress();

// Also expose for initialization page
if (typeof selectMuse !== 'undefined') {
  const originalSelectMuse = window.selectMuse;
  window.selectMuse = function(museName) {
    if (originalSelectMuse) originalSelectMuse(museName);
    if (window.onboardingProgress) {
      window.onboardingProgress.markMuseSelected();
    }
  };
}



















