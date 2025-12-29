/**
 * FugueState Sound Control Widget
 * A beautiful, minimal floating UI for controlling the sound experience
 */

class SoundControlWidget {
  constructor() {
    this.isVisible = false;
    this.isMinimized = localStorage.getItem('sound_widget_minimized') === 'true';
    this.init();
  }

  init() {
    // Wait for sound engine to be ready
    if (!window.fugueSoundEngine) {
      setTimeout(() => this.init(), 100);
      return;
    }

    this.createWidget();
    this.attachEventListeners();

    // Auto-hide after 5 seconds on first load
    if (!localStorage.getItem('sound_widget_seen')) {
      setTimeout(() => {
        this.show();
        setTimeout(() => {
          this.minimize();
          localStorage.setItem('sound_widget_seen', 'true');
        }, 5000);
      }, 2000);
    } else if (!this.isMinimized) {
      this.show();
    }
  }

  createWidget() {
    const widget = document.createElement('div');
    widget.id = 'sound-control-widget';
    widget.className = `fixed bottom-6 right-6 z-[9999] transition-all duration-500 ${this.isMinimized ? 'minimized' : ''}`;

    widget.innerHTML = `
      <style>
        #sound-control-widget {
          font-family: 'Inter', sans-serif;
        }

        #sound-control-widget.minimized .widget-expanded {
          opacity: 0;
          pointer-events: none;
          transform: scale(0.8) translateY(20px);
        }

        #sound-control-widget.minimized .widget-minimized {
          opacity: 1;
          pointer-events: auto;
        }

        #sound-control-widget:not(.minimized) .widget-minimized {
          opacity: 0;
          pointer-events: none;
        }

        .sound-visualizer-bar {
          animation: sound-pulse 1.2s ease-in-out infinite;
        }

        @keyframes sound-pulse {
          0%, 100% { height: 4px; opacity: 0.4; }
          50% { height: 12px; opacity: 1; }
        }

        .widget-expanded {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .widget-minimized {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .volume-slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }

        .volume-slider::-webkit-slider-track {
          background: rgba(63, 63, 70, 1);
          height: 4px;
          border-radius: 2px;
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          background: #a78bfa;
          height: 14px;
          width: 14px;
          border-radius: 50%;
          cursor: pointer;
          margin-top: -5px;
          box-shadow: 0 0 8px rgba(167, 139, 250, 0.5);
        }

        .volume-slider::-moz-range-track {
          background: rgba(63, 63, 70, 1);
          height: 4px;
          border-radius: 2px;
        }

        .volume-slider::-moz-range-thumb {
          background: #a78bfa;
          height: 14px;
          width: 14px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(167, 139, 250, 0.5);
        }

        .ambient-track-btn {
          transition: all 0.2s;
        }

        .ambient-track-btn.active {
          background: rgba(167, 139, 250, 0.2);
          border-color: rgba(167, 139, 250, 0.5);
          color: #c4b5fd;
        }
      </style>

      <!-- Minimized State (Floating Orb) -->
      <div class="widget-minimized absolute bottom-0 right-0">
        <button
          id="widget-expand-btn"
          class="w-14 h-14 rounded-full bg-gradient-to-br from-violet-950/90 to-purple-950/90 backdrop-blur-xl border border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.3)] flex items-center justify-center group hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-all hover:scale-110"
          title="Open Sound Controls"
        >
          <div class="flex items-center gap-0.5">
            <div class="sound-visualizer-bar w-0.5 bg-violet-400 rounded-full" style="animation-delay: 0s;"></div>
            <div class="sound-visualizer-bar w-0.5 bg-violet-400 rounded-full" style="animation-delay: 0.1s;"></div>
            <div class="sound-visualizer-bar w-0.5 bg-violet-400 rounded-full" style="animation-delay: 0.2s;"></div>
            <div class="sound-visualizer-bar w-0.5 bg-violet-400 rounded-full" style="animation-delay: 0.1s;"></div>
          </div>
        </button>
      </div>

      <!-- Expanded State -->
      <div class="widget-expanded">
        <div class="bg-zinc-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 p-5 w-80 relative">

          <!-- Close/Minimize Button -->
          <button
            id="widget-minimize-btn"
            class="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
            title="Minimize"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          <!-- Header -->
          <div class="flex items-center gap-3 mb-5 pb-4 border-b border-white/5">
            <div class="flex items-center gap-1">
              <div class="sound-visualizer-bar w-1 bg-violet-400 rounded-full" style="animation-delay: 0s;"></div>
              <div class="sound-visualizer-bar w-1 bg-violet-400 rounded-full" style="animation-delay: 0.1s;"></div>
              <div class="sound-visualizer-bar w-1 bg-violet-400 rounded-full" style="animation-delay: 0.2s;"></div>
              <div class="sound-visualizer-bar w-1 bg-violet-400 rounded-full" style="animation-delay: 0.1s;"></div>
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-medium text-zinc-200">Sound Experience</h3>
              <p id="current-ambient-label" class="text-xs text-zinc-500">Loading...</p>
            </div>
            <button
              id="toggle-sound-btn"
              class="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
              title="Toggle All Sounds"
            >
              <svg id="sound-on-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-violet-400">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
              <svg id="sound-off-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-600 hidden">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            </button>
          </div>

          <!-- Volume Control -->
          <div class="mb-5">
            <div class="flex justify-between items-center mb-2">
              <label class="text-xs text-zinc-400">Volume</label>
              <span id="volume-value" class="text-xs text-zinc-500 font-mono">25%</span>
            </div>
            <input
              type="range"
              id="volume-slider"
              class="volume-slider w-full"
              min="0"
              max="100"
              value="25"
            >
          </div>

          <!-- Quick Ambient Selector -->
          <div class="mb-4">
            <label class="text-xs text-zinc-400 mb-2 block">Quick Switch</label>
            <div class="grid grid-cols-2 gap-2" id="ambient-quick-select">
              <!-- Will be populated dynamically -->
            </div>
          </div>

          <!-- UI Sounds Toggle -->
          <div class="flex items-center justify-between">
            <span class="text-xs text-zinc-400">UI Sounds</span>
            <button
              id="toggle-ui-sounds"
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-zinc-700"
            >
              <span class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform translate-x-1"></span>
            </button>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(widget);
    this.widget = widget;
    this.updateUI();
  }

  attachEventListeners() {
    const soundEngine = window.fugueSoundEngine;

    // Minimize/Expand
    document.getElementById('widget-minimize-btn').addEventListener('click', () => this.minimize());
    document.getElementById('widget-expand-btn').addEventListener('click', () => this.expand());

    // Toggle all sounds
    document.getElementById('toggle-sound-btn').addEventListener('click', () => {
      soundEngine.toggle();
      this.updateUI();
    });

    // Volume slider
    const volumeSlider = document.getElementById('volume-slider');
    volumeSlider.addEventListener('input', (e) => {
      const volume = e.target.value / 100;
      soundEngine.setVolume(volume);
      document.getElementById('volume-value').textContent = `${e.target.value}%`;
    });

    // Initialize volume
    volumeSlider.value = soundEngine.volume * 100;
    document.getElementById('volume-value').textContent = `${Math.round(soundEngine.volume * 100)}%`;

    // UI Sounds toggle
    const uiSoundsToggle = document.getElementById('toggle-ui-sounds');
    uiSoundsToggle.addEventListener('click', () => {
      soundEngine.uiSoundsEnabled = !soundEngine.uiSoundsEnabled;
      soundEngine.savePreferences();
      this.updateUIToggle();
    });
    this.updateUIToggle();

    // Populate ambient quick select
    this.populateAmbientSelector();

    // Update current ambient label periodically
    setInterval(() => this.updateCurrentAmbientLabel(), 1000);
  }

  populateAmbientSelector() {
    const container = document.getElementById('ambient-quick-select');
    const soundEngine = window.fugueSoundEngine;

    const quickAmbients = [
      { key: 'ambient-space', label: 'Space', icon: '🌌' },
      { key: 'ambient-dreamy', label: 'Dreamy', icon: '💭' },
      { key: 'ambient-dark', label: 'Focus', icon: '🎯' },
      { key: 'ambient-meditation', label: 'Calm', icon: '🧘' },
    ];

    quickAmbients.forEach(ambient => {
      const btn = document.createElement('button');
      btn.className = 'ambient-track-btn px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 transition-all flex items-center gap-2';
      btn.innerHTML = `<span>${ambient.icon}</span><span>${ambient.label}</span>`;
      btn.addEventListener('click', () => {
        soundEngine.playAmbient(ambient.key, true);
        this.updateAmbientButtons();
      });
      container.appendChild(btn);
    });

    this.updateAmbientButtons();
  }

  updateAmbientButtons() {
    const soundEngine = window.fugueSoundEngine;
    const buttons = document.querySelectorAll('.ambient-track-btn');
    const quickAmbients = ['ambient-space', 'ambient-dreamy', 'ambient-dark', 'ambient-meditation'];

    buttons.forEach((btn, index) => {
      if (soundEngine.currentAmbient === quickAmbients[index]) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  updateUIToggle() {
    const soundEngine = window.fugueSoundEngine;
    const toggle = document.getElementById('toggle-ui-sounds');
    const thumb = toggle.querySelector('span');

    if (soundEngine.uiSoundsEnabled) {
      toggle.classList.add('bg-violet-500');
      toggle.classList.remove('bg-zinc-700');
      thumb.classList.add('translate-x-5');
      thumb.classList.remove('translate-x-1');
    } else {
      toggle.classList.remove('bg-violet-500');
      toggle.classList.add('bg-zinc-700');
      thumb.classList.remove('translate-x-5');
      thumb.classList.add('translate-x-1');
    }
  }

  updateCurrentAmbientLabel() {
    const soundEngine = window.fugueSoundEngine;
    const label = document.getElementById('current-ambient-label');

    if (!soundEngine.currentAmbient) {
      label.textContent = 'No ambient playing';
      return;
    }

    const ambientInfo = soundEngine.soundLibrary[soundEngine.currentAmbient];
    if (ambientInfo) {
      label.textContent = `Playing: ${ambientInfo.description || soundEngine.currentAmbient}`;
    }
  }

  updateUI() {
    const soundEngine = window.fugueSoundEngine;
    const soundOnIcon = document.getElementById('sound-on-icon');
    const soundOffIcon = document.getElementById('sound-off-icon');

    if (soundEngine.enabled) {
      soundOnIcon.classList.remove('hidden');
      soundOffIcon.classList.add('hidden');
    } else {
      soundOnIcon.classList.add('hidden');
      soundOffIcon.classList.remove('hidden');
    }

    this.updateCurrentAmbientLabel();
    this.updateAmbientButtons();
  }

  minimize() {
    this.widget.classList.add('minimized');
    this.isMinimized = true;
    localStorage.setItem('sound_widget_minimized', 'true');
  }

  expand() {
    this.widget.classList.remove('minimized');
    this.isMinimized = false;
    localStorage.setItem('sound_widget_minimized', 'false');
    this.updateUI();
  }

  show() {
    this.widget.style.opacity = '1';
    this.widget.style.pointerEvents = 'auto';
    this.isVisible = true;
  }

  hide() {
    this.widget.style.opacity = '0';
    this.widget.style.pointerEvents = 'none';
    this.isVisible = false;
  }
}

// Initialize widget when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.soundControlWidget = new SoundControlWidget();
  });
} else {
  window.soundControlWidget = new SoundControlWidget();
}
