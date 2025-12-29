/**
 * FugueState Sound Engine
 * Intelligent ambient sound system that responds to user navigation
 */

class FugueSoundEngine {
  constructor() {
    this.sounds = {};
    this.currentAmbient = null;
    this.volume = 0.25;
    this.enabled = true;
    this.uiSoundsEnabled = true;
    this.initialized = false;
    this.currentAmbientStorageKey = 'fugue_current_ambient';

    // Load preferences
    this.loadPreferences();

    // Sound design map - which ambient plays on which page
    this.soundMap = {
      '/': 'ambient-dreamy',
      '/index.html': 'ambient-dreamy',
      '/about': 'ambient-meditation',
      '/about.html': 'ambient-meditation',
      '/what-this-is': 'ambient-meditation',
      '/what-this-is.html': 'ambient-meditation',
      '/guide': 'ambient-ethereal-pad',
      '/guide.html': 'ambient-ethereal-pad',
      '/dameris': 'ambient-space',
      '/dameris.html': 'ambient-space',
      '/studio/workspace': 'ambient-dark',
      '/studio/workspace.html': 'ambient-dark',
      '/studio/chat': 'ambient-synth-pad',
      '/studio/chat.html': 'ambient-synth-pad',
      '/modes': 'ambient-deep-drone',
      '/modes/index.html': 'ambient-deep-drone',
      '/architecture': 'ambient-dark',
      '/architecture.html': 'ambient-dark',
    };

    // Define all available sounds
    this.soundLibrary = {
      // Ambient backgrounds
      'ambient-space': {
        url: '/audio/ambient/space-ambient.mp3',
        loop: true,
        volume: 0.3,
        mood: 'mysterious',
        description: 'Space Ambient - Ethereal and mysterious'
      },
      'ambient-synth-pad': {
        url: '/audio/ambient/synth-pad.mp3',
        loop: true,
        volume: 0.3,
        mood: 'creative',
        description: 'Synth Pad - Creative and flowing'
      },
      'ambient-deep-drone': {
        url: '/audio/ambient/deep-drone.mp3',
        loop: true,
        volume: 0.25,
        mood: 'contemplative',
        description: 'Deep Drone - Contemplative and deep'
      },
      'ambient-rain': {
        url: '/audio/ambient/rain-gentle.mp3',
        loop: true,
        volume: 0.35,
        mood: 'calm',
        description: 'Gentle Rain - Calming and peaceful'
      },
      'ambient-ethereal-pad': {
        url: '/audio/ambient/ethereal-pad.mp3',
        loop: true,
        volume: 0.28,
        mood: 'ethereal',
        description: 'Ethereal Pad - Light and airy'
      },
      'ambient-dark': {
        url: '/audio/ambient/dark-ambient.mp3',
        loop: true,
        volume: 0.3,
        mood: 'focused',
        description: 'Dark Ambient - Focused and intense'
      },
      'ambient-meditation': {
        url: '/audio/ambient/meditation.mp3',
        loop: true,
        volume: 0.25,
        mood: 'meditative',
        description: 'Meditation - Reflective and calm'
      },
      'ambient-dreamy': {
        url: '/audio/ambient/dreamy.mp3',
        loop: true,
        volume: 0.3,
        mood: 'dreamy',
        description: 'Dreamy - Soft and welcoming'
      },

      // UI Sounds
      'ui-click': { url: '/audio/ui/click-soft.mp3', loop: false, volume: 0.4 },
      'ui-chime': { url: '/audio/ui/chime.mp3', loop: false, volume: 0.5 },
      'ui-whoosh': { url: '/audio/ui/whoosh.mp3', loop: false, volume: 0.3 },
      'ui-swoosh': { url: '/audio/ui/swoosh.mp3', loop: false, volume: 0.3 },
      'ui-transition': { url: '/audio/ui/transition.mp3', loop: false, volume: 0.4 },
      'ui-hover': { url: '/audio/ui/hover.mp3', loop: false, volume: 0.2 },

      // Special effects
      'sfx-success': { url: '/audio/sfx/success.mp3', loop: false, volume: 0.5 },
      'sfx-pulse': { url: '/audio/sfx/pulse.mp3', loop: false, volume: 0.4 },
      'sfx-notification': { url: '/audio/sfx/notification.mp3', loop: false, volume: 0.5 },
      'sfx-page-turn': { url: '/audio/sfx/page-turn.mp3', loop: false, volume: 0.3 },
    };
  }

  loadPreferences() {
    const savedVolume = localStorage.getItem('fugue_sound_volume');
    const savedEnabled = localStorage.getItem('fugue_sound_enabled');
    const savedUIEnabled = localStorage.getItem('fugue_ui_sounds');

    if (savedVolume !== null) this.volume = parseFloat(savedVolume);
    if (savedEnabled !== null) this.enabled = savedEnabled === 'true';
    if (savedUIEnabled !== null) this.uiSoundsEnabled = savedUIEnabled === 'true';
  }

  savePreferences() {
    localStorage.setItem('fugue_sound_volume', this.volume.toString());
    localStorage.setItem('fugue_sound_enabled', this.enabled.toString());
    localStorage.setItem('fugue_ui_sounds', this.uiSoundsEnabled.toString());
  }

  /**
   * Initialize the sound engine (call after user interaction)
   */
  async init() {
    if (this.initialized || !this.enabled) return;

    this.initialized = true;

    // Prefer resuming the last ambient (Option A: keep playing across navigation)
    // Fallback to page mapping only if nothing has ever been set.
    this.playAmbientForCurrentPage(true, true);

    // Set up UI sound effects
    this.attachUIListeners();

    console.log('🎵 FugueState Sound Engine initialized');
  }

  /**
   * Get the current page path
   */
  getCurrentPage() {
    return window.location.pathname;
  }

  /**
   * Play appropriate ambient for the current page
   */
  playAmbientForCurrentPage(fadeIn = true, respectUserChoice = true) {
    if (respectUserChoice) {
      const savedAmbient = localStorage.getItem(this.currentAmbientStorageKey);
      if (savedAmbient && this.soundLibrary[savedAmbient]) {
        if (this.currentAmbient !== savedAmbient) {
          this.playAmbient(savedAmbient, fadeIn);
        }
        return;
      }
    }

    const currentPath = this.getCurrentPage();
    const ambientKey = this.soundMap[currentPath] || 'ambient-space';

    if (this.currentAmbient !== ambientKey) {
      this.playAmbient(ambientKey, fadeIn);
    }
  }

  /**
   * Create audio element
   */
  createSound(soundKey) {
    if (!this.soundLibrary[soundKey]) {
      console.warn(`Sound "${soundKey}" not found`);
      return null;
    }

    const track = this.soundLibrary[soundKey];
    const audio = new Audio(track.url);
    audio.loop = track.loop;
    audio.volume = (track.volume || 0.5) * this.volume;

    audio.addEventListener('error', (e) => {
      console.warn(`Failed to load audio: ${track.url}`);
    });

    this.sounds[soundKey] = audio;
    return audio;
  }

  /**
   * Play ambient background
   */
  playAmbient(soundKey, fadeIn = true) {
    if (!this.enabled) return;

    // Stop current ambient
    if (this.currentAmbient && this.currentAmbient !== soundKey) {
      this.stopAmbient(fadeIn);
    }

    // Get or create sound
    let audio = this.sounds[soundKey];
    if (!audio) {
      audio = this.createSound(soundKey);
    }

    if (!audio) return;

    // Play with optional fade-in
    if (fadeIn) {
      audio.volume = 0;
      audio.play().catch(e => console.warn('Audio play failed:', e));
      this.fadeVolume(audio, (this.soundLibrary[soundKey].volume || 0.5) * this.volume, 2000);
    } else {
      audio.volume = (this.soundLibrary[soundKey].volume || 0.5) * this.volume;
      audio.play().catch(e => console.warn('Audio play failed:', e));
    }

    this.currentAmbient = soundKey;
    // Persist current ambient so navigation keeps playing the same sound (Option A)
    try {
      localStorage.setItem(this.currentAmbientStorageKey, soundKey);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Stop ambient
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
   * Play UI sound effect
   */
  playUI(soundKey) {
    if (!this.enabled || !this.uiSoundsEnabled) return;

    let audio = this.sounds[soundKey];
    if (!audio) {
      audio = this.createSound(soundKey);
    }

    if (!audio) return;

    const clone = audio.cloneNode();
    clone.volume = (this.soundLibrary[soundKey].volume || 0.5) * this.volume;
    clone.play().catch(e => {});
  }

  /**
   * Fade volume smoothly
   */
  fadeVolume(audio, targetVolume, duration, callback) {
    const startVolume = audio.volume;
    const volumeChange = targetVolume - startVolume;
    const steps = 60;
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

    if (this.currentAmbient && this.sounds[this.currentAmbient]) {
      const audio = this.sounds[this.currentAmbient];
      const track = this.soundLibrary[this.currentAmbient];
      audio.volume = (track.volume || 0.5) * this.volume;
    }
  }

  /**
   * Toggle sound engine
   */
  toggle() {
    this.enabled = !this.enabled;
    this.savePreferences();

    if (!this.enabled && this.currentAmbient) {
      this.stopAmbient(true);
    } else if (this.enabled) {
      // Resume last chosen ambient if available, else fall back to page mapping
      this.playAmbientForCurrentPage(true, true);
    }

    return this.enabled;
  }

  /**
   * Attach UI sound listeners to interactive elements
   */
  attachUIListeners() {
    // Add subtle sounds to all buttons and links
    document.querySelectorAll('button, a[href]').forEach(el => {
      // Hover sound
      el.addEventListener('mouseenter', () => {
        if (Math.random() > 0.7) { // Only 30% of the time to avoid spam
          this.playUI('ui-hover');
        }
      });

      // Click sound - Enhanced detection for different interaction types
      el.addEventListener('click', (e) => {
        const text = el.textContent.toLowerCase();
        const classes = el.className.toLowerCase();

        // Major CTAs - Big whoosh
        if (
          classes.includes('cta') ||
          text.includes('enter studio') ||
          text.includes('begin sequence') ||
          text.includes('start') ||
          text.includes('get started') ||
          text.includes('become a dreamer')
        ) {
          this.playUI('ui-whoosh');
        }
        // Mode selections and important choices
        else if (
          text.includes('reflective') ||
          text.includes('creative') ||
          text.includes('autonomous') ||
          text.includes('curatorial') ||
          classes.includes('mode')
        ) {
          this.playUI('ui-chime');
        }
        // Navigation links
        else if (el.tagName === 'A' && el.getAttribute('href')) {
          // Internal navigation
          const href = el.getAttribute('href');
          if (href.startsWith('/') || href.includes('.html')) {
            this.playUI('ui-transition');
          } else {
            this.playUI('ui-click');
          }
        }
        // Regular buttons
        else {
          this.playUI('ui-click');
        }
      });
    });
  }

  /**
   * Play a special sound effect
   */
  playSFX(soundKey) {
    this.playUI(soundKey);
  }

  /**
   * Duck ambient volume (for voice/important sounds)
   */
  duck(amount = 0.5, duration = 300) {
    if (!this.currentAmbient) return;

    const audio = this.sounds[this.currentAmbient];
    if (!audio) return;

    const currentVol = audio.volume;
    const targetVol = currentVol * amount;

    this.fadeVolume(audio, targetVol, duration);

    return () => {
      // Return restore function
      this.fadeVolume(audio, currentVol, duration);
    };
  }
}

// Create global instance
window.fugueSoundEngine = new FugueSoundEngine();

// Auto-initialize on first user interaction
let soundInitialized = false;
const initSound = () => {
  if (!soundInitialized) {
    soundInitialized = true;
    window.fugueSoundEngine.init();
  }
};

document.addEventListener('click', initSound, { once: true });
document.addEventListener('keydown', initSound, { once: true });
