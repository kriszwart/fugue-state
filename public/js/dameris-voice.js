/**
 * Dameris Voice System
 * Handles text-to-speech using ElevenLabs API
 * Uses random female voice selection for each playback
 */

class DamerisVoice {
  constructor() {
    this.currentAudio = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.availableVoices = [];
    this.selectedVoice = null;
    this.playbackRate = 1.0;
    this.volume = 1.0;
    this.currentHighlightedElement = null;

    // ONLY Female voice IDs from ElevenLabs - NEVER male voices
    this.femaleVoices = [
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella' },
      { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli' },
      { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy' },
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Grace' },
      { id: 'oWAxZDx7w5VEj9dCyTzz', name: 'Charlotte' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi' },
      { id: 'XB0fDUnXU5powFXDhCwa', name: 'Matilda' },
    ];

    // Inspirational quotes for loading screen
    this.quotes = [
      { text: 'Reality is that which, when you stop believing in it, doesn\'t go away.', author: 'Philip K. Dick' },
      { text: 'We are such stuff as dreams are made on, and our little life is rounded with a sleep.', author: 'William Shakespeare' },
      { text: 'The only way of discovering the limits of the possible is to venture a little way past them into the impossible.', author: 'Arthur C. Clarke' },
      { text: 'What is a dream, if not memory reimagined?', author: 'Dameris' },
      { text: 'We are not going in circles, we are going upwards. The path is a spiral.', author: 'Hermann Hesse' },
      { text: 'The cosmos is within us. We are made of star-stuff.', author: 'Carl Sagan' },
      { text: 'The future is already here – it\'s just not evenly distributed.', author: 'William Gibson' },
      { text: 'In the province of the mind, what one believes to be true either is true or becomes true.', author: 'John C. Lilly' },
    ];

    // Always use random voices, don't load saved voice
    this.loadingOverlay = null;

    // Initialize keyboard shortcuts
    this.initKeyboardShortcuts();
  }

  /**
   * Load the saved voice from localStorage
   */
  loadSavedVoice() {
    const saved = localStorage.getItem('dameris_voice');
    if (saved) {
      this.selectedVoice = JSON.parse(saved);
    }
  }

  /**
   * Get a random female voice
   */
  getRandomVoice() {
    const randomIndex = Math.floor(Math.random() * this.femaleVoices.length);
    return this.femaleVoices[randomIndex];
  }

  /**
   * Get a random female voice each time (always random, never saved)
   */
  getCurrentVoice() {
    // Always return a new random voice, ignore any saved voice
    this.selectedVoice = this.getRandomVoice();
    return this.selectedVoice;
  }

  /**
   * Save the current voice to localStorage
   */
  saveCurrentVoice() {
    if (this.selectedVoice) {
      localStorage.setItem('dameris_voice', JSON.stringify(this.selectedVoice));
      return true;
    }
    return false;
  }

  /**
   * Clear the saved voice and get a new random one
   */
  changeVoice() {
    localStorage.removeItem('dameris_voice');
    this.selectedVoice = this.getRandomVoice();
    return this.selectedVoice;
  }

  /**
   * Speak the given text using ElevenLabs TTS
   * ENFORCES FEMALE VOICES ONLY - Never uses male voices
   */
  async speak(text, onStart, onEnd, onError) {
    if (this.isPlaying) {
      this.stop();
    }

    try {
      // Check if API key is configured first
      const checkResponse = await fetch('/api/tts/check');
      const checkData = await checkResponse.json();

      if (!checkData.configured) {
        const errorMsg = 'ElevenLabs API key not configured. Voice features are unavailable.';
        console.warn(errorMsg);
        if (onError) onError(new Error(errorMsg));
        return;
      }

      const voice = this.getCurrentVoice();
      
      // DOUBLE-CHECK: Ensure voice is from female voices whitelist
      const isFemaleVoice = this.femaleVoices.some(v => v.id === voice.id);
      if (!isFemaleVoice) {
        console.warn('Invalid voice detected, using default female voice');
        voice.id = '21m00Tcm4TlvDq8ikWAM'; // Rachel - default female voice
        voice.name = 'Rachel';
      }

      // Call the Next.js API route
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voiceId: voice.id, // Always a female voice ID
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || errorData.details || 'Failed to generate speech';
        throw new Error(errorMessage);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.playbackRate = this.playbackRate;
      this.currentAudio.volume = this.volume;
      this.isPlaying = true;
      this.isPaused = false;

      // Call onStart when audio is ready and actually starts playing
      this.currentAudio.addEventListener('playing', () => {
        if (onStart) onStart();
      }, { once: true });

      this.currentAudio.onended = () => {
        this.isPlaying = false;
        this.isPaused = false;
        URL.revokeObjectURL(audioUrl);
        if (onEnd) onEnd();
      };

      this.currentAudio.onerror = (error) => {
        this.isPlaying = false;
        this.isPaused = false;
        URL.revokeObjectURL(audioUrl);
        if (onError) onError(error);
      };

      await this.currentAudio.play();

    } catch (error) {
      console.error('Error in speak:', error);
      this.isPlaying = false;
      if (onError) onError(error);
    }
  }

  /**
   * Pause the current audio
   */
  pause() {
    if (this.currentAudio && this.isPlaying && !this.isPaused) {
      this.currentAudio.pause();
      this.isPaused = true;
    }
  }

  /**
   * Resume the current audio
   */
  resume() {
    if (this.currentAudio && this.isPlaying && this.isPaused) {
      this.currentAudio.play();
      this.isPaused = false;
    }
  }

  /**
   * Toggle pause/resume
   */
  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Stop the current audio
   */
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.isPlaying = false;
      this.isPaused = false;
    }
  }

  /**
   * Skip forward by seconds
   */
  skipForward(seconds = 10) {
    if (this.currentAudio) {
      this.currentAudio.currentTime = Math.min(
        this.currentAudio.currentTime + seconds,
        this.currentAudio.duration
      );
    }
  }

  /**
   * Skip backward by seconds
   */
  skipBackward(seconds = 10) {
    if (this.currentAudio) {
      this.currentAudio.currentTime = Math.max(
        this.currentAudio.currentTime - seconds,
        0
      );
    }
  }

  /**
   * Set playback speed
   */
  setPlaybackRate(rate) {
    this.playbackRate = rate;
    if (this.currentAudio) {
      this.currentAudio.playbackRate = rate;
    }
  }

  /**
   * Set volume
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
  }

  /**
   * Auto-scroll to keep highlighted element in view
   */
  scrollToHighlighted(element) {
    if (!element) return;

    this.currentHighlightedElement = element;

    // Scroll element into view with smooth behavior
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });
  }

  /**
   * Initialize keyboard shortcuts
   */
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts if narration is playing
      if (!this.isPlaying) return;

      // Don't interfere with typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch(e.key) {
        case ' ':
          e.preventDefault();
          this.togglePause();
          if (window.playbackControls) {
            window.playbackControls.updatePlayPauseButton();
          }
          break;
        case 'Escape':
          e.preventDefault();
          this.stop();
          if (window.playbackControls) {
            window.playbackControls.hide();
          }
          if (window.voiceEqualizer) {
            window.voiceEqualizer.stop();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.skipForward(10);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.skipBackward(10);
          break;
      }
    });
  }

  /**
   * Extract text content from HTML for narration
   */
  extractTextFromElement(element) {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true);

    // Remove script tags, style tags, and navigation
    const unwanted = clone.querySelectorAll('script, style, nav, button, .lucide, i[data-lucide]');
    unwanted.forEach(el => el.remove());

    // Get the text content
    let text = clone.textContent || '';

    // Clean up the text
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Show a notification toast
   */
  showNotification(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `fixed top-6 right-6 z-[100] px-6 py-4 rounded-xl backdrop-blur-xl shadow-2xl flex items-center gap-3 animate-slide-in-from-right ${
      type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-200' :
      type === 'error' ? 'bg-red-500/20 border border-red-500/30 text-red-200' :
      'bg-violet-500/20 border border-violet-500/30 text-violet-200'
    }`;

    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'volume-2';

    toast.innerHTML = `
      <i data-lucide="${icon}" class="w-5 h-5"></i>
      <span class="text-sm font-medium">${message}</span>
    `;

    document.body.appendChild(toast);

    // Initialize lucide icons for the toast
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Auto-remove after duration
    setTimeout(() => {
      toast.style.animation = 'slide-out-to-right 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Smooth scroll to top of page
   */
  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  /**
   * Show loading overlay with rotating quotes
   */
  showLoadingOverlay() {
    if (this.loadingOverlay) return;

    const randomQuote = this.quotes[Math.floor(Math.random() * this.quotes.length)];

    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md';
    this.loadingOverlay.style.transition = 'opacity 0.3s ease';
    this.loadingOverlay.innerHTML = `
      <div class="max-w-2xl px-8 py-12 rounded-2xl bg-gradient-to-br from-violet-900/40 to-purple-900/40 border border-violet-500/30 backdrop-blur-xl shadow-2xl animate-fade-in">
        <div class="flex flex-col items-center gap-6">
          <!-- Pulsing microphone icon -->
          <div class="relative">
            <div class="absolute inset-0 bg-violet-500/30 rounded-full animate-ping"></div>
            <div class="relative bg-violet-600/50 p-6 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-violet-200">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" x2="12" y1="19" y2="22"></line>
              </svg>
            </div>
          </div>

          <!-- Loading text -->
          <div class="text-center space-y-3 w-full max-w-md">
            <h3 class="text-2xl font-light text-violet-100">Preparing narration...</h3>
            <p class="text-sm text-violet-300/80 font-mono">Voice synthesis in progress</p>

            <!-- Progress bar -->
            <div class="w-full bg-violet-950/50 rounded-full h-2.5 overflow-hidden border border-violet-500/20">
              <div class="progress-bar h-full bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 bg-[length:200%_100%] rounded-full transition-all duration-300 ease-out" style="width: 0%; animation: gradient-shift 2s ease infinite;"></div>
            </div>
            <p class="text-xs text-violet-400/60 font-mono progress-text">Initializing...</p>
          </div>

          <!-- Random inspirational quote -->
          <div class="mt-4 pt-6 border-t border-violet-500/30 text-center max-w-lg">
            <p class="text-violet-200/90 italic text-lg leading-relaxed mb-2 quote-text">"${randomQuote.text}"</p>
            <p class="text-violet-300/60 text-sm quote-author">— ${randomQuote.author}</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.loadingOverlay);

    // Animate progress bar smoothly
    const progressBar = this.loadingOverlay.querySelector('.progress-bar');
    const progressText = this.loadingOverlay.querySelector('.progress-text');

    const progressSteps = [
      { width: 15, text: 'Connecting to voice engine...', delay: 400 },
      { width: 30, text: 'Analyzing text content...', delay: 700 },
      { width: 50, text: 'Processing with AI...', delay: 1000 },
      { width: 70, text: 'Generating audio waves...', delay: 1300 },
      { width: 85, text: 'Synthesizing voice...', delay: 1600 },
      { width: 95, text: 'Almost ready...', delay: 1900 },
      { width: 98, text: 'Preparing playback...', delay: 2200 }
    ];

    let stepIndex = 0;
    const updateProgress = () => {
      if (stepIndex < progressSteps.length && this.loadingOverlay) {
        const step = progressSteps[stepIndex];
        progressBar.style.width = `${step.width}%`;
        progressText.textContent = step.text;
        stepIndex++;
        this.progressTimeout = setTimeout(updateProgress, step.delay);
      } else if (this.loadingOverlay) {
        // Keep pulsing at 98% until audio starts
        this.progressTimeout = setTimeout(() => {
          if (this.loadingOverlay) {
            progressText.textContent = 'Starting narration...';
          }
        }, 500);
      }
    };
    this.progressTimeout = setTimeout(updateProgress, 100);

    // Rotate quotes every 5 seconds
    this.quoteInterval = setInterval(() => {
      if (!this.loadingOverlay) return;

      const newQuote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
      const quoteText = this.loadingOverlay.querySelector('.quote-text');
      const quoteAuthor = this.loadingOverlay.querySelector('.quote-author');

      if (quoteText && quoteAuthor) {
        quoteText.style.opacity = '0';
        quoteAuthor.style.opacity = '0';

        setTimeout(() => {
          if (quoteText && quoteAuthor) {
            quoteText.textContent = `"${newQuote.text}"`;
            quoteAuthor.textContent = `— ${newQuote.author}`;
            quoteText.style.opacity = '1';
            quoteAuthor.style.opacity = '1';
          }
        }, 300);
      }
    }, 5000);
  }

  /**
   * Complete progress to 100% and hide overlay
   */
  completeAndHideLoadingOverlay() {
    if (this.loadingOverlay) {
      const progressBar = this.loadingOverlay.querySelector('.progress-bar');
      const progressText = this.loadingOverlay.querySelector('.progress-text');

      if (progressBar && progressText) {
        progressBar.style.width = '100%';
        progressText.textContent = 'Ready!';
      }

      // Wait a moment at 100% before hiding
      setTimeout(() => {
        this.hideLoadingOverlay();
      }, 500);
    }
  }

  /**
   * Hide loading overlay
   */
  hideLoadingOverlay() {
    if (this.quoteInterval) {
      clearInterval(this.quoteInterval);
      this.quoteInterval = null;
    }

    if (this.progressTimeout) {
      clearTimeout(this.progressTimeout);
      this.progressTimeout = null;
    }

    if (this.loadingOverlay) {
      this.loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        if (this.loadingOverlay) {
          this.loadingOverlay.remove();
          this.loadingOverlay = null;
        }
      }, 300);
    }
  }
}

// Create a global instance
window.damerisVoice = new DamerisVoice();

/**
 * Voice Equalizer Visualizer
 */
class VoiceEqualizer {
  constructor() {
    this.container = null;
    this.bars = [];
    this.animationFrame = null;
    this.isActive = false;
  }

  create() {
    // Create equalizer container
    this.container = document.createElement('div');
    this.container.className = 'voice-equalizer fixed top-24 right-6 z-[90] flex items-end gap-1 p-4 rounded-xl backdrop-blur-xl bg-black/40 border border-violet-500/30 shadow-2xl';
    this.container.style.display = 'none';

    // Create bars
    for (let i = 0; i < 5; i++) {
      const bar = document.createElement('div');
      bar.className = 'equalizer-bar w-1.5 rounded-full bg-gradient-to-t from-violet-500 to-purple-400';
      bar.style.height = '8px';
      bar.style.transition = 'height 0.1s ease';
      this.bars.push(bar);
      this.container.appendChild(bar);
    }

    document.body.appendChild(this.container);
    return this.container;
  }

  start() {
    if (!this.container) this.create();
    this.container.style.display = 'flex';
    this.isActive = true;
    this.animate();
  }

  animate() {
    if (!this.isActive) return;

    this.bars.forEach((bar, index) => {
      // Create dynamic wave effect with varying heights
      const baseHeight = 8;
      const maxHeight = 48;
      const time = Date.now() / 1000;
      const offset = index * 0.5;

      // Combine multiple sine waves for natural looking animation
      const height = baseHeight +
        Math.sin(time * 3 + offset) * (maxHeight - baseHeight) * 0.3 +
        Math.sin(time * 5 + offset * 1.5) * (maxHeight - baseHeight) * 0.3 +
        Math.sin(time * 7 + offset * 2) * (maxHeight - baseHeight) * 0.4;

      bar.style.height = `${Math.max(baseHeight, height)}px`;
    });

    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  stop() {
    this.isActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.container) {
      this.container.style.display = 'none';
    }
    // Reset bars to minimum height
    this.bars.forEach(bar => {
      bar.style.height = '8px';
    });
  }
}

// Create global equalizer instance
window.voiceEqualizer = new VoiceEqualizer();

/**
 * Playback Controls - Floating control bar
 */
class PlaybackControls {
  constructor() {
    this.container = null;
    this.progressUpdateInterval = null;
  }

  create() {
    this.container = document.createElement('div');
    this.container.className = 'playback-controls fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-violet-900/90 to-purple-900/90 border border-violet-500/30 shadow-2xl min-w-[500px]';
    this.container.style.display = 'none';

    this.container.innerHTML = `
      <div class="flex flex-col gap-3">
        <!-- Top row: Title and close -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i data-lucide="mic" class="w-4 h-4 text-violet-300"></i>
            <span class="text-sm font-medium text-violet-100">Now Playing</span>
          </div>
          <button class="close-btn p-1 hover:bg-white/10 rounded-lg transition-colors" title="Stop (Esc)">
            <i data-lucide="x" class="w-4 h-4 text-violet-300"></i>
          </button>
        </div>

        <!-- Progress bar -->
        <div class="flex items-center gap-3">
          <span class="text-xs text-violet-300 font-mono current-time">0:00</span>
          <div class="flex-1 h-2 bg-violet-950/50 rounded-full overflow-hidden cursor-pointer progress-container">
            <div class="progress-fill h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all" style="width: 0%"></div>
          </div>
          <span class="text-xs text-violet-300 font-mono total-time">0:00</span>
        </div>

        <!-- Controls row -->
        <div class="flex items-center justify-between">
          <!-- Playback controls -->
          <div class="flex items-center gap-2">
            <button class="skip-back-btn p-2 hover:bg-white/10 rounded-lg transition-colors" title="Skip back 10s (←)">
              <i data-lucide="skip-back" class="w-5 h-5 text-violet-200"></i>
            </button>
            <button class="play-pause-btn p-3 bg-violet-600 hover:bg-violet-500 rounded-full transition-colors" title="Play/Pause (Space)">
              <i data-lucide="pause" class="w-5 h-5 text-white"></i>
            </button>
            <button class="skip-forward-btn p-2 hover:bg-white/10 rounded-lg transition-colors" title="Skip forward 10s (→)">
              <i data-lucide="skip-forward" class="w-5 h-5 text-violet-200"></i>
            </button>
          </div>

          <!-- Speed controls -->
          <div class="flex items-center gap-1">
            <button class="speed-btn px-2 py-1 text-xs rounded hover:bg-white/10 transition-colors text-violet-300" data-speed="0.75">0.75x</button>
            <button class="speed-btn px-2 py-1 text-xs rounded bg-white/10 transition-colors text-violet-100" data-speed="1">1x</button>
            <button class="speed-btn px-2 py-1 text-xs rounded hover:bg-white/10 transition-colors text-violet-300" data-speed="1.25">1.25x</button>
            <button class="speed-btn px-2 py-1 text-xs rounded hover:bg-white/10 transition-colors text-violet-300" data-speed="1.5">1.5x</button>
          </div>

          <!-- Volume control -->
          <div class="flex items-center gap-2">
            <i data-lucide="volume-2" class="w-4 h-4 text-violet-300"></i>
            <input type="range" min="0" max="100" value="100" class="volume-slider w-20 h-1 bg-violet-950/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:cursor-pointer">
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    // Initialize Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.attachEventListeners();
    return this.container;
  }

  attachEventListeners() {
    const voice = window.damerisVoice;

    // Close button
    this.container.querySelector('.close-btn').addEventListener('click', () => {
      voice.stop();
      this.hide();
      if (window.voiceEqualizer) {
        window.voiceEqualizer.stop();
      }
    });

    // Play/Pause button
    this.container.querySelector('.play-pause-btn').addEventListener('click', () => {
      voice.togglePause();
      this.updatePlayPauseButton();
    });

    // Skip buttons
    this.container.querySelector('.skip-back-btn').addEventListener('click', () => {
      voice.skipBackward(10);
    });

    this.container.querySelector('.skip-forward-btn').addEventListener('click', () => {
      voice.skipForward(10);
    });

    // Speed buttons
    this.container.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        voice.setPlaybackRate(speed);

        // Update button styles
        this.container.querySelectorAll('.speed-btn').forEach(b => {
          b.classList.remove('bg-white/10', 'text-violet-100');
          b.classList.add('text-violet-300');
        });
        btn.classList.add('bg-white/10', 'text-violet-100');
        btn.classList.remove('text-violet-300');
      });
    });

    // Volume slider
    this.container.querySelector('.volume-slider').addEventListener('input', (e) => {
      const volume = e.target.value / 100;
      voice.setVolume(volume);
    });

    // Progress bar click to seek
    this.container.querySelector('.progress-container').addEventListener('click', (e) => {
      if (!voice.currentAudio) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * voice.currentAudio.duration;

      voice.currentAudio.currentTime = newTime;
    });
  }

  show() {
    if (!this.container) this.create();
    this.container.style.display = 'block';
    this.startProgressUpdates();
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
    this.stopProgressUpdates();
  }

  updatePlayPauseButton() {
    const btn = this.container?.querySelector('.play-pause-btn i');
    if (!btn) return;

    const voice = window.damerisVoice;
    if (voice.isPaused) {
      btn.setAttribute('data-lucide', 'play');
    } else {
      btn.setAttribute('data-lucide', 'pause');
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  startProgressUpdates() {
    this.stopProgressUpdates();

    this.progressUpdateInterval = setInterval(() => {
      const voice = window.damerisVoice;
      if (!voice.currentAudio) return;

      const current = voice.currentAudio.currentTime;
      const total = voice.currentAudio.duration || 0;
      const percentage = total > 0 ? (current / total) * 100 : 0;

      // Update progress bar
      const progressFill = this.container?.querySelector('.progress-fill');
      if (progressFill) {
        progressFill.style.width = `${percentage}%`;
      }

      // Update time displays
      const currentTimeEl = this.container?.querySelector('.current-time');
      const totalTimeEl = this.container?.querySelector('.total-time');
      if (currentTimeEl) currentTimeEl.textContent = this.formatTime(current);
      if (totalTimeEl) totalTimeEl.textContent = this.formatTime(total);
    }, 100);
  }

  stopProgressUpdates() {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
      this.progressUpdateInterval = null;
    }
  }

  formatTime(seconds) {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Create global playback controls instance
window.playbackControls = new PlaybackControls();

/**
 * Helper function to add narration button to a page section
 */
function addNarrationButton(targetElement, buttonText = 'Listen to this section') {
  const voice = window.damerisVoice;
  const equalizer = window.voiceEqualizer;

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'narration-controls flex items-center gap-3 justify-center mt-8';

  // Create narrate button
  const button = document.createElement('button');
  button.className = 'px-6 py-3 rounded-full bg-gradient-to-r from-violet-600/80 to-purple-600/80 hover:from-violet-600 hover:to-purple-600 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg hover:shadow-violet-500/50';
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="play-icon">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stop-icon hidden">
      <rect x="6" y="4" width="4" height="16"></rect>
      <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
    <span class="button-text">${buttonText}</span>
  `;

  // Create voice info text
  const voiceInfo = document.createElement('span');
  voiceInfo.className = 'text-xs text-zinc-400 font-mono';
  voiceInfo.textContent = `Voice: ${voice.getCurrentVoice().name}`;

  buttonContainer.appendChild(button);
  buttonContainer.appendChild(voiceInfo);

  // Add to target
  targetElement.appendChild(buttonContainer);

  // Handle button click
  button.addEventListener('click', async () => {
    const playIcon = button.querySelector('.play-icon');
    const stopIcon = button.querySelector('.stop-icon');
    const buttonTextEl = button.querySelector('.button-text');

    if (voice.isPlaying) {
      voice.stop();
      equalizer.stop();
      playIcon.classList.remove('hidden');
      stopIcon.classList.add('hidden');
      buttonTextEl.textContent = buttonText;
      button.classList.remove('animate-pulse');
    } else {
      const text = voice.extractTextFromElement(targetElement);

      // Show loading overlay immediately
      voice.showLoadingOverlay();
      voice.scrollToTop();

      playIcon.classList.add('hidden');
      stopIcon.classList.remove('hidden');
      buttonTextEl.textContent = 'Speaking...';
      button.classList.add('animate-pulse');

      await voice.speak(
        text,
        () => {
          // onStart - complete progress and hide loading, show notification and equalizer
          voice.completeAndHideLoadingOverlay();
          const currentVoice = voice.selectedVoice?.name || 'Dameris';
          voice.showNotification(`${currentVoice} is narrating...`, 'info', 4000);
          equalizer.start();
          console.log('Started speaking');
        },
        () => {
          // onEnd
          playIcon.classList.remove('hidden');
          stopIcon.classList.add('hidden');
          buttonTextEl.textContent = buttonText;
          button.classList.remove('animate-pulse');
          equalizer.stop();
          voice.showNotification('Narration complete', 'success', 2000);
        },
        (error) => {
          // onError
          console.error('Speech error:', error);
          voice.hideLoadingOverlay();
          playIcon.classList.remove('hidden');
          stopIcon.classList.add('hidden');
          buttonTextEl.textContent = 'Error - Try again';
          button.classList.remove('animate-pulse');
          equalizer.stop();
          voice.showNotification('Narration failed', 'error', 3000);
          setTimeout(() => {
            buttonTextEl.textContent = buttonText;
          }, 3000);
        }
      );
    }
  });

  return buttonContainer;
}
