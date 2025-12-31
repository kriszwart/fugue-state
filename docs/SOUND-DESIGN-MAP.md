# FugueState.ai - Sound Design Map

## 🎵 Enhanced Sound Engine Features

### Intelligent Page-Aware System
- **Auto-detects current page** and plays appropriate ambient
- **Smooth transitions** when navigating between pages (1.5s fadeout, 2s fadein)
- **Smart UI sound effects** - Different sounds for CTAs, modes, navigation, and regular clicks
- **Floating Sound Widget** - Beautiful minimalist control panel
- **Volume memory** - remembers your preferences
- **Ducking** - automatically lowers ambient when voices speak
- **Quick ambient switching** - Change ambients on the fly
- **Visual sound indicator** - Animated visualizer shows what's playing

## 📍 Page-to-Ambient Mapping

| Page | Ambient Sound | Mood | Description |
|------|--------------|------|-------------|
| **Home** (`/index.html`) | Dreamy | Welcoming | Soft, inviting atmosphere |
| **About** (`/about.html`) | Meditation | Reflective | Calm, contemplative space |
| **Guide** (`/guide.html`) | Ethereal Pad | Instructive | Light, airy guidance |
| **Dameris** (`/dameris.html`) | Space Ambient | Mysterious | Otherworldly AI presence |
| **Workspace** (`/studio/workspace.html`) | Dark Ambient | Focused | Deep concentration mode |
| **Chat** (`/studio/chat.html`) | Synth Pad | Creative | Flowing conversation |
| **Modes** (`/modes/index.html`) | Deep Drone | Contemplative | Deep exploration |
| **Architecture** (`/architecture.html`) | Dark Ambient | Technical | System-level focus |

## 🎹 Available Ambient Tracks (8 total)

1. **Space Ambient** - Ethereal and mysterious
2. **Synth Pad** - Creative and flowing
3. **Deep Drone** - Contemplative and deep
4. **Gentle Rain** - Calming and peaceful
5. **Ethereal Pad** - Light and airy
6. **Dark Ambient** - Focused and intense
7. **Meditation** - Reflective and calm
8. **Dreamy** - Soft and welcoming

## 🔊 UI Sound Effects (6 total)

- **Hover** - Subtle feedback on mouse-over (30% probability)
- **Click** - Soft click for buttons
- **Whoosh** - For major CTAs like "Enter Studio"
- **Swoosh** - Alternative transition sound
- **Transition** - For page navigation links
- **Chime** - Success confirmations

## ⚙️ How It Works

### Auto-Start
1. User clicks anywhere on the page
2. Sound engine initializes
3. Detects current page
4. Plays appropriate ambient with 2-second fade-in
5. Attaches UI sound listeners

### Navigation
- When you navigate to a new page
- Ambient smoothly transitions (1.5s fade-out, 2s fade-in)
- New ambient matches the new page's mood

### Voice Integration
- When Dameris speaks, ambient ducks to 50%
- When she finishes, ambient returns to normal
- Smooth 300ms transitions

## 🎚️ Controls

```javascript
// Access the global sound engine
window.fugueSoundEngine

// Methods:
.init()                    // Initialize (auto-called on first click)
.playAmbient('name')      // Play specific ambient
.playUI('ui-click')       // Play UI sound
.setVolume(0.5)           // Set volume (0-1)
.toggle()                 // Toggle on/off
.duck(0.5, 300)           // Duck volume temporarily
```

## 📋 Adding to New Pages

Add this snippet before closing `</body>` tag:

\`\`\`html
<script src="/js/fugue-sound-engine.js"></script>
<script>
  // Sound engine auto-initializes on first user interaction
  console.log('Sound engine loaded');
</script>
\`\`\`

That's it! The engine automatically detects the page and plays the right ambient.

## 🎧 User Experience

### First Visit
1. User lands on homepage
2. Clicks anywhere
3. Dreamy ambient fades in softly
4. Subtle hover sounds on buttons

### Navigation
1. User clicks "About"
2. Whoosh sound plays
3. Dreamy fades out (1.5s)
4. Meditation fades in (2s)
5. New page ambient continues

### Voice Interaction
1. User clicks "Hear My Voice" on Dameris page
2. Ambient ducks to 50%
3. Dameris speaks with ElevenLabs voice
4. When finished, ambient returns
5. Smooth, professional audio mixing

## 🔧 Customization

Edit `/public/js/fugue-sound-engine.js`:

- **Sound Map**: Change which ambient plays where (line 20)
- **Volume Levels**: Adjust individual track volumes (line 40)
- **UI Sound Probability**: Change hover sound frequency (line 256)

## 📦 Audio Files

All audio files are free from **Mixkit.co** (no attribution required):
- Format: MP3
- Quality: 128kbps
- Total size: ~2MB
- License: Free for commercial use

## 🚀 Performance

- Lazy loading: Sounds only load when needed
- Memory efficient: Reuses audio elements
- Smooth fading: 60 FPS fade animations
- No jank: All audio operations are async

## 🎛️ Sound Control Widget

### Features
- **Floating Orb** - Minimalist pulsing visualizer when minimized
- **Expand on Demand** - Click to reveal full control panel
- **Quick Ambient Switch** - 4 preset ambients (Space, Dreamy, Focus, Calm)
- **Volume Slider** - Real-time volume control with visual feedback
- **UI Sounds Toggle** - Enable/disable button clicks and hovers
- **Current Track Display** - Shows what's currently playing
- **Auto-minimize** - Automatically minimizes after 5 seconds on first visit

### Usage
The widget appears in the bottom-right corner and can be:
- **Clicked** to expand/minimize
- **Controlled** via volume slider
- **Customized** with quick ambient presets

## 🎼 Enhanced Sound Detection

### Smart Sound Selection
The engine now intelligently selects sounds based on:

**Major CTAs** (Whoosh sound):
- "Enter Studio"
- "Begin Sequence"
- "Get Started"
- "Become a Dreamer"
- Elements with class `cta`

**Mode Selections** (Chime sound):
- "Reflective"
- "Creative"
- "Autonomous"
- "Curatorial"
- Elements with class `mode`

**Navigation Links** (Transition sound):
- Internal links (starting with `/` or containing `.html`)
- Page navigation elements

**Regular Interactions** (Click sound):
- Standard buttons
- External links
- Generic clickable elements

### Voice Integration
Ambient automatically ducks to 50% when:
- Dameris speaks on the Dameris page
- Any voice narration is active
- Returns to normal volume after speaking ends

## 📊 Sound Library (Extended)

### Ambient Tracks (8 total)
1. **Space Ambient** - Ethereal and mysterious (0.3 vol)
2. **Synth Pad** - Creative and flowing (0.3 vol)
3. **Deep Drone** - Contemplative and deep (0.25 vol)
4. **Gentle Rain** - Calming and peaceful (0.35 vol)
5. **Ethereal Pad** - Light and airy (0.28 vol)
6. **Dark Ambient** - Focused and intense (0.3 vol)
7. **Meditation** - Reflective and calm (0.25 vol)
8. **Dreamy** - Soft and welcoming (0.3 vol)

### UI Sounds (6 total)
- **Hover** - Subtle feedback (30% probability, 0.2 vol)
- **Click** - Standard button press (0.4 vol)
- **Whoosh** - Major CTAs (0.3 vol)
- **Swoosh** - Alternative transition (0.3 vol)
- **Transition** - Page navigation (0.4 vol)
- **Chime** - Mode selections & confirmations (0.5 vol)

### SFX (4 total)
- **Success** - Task completion (0.5 vol)
- **Pulse** - System feedback (0.4 vol)
- **Notification** - Alerts (0.5 vol)
- **Page Turn** - Document navigation (0.3 vol)
