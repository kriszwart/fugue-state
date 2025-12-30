/**
 * User Feedback System
 * Collects feedback on onboarding experience and key actions
 */

class UserFeedback {
  constructor() {
    this.feedbackStorageKey = 'fuguestate_feedback_data';
    this.feedbackEnabled = true;
    this.init();
  }

  init() {
    // Check if feedback is disabled
    if (localStorage.getItem('fuguestate_feedback_disabled') === 'true') {
      this.feedbackEnabled = false;
      return;
    }

    // Listen for key actions
    this.setupActionListeners();
    
    // Show feedback prompts after onboarding completion
    this.checkOnboardingCompletion();
  }

  setupActionListeners() {
    // Listen for onboarding completion
    document.addEventListener('memoryImported', () => {
      setTimeout(() => this.showActionFeedback('memory_import'), 2000);
    });

    document.addEventListener('chatMessageSent', () => {
      setTimeout(() => this.showActionFeedback('first_chat'), 2000);
    });

    document.addEventListener('patternDetected', () => {
      setTimeout(() => this.showActionFeedback('pattern_detection'), 2000);
    });

    document.addEventListener('artifactGenerated', () => {
      setTimeout(() => this.showActionFeedback('artifact_generation'), 2000);
    });
  }

  checkOnboardingCompletion() {
    // Check if user just completed onboarding
    const initCompleted = localStorage.getItem('fuguestate_init_completed');
    if (initCompleted) {
      const completedTime = new Date(initCompleted);
      const now = new Date();
      const hoursSinceCompletion = (now - completedTime) / (1000 * 60 * 60);

      // Show feedback prompt if completed within last 6 hours, but only after user has used the app
      if (hoursSinceCompletion < 6) {
        // Wait 2 minutes after page load to give user time to explore
        setTimeout(() => {
          // Only show if user has interacted (check for any stored feedback shown flags)
          const hasInteracted = this.hasUserInteracted();
          if (hasInteracted) {
            this.showOnboardingFeedback();
          }
        }, 120000); // Wait 2 minutes after page load
      }
    }
  }

  hasUserInteracted() {
    // Check if user has completed any onboarding steps or interactions
    const onboardingProgress = localStorage.getItem('fuguestate_onboarding_progress');
    if (onboardingProgress) {
      try {
        const progress = JSON.parse(onboardingProgress);
        // Return true if any step is completed
        return Object.values(progress).some(completed => completed === true);
      } catch (e) {
        return false;
      }
    }
    // Also show if user has been on the page for a while (fallback)
    return true;
  }

  showActionFeedback(actionType) {
    if (!this.feedbackEnabled) return;

    const feedbackShown = localStorage.getItem(`fuguestate_feedback_shown_${actionType}`);
    if (feedbackShown) return; // Already shown for this action

    const prompt = this.createFeedbackPrompt(
      'Was this helpful?',
      `Did ${this.getActionDescription(actionType)} help you?`,
      actionType
    );

    document.body.appendChild(prompt);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (prompt.parentNode) {
        prompt.remove();
      }
    }, 10000);
  }

  showOnboardingFeedback() {
    if (!this.feedbackEnabled) return;

    const feedbackShown = localStorage.getItem('fuguestate_onboarding_feedback_shown');
    if (feedbackShown) return;

    const prompt = this.createFeedbackPrompt(
      'How was your setup experience?',
      'We\'d love to hear your thoughts on the onboarding process.',
      'onboarding',
      true // Show text input for detailed feedback
    );

    document.body.appendChild(prompt);
  }

  getActionDescription(actionType) {
    const descriptions = {
      memory_import: 'importing your first memory',
      first_chat: 'chatting with Dameris',
      pattern_detection: 'detecting patterns',
      artifact_generation: 'generating an artifact'
    };
    return descriptions[actionType] || 'this feature';
  }

  createFeedbackPrompt(title, message, context, showTextInput = false) {
    const prompt = document.createElement('div');
    prompt.className = 'fixed top-6 right-6 z-50 bg-zinc-900/95 border border-indigo-500/20 rounded-lg p-3 shadow-lg max-w-xs backdrop-blur-sm animate-enter';
    prompt.style.animation = 'fade-in-down 0.3s ease-out';

    const feedbackId = `feedback_${Date.now()}`;

    prompt.innerHTML = `
      <div class="flex items-start justify-between mb-2">
        <div class="flex-1">
          <h4 class="text-xs font-medium text-zinc-200 mb-1">${title}</h4>
          <p class="text-[11px] text-zinc-400 leading-relaxed">${message}</p>
        </div>
        <button onclick="this.closest('.fixed').remove()" class="text-zinc-500 hover:text-zinc-400 ml-2 -mt-1">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      </div>
      ${showTextInput ? `
        <textarea
          id="${feedbackId}_text"
          placeholder="Optional feedback..."
          class="w-full mb-2 px-2.5 py-1.5 bg-zinc-950/50 border border-white/10 rounded-md text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 resize-none"
          rows="2"
        ></textarea>
      ` : ''}
      <div class="flex items-center gap-1.5">
        <button
          onclick="window.userFeedback.submitFeedback('${context}', 'positive', '${feedbackId}')"
          class="flex-1 px-2 py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-[11px] text-emerald-300 transition-colors flex items-center justify-center gap-1"
        >
          <i data-lucide="thumbs-up" class="w-3 h-3"></i> <span>Yes</span>
        </button>
        <button
          onclick="window.userFeedback.submitFeedback('${context}', 'negative', '${feedbackId}')"
          class="flex-1 px-2 py-1.5 rounded-md bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-[11px] text-red-300 transition-colors flex items-center justify-center gap-1"
        >
          <i data-lucide="thumbs-down" class="w-3 h-3"></i> <span>No</span>
        </button>
        <button
          onclick="window.userFeedback.dismissFeedback('${context}', '${feedbackId}')"
          class="px-2 py-1.5 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 text-[11px] text-zinc-500 transition-colors"
        >
          Skip
        </button>
      </div>
    `;

    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 100);
    }

    return prompt;
  }

  submitFeedback(context, sentiment, feedbackId) {
    const textInput = document.getElementById(`${feedbackId}_text`);
    const feedbackText = textInput ? textInput.value.trim() : '';

    const feedback = {
      context,
      sentiment,
      text: feedbackText,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Store feedback locally
    this.saveFeedback(feedback);

    // Mark as shown
    localStorage.setItem(`fuguestate_feedback_shown_${context}`, 'true');

    // Optionally send to analytics endpoint
    this.sendFeedbackToServer(feedback).catch(err => {
      console.log('Failed to send feedback:', err);
    });

    // Show thank you message
    this.showThankYouMessage();

    // Remove prompt
    const prompt = document.getElementById(feedbackId) || document.querySelector(`[id^="${feedbackId}"]`)?.closest('.fixed');
    if (prompt) {
      prompt.remove();
    }
  }

  dismissFeedback(context, feedbackId) {
    localStorage.setItem(`fuguestate_feedback_shown_${context}`, 'true');
    
    const prompt = document.getElementById(feedbackId) || document.querySelector(`[id^="${feedbackId}"]`)?.closest('.fixed');
    if (prompt) {
      prompt.remove();
    }
  }

  saveFeedback(feedback) {
    const existing = JSON.parse(localStorage.getItem(this.feedbackStorageKey) || '[]');
    existing.push(feedback);
    
    // Keep only last 50 feedback entries
    if (existing.length > 50) {
      existing.shift();
    }
    
    localStorage.setItem(this.feedbackStorageKey, JSON.stringify(existing));
  }

  async sendFeedbackToServer(feedback) {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(feedback)
      });
    } catch (error) {
      // Silently fail - feedback is stored locally anyway
      console.log('Feedback server unavailable:', error);
    }
  }

  showThankYouMessage() {
    const thankYou = document.createElement('div');
    thankYou.className = 'fixed top-6 right-6 z-50 bg-emerald-500/15 border border-emerald-500/20 rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm';
    thankYou.innerHTML = `
      <div class="flex items-center gap-2">
        <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>
        <span class="text-xs text-emerald-300">Thanks for your feedback!</span>
      </div>
    `;

    document.body.appendChild(thankYou);

    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 100);
    }

    setTimeout(() => {
      thankYou.remove();
    }, 3000);
  }

  // Public method to disable feedback
  disable() {
    this.feedbackEnabled = false;
    localStorage.setItem('fuguestate_feedback_disabled', 'true');
  }

  // Public method to enable feedback
  enable() {
    this.feedbackEnabled = true;
    localStorage.removeItem('fuguestate_feedback_disabled');
  }

  // Get all stored feedback
  getStoredFeedback() {
    return JSON.parse(localStorage.getItem(this.feedbackStorageKey) || '[]');
  }

  // Clear stored feedback
  clearStoredFeedback() {
    localStorage.removeItem(this.feedbackStorageKey);
  }
}

// Initialize
window.userFeedback = new UserFeedback();




















