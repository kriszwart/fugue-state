/**
 * Ambient Sound System for FugueState.ai
 * Handles background ambient sounds and sound effects
 */

class AmbientSoundSystem {
  constructor() {
    this.sounds = {};
    this.currentAmbient = null;
    this.volume = 0.3; // Default volume (30%)
    this.enabled = true;

    // Load user preferences
    this.loadPreferences();

    // Initialize ambient sounds
    this.initializeSounds();
  }

  /**
   * Load user preferences from localStorage
   */
  loadPreferences() {
    const savedVolume = localStorage.getItem('fuguestate_ambient_volume');
    const savedEnabled = localStorage.getItem('fuguestate_ambient_enabled');

    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
    }

    if (savedEnabled !== null) {
      this.enabled = savedEnabled === 'true';
    }
  }

  /**
   * Save user preferences to localStorage
   */
  savePreferences() {
    localStorage.setItem('fuguestate_ambient_volume', this.volume.toString());
    localStorage.setItem('fuguestate_ambient_enabled', this.enabled.toString());
  }

  /**
   * Initialize sound definitions
   * You can add your own audio files here
   */
  initializeSounds() {
    // Define ambient sound tracks
    // Replace these URLs with your actual audio files
    this.soundTracks = {
      // Ambient backgrounds
      'ambient-space': {
        url: '/audio/ambient/space-ambient.mp3',
        loop: true,
        volume: 0.3,
        description: 'Ethereal space ambient'
      },
      'ambient-rain': {
        url: '/audio/ambient/rain-gentle.mp3',
        loop: true,
        volume: 0.4,
        description: 'Gentle rain'
      },
      'ambient-synth': {
        url: '/audio/ambient/synth-pad.mp3',
        loop: true,
        volume: 0.3,
        description: 'Dreamy synthesizer'
      },
      'ambient-drone': {
        url: '/audio/ambient/deep-drone.mp3',
        loop: true,
        volume: 0.25,
        description: 'Deep atmospheric drone'
      },

      // Sound effects
      'sfx-pulse': {
        url: '/audio/sfx/pulse.mp3',
        loop: false,
        volume: 0.5,
        description: 'Pulse effect'
      },
      'sfx-chime': {
        url: '/audio/sfx/chime.mp3',
        loop: false,
        volume: 0.6,
        description: 'Gentle chime'
      },
      'sfx-whoosh': {
        url: '/audio/sfx/whoosh.mp3',
        loop: false,
        volume: 0.4,
        description: 'Whoosh transition'
      },
    };
  }

  /**
   * Create an audio element for a sound
   */
  createSound(soundKey) {
    if (!this.soundTracks[soundKey]) {
      console.warn(`Sound "${soundKey}" not found`);
      return null;
    }

    const track = this.soundTracks[soundKey];
    const audio = new Audio(track.url);
    audio.loop = track.loop;
    audio.volume = (track.volume || 0.5) * this.volume;

    // Handle errors gracefully
    audio.addEventListener('error', (e) => {
      console.warn(`Failed to load audio: ${track.url}`, e);
    });

    this.sounds[soundKey] = audio;
    return audio;
  }

  /**
   * Play ambient background sound
   */
  playAmbient(soundKey, fadeIn = true) {
    if (!this.enabled) return;

    // Stop current ambient if playing
    if (this.currentAmbient) {
      this.stopAmbient(fadeIn);
    }

    // Create or get the sound
    let audio = this.sounds[soundKey];
    if (!audio) {
      audio = this.createSound(soundKey);
    }

    if (!audio) return;

    // Fade in
    if (fadeIn) {
      audio.volume = 0;
      audio.play().catch(e => console.warn('Audio play failed:', e));
      this.fadeVolume(audio, (this.soundTracks[soundKey].volume || 0.5) * this.volume, 2000);
    } else {
      audio.volume = (this.soundTracks[soundKey].volume || 0.5) * this.volume;
      audio.play().catch(e => console.warn('Audio play failed:', e));
    }

    this.currentAmbient = soundKey;
  }

  /**
   * Stop ambient background sound
   */
  stopAmbient(fadeOut = true) {
    if (!this.currentAmbient) return;

    const audio = this.sounds[this.currentAmbient];
    if (!audio) return;

    if (fadeOut) {
      this.fadeVolume(audio, 0, 1500, () => {
        audio.pause();
        audio.currentTime = 0;
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }

    this.currentAmbient = null;
  }

  /**
   * Play a sound effect (one-shot, non-looping)
   */
  playSFX(soundKey) {
    if (!this.enabled) return;

    let audio = this.sounds[soundKey];
    if (!audio) {
      audio = this.createSound(soundKey);
    }

    if (!audio) return;

    // Clone the audio for multiple simultaneous plays
    const clone = audio.cloneNode();
    clone.volume = (this.soundTracks[soundKey].volume || 0.5) * this.volume;
    clone.play().catch(e => console.warn('Audio play failed:', e));
  }

  /**
   * Fade audio volume over time
   */
  fadeVolume(audio, targetVolume, duration, callback) {
    const startVolume = audio.volume;
    const volumeChange = targetVolume - startVolume;
    const steps = 60; // 60 steps for smooth fade
    const stepDuration = duration / steps;
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      audio.volume = startVolume + (volumeChange * progress);

      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        audio.volume = targetVolume;
        if (callback) callback();
      }
    }, stepDuration);
  }

  /**
   * Set global volume
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.savePreferences();

    // Update current ambient volume
    if (this.currentAmbient && this.sounds[this.currentAmbient]) {
      const audio = this.sounds[this.currentAmbient];
      const track = this.soundTracks[this.currentAmbient];
      audio.volume = (track.volume || 0.5) * this.volume;
    }
  }

  /**
   * Toggle ambient sounds on/off
   */
  toggle() {
    this.enabled = !this.enabled;
    this.savePreferences();

    if (!this.enabled && this.currentAmbient) {
      this.stopAmbient(true);
    }

    return this.enabled;
  }

  /**
   * Get list of available ambient tracks
   */
  getAmbientTracks() {
    return Object.keys(this.soundTracks)
      .filter(key => this.soundTracks[key].loop)
      .map(key => ({
        key,
        description: this.soundTracks[key].description
      }));
  }
}

// Create global instance
window.ambientSound = new AmbientSoundSystem();

/**
 * Helper function to add ambient sound controls to a page
 */
function addAmbientControls(container) {
  const controlsHTML = `
    <div class="ambient-controls fixed bottom-6 right-6 z-50">
      <div class="bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl relative">
        <!-- Close Button -->
        <button id="ambient-close" class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-zinc-800 hover:bg-red-600 border border-white/10 transition-colors flex items-center justify-center text-zinc-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="flex items-center justify-between mb-3">
          <span class="text-xs text-zinc-300 uppercase tracking-wider">Ambient Sound</span>
          <button id="ambient-toggle" class="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="volume-icon text-zinc-400">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
          </button>
        </div>

        <div class="space-y-2">
          <label class="text-xs text-zinc-400">Volume</label>
          <input type="range" id="ambient-volume" min="0" max="100" value="${window.ambientSound.volume * 100}"
            class="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-500">
        </div>

        <div class="mt-3 space-y-1" id="ambient-tracks">
          <!-- Tracks will be populated here -->
        </div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', controlsHTML);

  // Populate tracks
  const tracksContainer = document.getElementById('ambient-tracks');
  const tracks = window.ambientSound.getAmbientTracks();

  tracks.forEach(track => {
    const trackButton = document.createElement('button');
    trackButton.className = 'w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800 transition-colors';
    trackButton.textContent = track.description;
    trackButton.dataset.track = track.key;

    trackButton.addEventListener('click', () => {
      window.ambientSound.playAmbient(track.key, true);

      // Update active state
      tracksContainer.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('bg-violet-900/50', 'text-violet-300');
      });
      trackButton.classList.add('bg-violet-900/50', 'text-violet-300');
    });

    tracksContainer.appendChild(trackButton);
  });

  // Volume control
  document.getElementById('ambient-volume').addEventListener('input', (e) => {
    window.ambientSound.setVolume(e.target.value / 100);
  });

  // Toggle button
  document.getElementById('ambient-toggle').addEventListener('click', () => {
    const enabled = window.ambientSound.toggle();
    const icon = document.querySelector('.volume-icon');

    if (enabled) {
      icon.style.opacity = '1';
    } else {
      icon.style.opacity = '0.3';
    }
  });

  // Close button
  document.getElementById('ambient-close').addEventListener('click', () => {
    const controls = document.querySelector('.ambient-controls');
    controls.style.display = 'none';
  });
}
