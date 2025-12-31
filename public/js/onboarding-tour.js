/**
 * Dameris Welcome Experience
 * A magical, cinematic introduction to FugueState with voice and personality
 */

class DamerisWelcome {
  constructor() {
    this.currentStep = 0;
    this.audioPlayer = null;
    this.isPlaying = false;

    // Get user's name from localStorage
    this.userName = localStorage.getItem('fuguestate_username') || 'friend';

    this.steps = [
      {
        id: 'greeting',
        damerisText: `Hello, ${this.userName}... I'm Dameris, your creative muse.`,
        voiceText: `Hello, ${this.userName}. I'm Dameris, your creative muse.`,
        subtitle: "Your AI companion for memories and creativity",
        animation: 'materialize',
        duration: 2000  // Reduced from 3500ms
      },
      {
        id: 'capabilities',
        damerisText: "I can dream with you, remix your thoughts, find echoes of the past...",
        voiceText: "I can dream with you, remix your thoughts, find echoes of the past.",
        subtitle: "9 Creative Modes • Fugue Engine • Deep Analysis",
        animation: 'showcase',
        duration: 2500  // Reduced from 4500ms
      },
      {
        id: 'invitation',
        damerisText: `Ready to begin? Your memories are waiting.`,
        voiceText: `Ready to begin? Your memories are waiting.`,
        subtitle: "Your journey starts now",
        animation: 'sparkle',
        duration: 2000,  // Reduced from 3500ms
        showButton: true
      }
    ];

    this.init();
  }

  init() {
    const tourCompleted = localStorage.getItem('fuguestate_dameris_intro_completed') === 'true';
    const urlParams = new URLSearchParams(window.location.search);
    const forceTour = urlParams.get('welcome') === 'true';

    if (forceTour || (!tourCompleted && this.shouldAutoStart())) {
      // Add keyboard shortcuts
      this.addKeyboardShortcuts();

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.start());
      } else {
        setTimeout(() => this.start(), 500);
      }
    }
  }

  addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const container = document.getElementById('dameris-welcome');
      if (!container) return; // Only active when welcome screen is visible

      // Escape or Space: Skip to next step
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        if (this.currentStep < this.steps.length - 1) {
          this.nextStep();
        }
      }

      // Enter: Complete if on last step
      if (e.key === 'Enter' && this.currentStep === this.steps.length - 1) {
        e.preventDefault();
        const beginButton = document.getElementById('begin-button');
        if (beginButton) {
          beginButton.click();
        }
      }
    });
  }

  shouldAutoStart() {
    // Auto-start for new users
    return !localStorage.getItem('fuguestate_dameris_intro_completed');
  }

  async start() {
    this.createExperience();
    await this.animateEntry();
    this.showStep(0);
  }

  createExperience() {
    const container = document.createElement('div');
    container.id = 'dameris-welcome';
    container.className = 'fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl';
    container.style.opacity = '0';
    container.style.transition = 'opacity 1s ease-in-out';

    container.innerHTML = `
      <!-- UnicornStudio Background (Same as Studio Page) -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div data-us-project="NMlvqnkICwYYJ6lYb064" class="absolute w-full h-full left-0 top-0" style="opacity: 0.6;"></div>
        <!-- Dotted/Pixelated Overlay Effect (Animated) -->
        <div class="absolute inset-0 w-full h-full animated-dots" style="background-image: radial-gradient(circle, rgba(167, 139, 250, 0.6) 1.5px, transparent 1.5px), radial-gradient(circle, rgba(217, 70, 239, 0.3) 1px, transparent 1px); background-size: 12px 12px, 6px 6px; background-position: 0 0, 6px 6px;"></div>
      </div>

      <!-- Additional Gradient Overlays -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div id="particles-container" class="absolute inset-0"></div>
        <div class="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-fuchsia-900/20"></div>
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.15),transparent_60%)]"></div>

        <!-- Animated Orbs -->
        <div class="absolute top-20 left-20 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-20 right-20 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
      </div>

      <!-- Main Content -->
      <div class="relative h-full flex flex-col items-center justify-center p-8">

        <!-- Dameris Avatar -->
        <div id="dameris-avatar" class="mb-12 relative">
          <div class="w-48 h-64 relative">
            <!-- Voice Reactive Aura -->
            <div id="voice-aura" class="absolute inset-0 w-full h-full bg-violet-500/40 rounded-full blur-[60px] transition-all duration-75 ease-out will-change-transform mix-blend-screen"></div>
            <div id="voice-aura-secondary" class="absolute inset-0 w-full h-full bg-fuchsia-500/20 rounded-full blur-[50px] transition-all duration-100 ease-out will-change-transform mix-blend-screen" style="animation-delay: 0.5s;"></div>

            <!-- Holographic Image Container -->
            <div class="absolute inset-0 spectral-mask opacity-95 rounded-3xl overflow-hidden">
              <img id="spectral-face"
                   src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1000&auto=format&fit=crop"
                   alt="Dameris"
                   class="w-full h-full object-cover hologram-filter opacity-80 transition-all duration-500">
            </div>

            <!-- Scanline Overlay -->
            <div class="absolute inset-0 spectral-mask opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_4px,6px_100%] rounded-3xl"></div>

            <!-- Animated ring -->
            <svg class="absolute inset-0 w-full h-full -rotate-90 z-30" style="filter: drop-shadow(0 0 20px rgba(124, 58, 237, 0.5));">
              <ellipse cx="96" cy="128" rx="90" ry="120" fill="none" stroke="url(#gradient)" stroke-width="2" stroke-dasharray="700" stroke-dashoffset="700" class="animate-draw-circle"/>
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:rgb(167, 139, 250);stop-opacity:1" />
                  <stop offset="100%" style="stop-color:rgb(217, 70, 239);stop-opacity:1" />
                </linearGradient>
              </defs>
            </svg>

            <!-- Orbiting particles -->
            <div class="absolute inset-0 animate-spin z-30" style="animation-duration: 20s;">
              <div class="absolute top-0 left-1/2 w-2 h-2 bg-violet-400 rounded-full -translate-x-1/2 blur-sm"></div>
            </div>
            <div class="absolute inset-0 animate-spin z-30" style="animation-duration: 15s; animation-direction: reverse;">
              <div class="absolute bottom-0 left-1/2 w-2 h-2 bg-fuchsia-400 rounded-full -translate-x-1/2 blur-sm"></div>
            </div>
          </div>
        </div>

        <!-- Speech bubble -->
        <div id="dameris-speech" class="max-w-3xl w-full">
          <!-- Main text -->
          <div class="relative">
            <div class="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 blur-3xl"></div>
            <div class="relative bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-10 border border-violet-500/20 shadow-2xl">
              <div id="dameris-text" class="text-3xl md:text-4xl font-light text-zinc-100 text-center leading-relaxed mb-4 min-h-[120px] flex items-center justify-center" style="font-family: 'SF Pro Display', 'Inter', sans-serif;">
                <!-- Text appears here -->
              </div>
              <div id="dameris-subtitle" class="text-sm text-violet-400/80 text-center font-medium tracking-wide">
                <!-- Subtitle appears here -->
              </div>
            </div>
          </div>

          <!-- Audio indicator -->
          <div id="audio-indicator" class="mt-8 mb-4 flex items-center justify-center gap-2 opacity-0 transition-opacity">
            <div class="flex items-center gap-1">
              <div class="w-1 h-6 bg-violet-500 rounded-full animate-wave" style="animation-delay: 0s;"></div>
              <div class="w-1 h-8 bg-violet-500 rounded-full animate-wave" style="animation-delay: 0.1s;"></div>
              <div class="w-1 h-10 bg-fuchsia-500 rounded-full animate-wave" style="animation-delay: 0.2s;"></div>
              <div class="w-1 h-8 bg-fuchsia-500 rounded-full animate-wave" style="animation-delay: 0.3s;"></div>
              <div class="w-1 h-6 bg-violet-500 rounded-full animate-wave" style="animation-delay: 0.4s;"></div>
            </div>
            <span class="text-xs text-zinc-500 ml-2">Dameris is speaking...</span>
          </div>
        </div>

        <!-- Creative Modes Showcase (appears on step 3) -->
        <div id="modes-showcase" class="hidden mt-16 grid grid-cols-3 gap-4 max-w-2xl w-full">
          <div class="mode-card opacity-0 transform translate-y-4" style="animation-delay: 0.1s;">
            <div class="bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-xl p-4 border border-pink-500/20">
              <div class="text-2xl mb-2">🎨</div>
              <div class="text-xs text-zinc-400">Collage</div>
            </div>
          </div>
          <div class="mode-card opacity-0 transform translate-y-4" style="animation-delay: 0.2s;">
            <div class="bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 rounded-xl p-4 border border-purple-500/20">
              <div class="text-2xl mb-2">🌙</div>
              <div class="text-xs text-zinc-400">Dream</div>
            </div>
          </div>
          <div class="mode-card opacity-0 transform translate-y-4" style="animation-delay: 0.3s;">
            <div class="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-4 border border-cyan-500/20">
              <div class="text-2xl mb-2">🔀</div>
              <div class="text-xs text-zinc-400">Remix</div>
            </div>
          </div>
          <div class="mode-card opacity-0 transform translate-y-4" style="animation-delay: 0.4s;">
            <div class="bg-gradient-to-br from-teal-500/10 to-emerald-500/10 rounded-xl p-4 border border-teal-500/20">
              <div class="text-2xl mb-2">🔊</div>
              <div class="text-xs text-zinc-400">Echo</div>
            </div>
          </div>
          <div class="mode-card opacity-0 transform translate-y-4" style="animation-delay: 0.5s;">
            <div class="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-xl p-4 border border-violet-500/20">
              <div class="text-2xl mb-2">✨</div>
              <div class="text-xs text-zinc-400">Surprise</div>
            </div>
          </div>
          <div class="mode-card opacity-0 transform translate-y-4" style="animation-delay: 0.6s;">
            <div class="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/20">
              <div class="text-2xl mb-2">🎭</div>
              <div class="text-xs text-zinc-400">& More...</div>
            </div>
          </div>
        </div>

        <!-- Begin button (appears on last step) -->
        <div id="begin-button-container" class="hidden mt-16 mb-8">
          <button id="begin-button" class="group relative px-12 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-2xl text-white font-medium text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-violet-500/50">
            <span class="relative z-10">Begin Your Journey</span>
            <div class="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-400 to-fuchsia-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity"></div>
          </button>
          <!-- Keyboard shortcuts for button -->
          <div class="mt-4 flex items-center justify-center gap-3 text-xs text-zinc-500">
            <div class="flex items-center gap-1.5">
              <kbd class="px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded text-zinc-400 font-mono text-[10px]">Space</kbd>
              <span>or</span>
              <kbd class="px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded text-zinc-400 font-mono text-[10px]">Esc</kbd>
              <span>to skip</span>
            </div>
            <span class="text-zinc-600">•</span>
            <div class="flex items-center gap-1.5">
              <kbd class="px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded text-zinc-400 font-mono text-[10px]">Enter</kbd>
              <span>to begin</span>
            </div>
          </div>
        </div>

        <!-- Progress dots -->
        <div class="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2">
          ${this.steps.map((_, i) => `<div class="step-dot w-2 h-2 rounded-full bg-zinc-700 transition-all duration-300" data-step="${i}"></div>`).join('')}
        </div>

        <!-- Skip button - PROMINENT -->
        <div class="absolute top-8 right-8 flex flex-col items-end gap-2">
          <button id="skip-welcome" class="group px-6 py-3 bg-zinc-800/80 hover:bg-zinc-700/80 backdrop-blur-md rounded-xl text-zinc-300 hover:text-white transition-all duration-300 text-sm font-medium border border-zinc-700/50 hover:border-zinc-600 shadow-lg hover:shadow-xl flex items-center gap-2">
            <span>Skip</span>
            <svg class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
            </svg>
          </button>
          <span class="text-xs text-zinc-600">Press Esc or Space</span>
        </div>

        <!-- Keyboard shortcuts hint (only shown when button is not visible) -->
        <div id="keyboard-hints" class="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 animate-fade-in" style="animation-delay: 2s;">
          <div class="flex items-center gap-2 text-xs text-zinc-600">
            <kbd class="px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded text-zinc-400 font-mono">Space</kbd>
            <span>or</span>
            <kbd class="px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded text-zinc-400 font-mono">Esc</kbd>
            <span>to skip</span>
          </div>
        </div>
      </div>

      <style>
        @keyframes draw-circle {
          to {
            stroke-dashoffset: 0;
          }
        }

        .animate-draw-circle {
          animation: draw-circle 2s ease-in-out forwards;
        }

        @keyframes wave {
          0%, 100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(1.5);
          }
        }

        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        #dameris-avatar {
          animation: float 6s ease-in-out infinite;
        }

        .mode-card {
          transition: all 0.3s ease-out;
        }

        .mode-card.show {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }

        .step-dot.active {
          background: linear-gradient(135deg, rgb(139, 92, 246), rgb(217, 70, 239));
          width: 8px;
        }

        /* Spectral Mask for holographic images */
        .spectral-mask {
          mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%);
        }

        /* Holographic Filter */
        .hologram-filter {
          filter: grayscale(100%) sepia(100%) hue-rotate(230deg) brightness(1.1) contrast(1.2);
          mix-blend-mode: screen;
          transition: opacity 0.3s ease-in-out, filter 0.3s ease-in-out;
        }

        /* Glitch effect for face changes */
        .face-glitch {
          opacity: 0.3 !important;
          filter: grayscale(100%) sepia(100%) hue-rotate(280deg) brightness(2.0) contrast(2.0) blur(6px) !important;
        }

        /* Spectral float animation */
        @keyframes spectral-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        #dameris-avatar > div {
          animation: spectral-float 6s ease-in-out infinite;
        }

        /* Animated dotted background */
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }

        @keyframes dot-drift {
          0% { background-position: 0 0; }
          100% { background-position: 100px 100px; }
        }

        .animated-dots {
          animation: dot-drift 30s linear infinite, dot-pulse 4s ease-in-out infinite;
        }

        /* Voice active pulse */
        @keyframes voice-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }

        .voice-active #voice-aura {
          animation: voice-pulse 0.8s ease-in-out infinite !important;
        }

        .voice-active #voice-aura-secondary {
          animation: voice-pulse 1s ease-in-out infinite !important;
          animation-delay: 0.2s !important;
        }

        /* Keyboard hints animation */
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, 10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          #dameris-avatar .w-48 {
            width: 160px !important;
          }

          #dameris-avatar .h-64 {
            height: 200px !important;
          }

          #dameris-text {
            font-size: 1.5rem !important;
            line-height: 2rem !important;
            padding: 0 1rem;
            min-height: 100px !important;
          }

          #dameris-speech .p-10 {
            padding: 1.5rem !important;
          }

          #modes-showcase {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.75rem !important;
            padding: 0 1rem;
          }

          #skip-welcome {
            top: 1rem !important;
            right: 1rem !important;
            font-size: 0.75rem !important;
          }

          .absolute.top-20.left-20,
          .absolute.bottom-20.right-20 {
            width: 16rem !important;
            height: 16rem !important;
          }

          #keyboard-hints {
            bottom: 5rem !important;
            font-size: 0.7rem !important;
          }

          #keyboard-hints kbd {
            padding: 0.25rem 0.5rem !important;
            font-size: 0.65rem !important;
          }
        }

        @media (max-width: 480px) {
          #dameris-avatar .w-48 {
            width: 128px !important;
          }

          #dameris-avatar .h-64 {
            height: 160px !important;
          }

          #dameris-text {
            font-size: 1.25rem !important;
            line-height: 1.75rem !important;
          }

          #modes-showcase {
            gap: 0.5rem !important;
          }

          .mode-card .p-4 {
            padding: 0.75rem !important;
          }

          .mode-card .text-2xl {
            font-size: 1.25rem !important;
          }

          #keyboard-hints {
            flex-direction: column !important;
            gap: 0.5rem !important;
            bottom: 4rem !important;
          }

          #keyboard-hints > div {
            justify-content: center;
          }
        }
      </style>
    `;

    document.body.appendChild(container);

    // Setup event listeners
    document.getElementById('skip-welcome')?.addEventListener('click', () => this.complete());
    document.getElementById('begin-button')?.addEventListener('click', () => this.complete());
  }

  async animateEntry() {
    const container = document.getElementById('dameris-welcome');
    if (!container) return;

    // Initialize UnicornStudio background
    this.initializeUnicornStudio();

    // Fade in container
    await new Promise(resolve => {
      setTimeout(() => {
        container.style.opacity = '1';
        resolve();
      }, 100);
    });

    // Create floating particles
    this.createParticles();
  }

  initializeUnicornStudio() {
    // Load UnicornStudio if not already loaded
    if (!window.UnicornStudio) {
      window.UnicornStudio = { isInitialized: false };
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (typeof window.UnicornStudio.init === 'function' && !window.UnicornStudio.isInitialized) {
          window.UnicornStudio.init();
          window.UnicornStudio.isInitialized = true;
        }
      };
      document.head.appendChild(script);
    } else if (typeof window.UnicornStudio.init === 'function' && !window.UnicornStudio.isInitialized) {
      window.UnicornStudio.init();
      window.UnicornStudio.isInitialized = true;
    }
  }

  createParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return;

    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'absolute w-1 h-1 bg-violet-400/30 rounded-full';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animation = `float ${5 + Math.random() * 5}s ease-in-out infinite`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      container.appendChild(particle);
    }

    // Initialize face morphing and audio visualization
    this.initializeFaceMorphing();
    this.initializeAudioVisualization();
  }

  initializeFaceMorphing() {
    // Array of Dameris face images
    this.faces = [
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1618151313441-bc79b11e5090?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1515202913167-d9a2986914b8?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1552699609-8cf048551712?q=80&w=1000&auto=format&fit=crop"
    ];

    this.currentFaceIndex = 0;
    this.scheduleFaceChange();
  }

  changeFace() {
    const faceImage = document.getElementById('spectral-face');
    if (!faceImage) return;

    // Pick a random next face (that isn't the current one)
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * this.faces.length);
    } while (nextIndex === this.currentFaceIndex);

    this.currentFaceIndex = nextIndex;

    // Apply glitch effect
    faceImage.classList.add('face-glitch');

    // Swap image after short delay to allow glitch to set in
    setTimeout(() => {
      faceImage.src = this.faces[this.currentFaceIndex];
    }, 200);

    // Remove glitch effect
    setTimeout(() => {
      faceImage.classList.remove('face-glitch');
    }, 600);
  }

  scheduleFaceChange() {
    // Change face every 4-8 seconds randomly
    const delay = Math.random() * 4000 + 4000; // 4000ms to 8000ms
    setTimeout(() => {
      this.changeFace();
      this.scheduleFaceChange();
    }, delay);
  }

  initializeAudioVisualization() {
    // Simulate voice reactive aura
    const aura = document.getElementById('voice-aura');
    const auraSec = document.getElementById('voice-aura-secondary');

    if (!aura || !auraSec) return;

    this.audioInterval = setInterval(() => {
      const noise = Math.random();
      const noise2 = Math.random();

      const scale1 = 1 + (noise * 0.4);
      const scale2 = 0.8 + (noise2 * 0.5);
      const op1 = 0.3 + (noise * 0.2);

      aura.style.transform = `scale(${scale1})`;
      aura.style.opacity = op1;
      auraSec.style.transform = `scale(${scale2}) translate(${noise * 10}px, ${noise2 * 10}px)`;
    }, 80);
  }

  async showStep(index) {
    if (index >= this.steps.length) {
      return;
    }

    const step = this.steps[index];
    this.currentStep = index;

    // Update progress dots
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    // Animate text
    await this.typeText(step.damerisText, step.subtitle);

    // Show mode showcase on step 3
    if (step.id === 'capabilities') {
      const showcase = document.getElementById('modes-showcase');
      if (showcase) {
        showcase.classList.remove('hidden');
        setTimeout(() => {
          showcase.querySelectorAll('.mode-card').forEach(card => {
            card.classList.add('show');
          });
        }, 500);
      }
    } else {
      const showcase = document.getElementById('modes-showcase');
      if (showcase) {
        showcase.classList.add('hidden');
      }
    }

    // Show begin button on last step
    if (step.showButton) {
      const buttonContainer = document.getElementById('begin-button-container');
      if (buttonContainer) {
        buttonContainer.classList.remove('hidden');
      }

      // Show Enter hint on last step
      const enterHint = document.getElementById('enter-hint');
      if (enterHint) {
        enterHint.classList.remove('hidden');
        enterHint.classList.add('flex');
      }
    } else {
      // Hide Enter hint on other steps
      const enterHint = document.getElementById('enter-hint');
      if (enterHint) {
        enterHint.classList.add('hidden');
        enterHint.classList.remove('flex');
      }
    }

    // Speak text with voice
    await this.speak(step.voiceText);

    // Auto-advance to next step (except last)
    if (index < this.steps.length - 1) {
      setTimeout(() => {
        this.showStep(index + 1);
      }, step.duration || 5000);
    }
  }

  async typeText(text, subtitle) {
    const textEl = document.getElementById('dameris-text');
    const subtitleEl = document.getElementById('dameris-subtitle');

    if (!textEl || !subtitleEl) return;

    // Clear previous
    textEl.textContent = '';
    subtitleEl.textContent = '';

    // Fade in (faster)
    textEl.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 150));

    // Type out text (faster transition)
    textEl.textContent = text;
    textEl.style.opacity = '1';
    textEl.style.transition = 'opacity 0.5s ease-in-out';

    await new Promise(resolve => setTimeout(resolve, 250));

    // Show subtitle (faster)
    subtitleEl.textContent = subtitle;
    subtitleEl.style.opacity = '1';
    subtitleEl.style.transition = 'opacity 0.4s ease-in-out';
  }

  async speak(text) {
    if (!text) return;

    try {
      const indicator = document.getElementById('audio-indicator');
      const avatar = document.getElementById('dameris-avatar');

      if (indicator) {
        indicator.style.opacity = '1';
      }

      // Add voice-active class for visual feedback
      if (avatar) {
        avatar.classList.add('voice-active');
      }

      // Get a random female voice for Dameris
      const femaleVoices = [
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella' },
        { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli' },
        { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy' },
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Grace' },
        { id: 'oWAxZDx7w5VEj9dCyTzz', name: 'Charlotte' },
        { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi' },
        { id: 'XB0fDUnXU5powFXDhCwa', name: 'Matilda' }
      ];
      const randomVoice = femaleVoices[Math.floor(Math.random() * femaleVoices.length)];

      // Call TTS API with random voice
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: randomVoice.id
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        this.audioPlayer = new Audio(audioUrl);
        this.isPlaying = true;

        await new Promise(resolve => {
          this.audioPlayer.onended = () => {
            this.isPlaying = false;
            if (indicator) {
              indicator.style.opacity = '0';
            }
            // Remove voice-active class when done
            if (avatar) {
              avatar.classList.remove('voice-active');
            }
            resolve();
          };
          this.audioPlayer.play();
        });
      } else {
        // Voice failed, just wait
        await new Promise(resolve => setTimeout(resolve, 3000));
        if (indicator) {
          indicator.style.opacity = '0';
        }
      }
    } catch (error) {
      console.error('[Dameris Welcome] TTS error:', error);
      // Continue without voice
      const indicator = document.getElementById('audio-indicator');
      if (indicator) {
        indicator.style.opacity = '0';
      }
    }
  }

  complete() {
    const container = document.getElementById('dameris-welcome');
    if (!container) return;

    // Stop any playing audio
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }

    // Faster fade out
    container.style.transition = 'opacity 0.3s ease-out';
    container.style.opacity = '0';

    setTimeout(() => {
      container.remove();
      localStorage.setItem('fuguestate_dameris_intro_completed', 'true');
      localStorage.setItem('fuguestate_onboarding_completed', 'true');

      // Clean up URL
      const url = new URL(window.location.href);
      if (url.searchParams.get('welcome') === 'true') {
        url.searchParams.delete('welcome');
        window.history.replaceState({}, '', url);
      }

      // Navigate to voice page if not already there
      if (!window.location.pathname.includes('voice')) {
        window.location.href = '/voice';
      }
    }, 300);  // Reduced from 1000ms to 300ms

    // Stop audio if playing
    if (this.audioPlayer && this.isPlaying) {
      this.audioPlayer.pause();
    }

    // Stop audio visualization
    if (this.audioInterval) {
      clearInterval(this.audioInterval);
    }
  }

  replay() {
    localStorage.removeItem('fuguestate_dameris_intro_completed');
    this.currentStep = 0;
    this.start();
  }
}

// Initialize
window.damerisWelcome = new DamerisWelcome();

// Export for manual replay
window.replayWelcome = () => {
  if (window.damerisWelcome) {
    window.damerisWelcome.replay();
  }
};
