# ElevenLabs Sound Generation Prompts

## Updated Prompts for Improved Sounds

This document contains improved prompts for generating sounds with ElevenLabs that avoid scary or dark tones while maintaining the intended moods.

---

## Priority Fixes: Scary Sounds

### 1. Meditation Ambient (About Page) - UPDATED

**File to replace**: `/public/audio/ambient/meditation.mp3`  
**Current issue**: Too dark/scary instead of calm and reflective  
**Page usage**: `/about.html`

**ElevenLabs Prompt**:
```
Gentle meditation ambient, warm and peaceful, soft harmonic tones with light reverb, calming and reflective atmosphere, no dark or ominous elements, bright and welcoming, seamless loop
```

**Specifications**:
- **Length**: 40-50 seconds
- **Mood**: Calm, reflective, warm (NOT dark or scary)
- **Key elements**: Warm, bright, welcoming, peaceful
- **Avoid**: Dark tones, ominous elements, scary textures

---

### 2. Space Ambient (Dameris Page) - UPDATED

**File to replace**: `/public/audio/ambient/space-ambient.mp3`  
**Current issue**: Too ominous/scary instead of mysterious but pleasant  
**Page usage**: `/dameris.html`

**ElevenLabs Prompt**:
```
Ethereal space ambient, mysterious but pleasant, soft synthesizer pads with gentle reverb, cosmic but not dark, light and airy texture, wonder-filled atmosphere, no ominous or scary tones, seamless loop
```

**Specifications**:
- **Length**: 45-60 seconds
- **Mood**: Mysterious but pleasant, wonder-filled (NOT scary or ominous)
- **Key elements**: Pleasant, wonder-filled, light, airy, cosmic
- **Avoid**: Ominous tones, scary elements, dark textures

---

## All Ambient Sounds (Complete Reference)

### 3. Dreamy (Homepage)

**File**: `/public/audio/ambient/dreamy.mp3`  
**Page usage**: `/index.html`

**ElevenLabs Prompt**:
```
Soft dreamy ambient, welcoming and warm, gentle synthesizer textures, soft reverb, nostalgic atmosphere, seamless loop
```

**Specifications**:
- **Length**: 35-45 seconds
- **Mood**: Dreamy, welcoming
- **Volume**: 0.3

---

### 4. Ethereal Pad (Guide Page)

**File**: `/public/audio/ambient/ethereal-pad.mp3`  
**Page usage**: `/guide.html`

**ElevenLabs Prompt**:
```
Light ethereal pad, airy and floating, high-frequency shimmer, delicate reverb tail, celestial atmosphere, seamless loop
```

**Specifications**:
- **Length**: 35-45 seconds
- **Mood**: Ethereal, light
- **Volume**: 0.28

---

### 5. Synth Pad (Chat Page)

**File**: `/public/audio/ambient/synth-pad.mp3`  
**Page usage**: `/studio/chat.html`

**ElevenLabs Prompt**:
```
Warm analog synthesizer pad, flowing and creative, smooth harmonic progression, gentle modulation, dreamy texture, seamless loop
```

**Specifications**:
- **Length**: 40-50 seconds
- **Mood**: Creative, flowing
- **Volume**: 0.3

---

### 6. Deep Drone (Modes Page)

**File**: `/public/audio/ambient/deep-drone.mp3`  
**Page usage**: `/modes/index.html`

**ElevenLabs Prompt**:
```
Deep contemplative drone, low frequency bass tones, meditative and introspective, subtle harmonic layers, atmospheric and immersive, seamless loop
```

**Specifications**:
- **Length**: 50-60 seconds
- **Mood**: Contemplative, deep
- **Volume**: 0.25

---

### 7. Dark Ambient (Workspace & Architecture Pages)

**File**: `/public/audio/ambient/dark-ambient.mp3`  
**Page usage**: `/studio/workspace.html`, `/architecture.html`

**ElevenLabs Prompt**:
```
Dark ambient atmosphere, focused and intense, deep bass undertones, subtle industrial textures, mysterious and brooding, seamless loop
```

**Specifications**:
- **Length**: 45-60 seconds
- **Mood**: Focused, intense
- **Volume**: 0.3
- **Note**: This one is intentionally darker for focus/work environments

---

### 8. Gentle Rain (Available but not mapped)

**File**: `/public/audio/ambient/rain-gentle.mp3`

**ElevenLabs Prompt**:
```
Gentle rain falling, peaceful and calming, soft water droplets, natural ambient texture, soothing background, seamless loop
```

**Specifications**:
- **Length**: 30-45 seconds
- **Mood**: Calm, peaceful
- **Volume**: 0.35

---

## UI Interaction Sounds (0.3-1.5 seconds)

### Click Soft
**File**: `/public/audio/ui/click-soft.mp3`  
**Prompt**: `Soft button click sound, gentle tactile feedback, subtle pop, clean and minimal, UI interaction`  
**Length**: 0.2-0.4 seconds  
**Volume**: 0.4

### Chime
**File**: `/public/audio/ui/chime.mp3`  
**Prompt**: `Gentle chime sound, success confirmation, pleasant bell-like tone, clear and bright, positive feedback`  
**Length**: 0.5-1.0 seconds  
**Volume**: 0.5

### Whoosh
**File**: `/public/audio/ui/whoosh.mp3`  
**Prompt**: `Smooth whoosh sound, air movement, transition effect, fast but gentle, major action feedback`  
**Length**: 0.4-0.8 seconds  
**Volume**: 0.3

### Swoosh
**File**: `/public/audio/ui/swoosh.mp3`  
**Prompt**: `Alternative swoosh sound, airy transition, lighter than whoosh, subtle movement, secondary transition`  
**Length**: 0.3-0.6 seconds  
**Volume**: 0.3

### Transition
**File**: `/public/audio/ui/transition.mp3`  
**Prompt**: `Page transition sound, subtle movement, gentle whoosh, navigation feedback, clean and minimal`  
**Length**: 0.4-0.7 seconds  
**Volume**: 0.4

### Hover
**File**: `/public/audio/ui/hover.mp3`  
**Prompt**: `Subtle hover sound, very quiet, gentle tick, minimal feedback, mouse-over interaction`  
**Length**: 0.1-0.3 seconds  
**Volume**: 0.2

---

## Special Effects (0.5-2 seconds)

### Success
**File**: `/public/audio/sfx/success.mp3`  
**Prompt**: `Success sound effect, positive confirmation, pleasant tone, achievement feedback, clear and satisfying`  
**Length**: 0.8-1.5 seconds  
**Volume**: 0.5

### Pulse
**File**: `/public/audio/sfx/pulse.mp3`  
**Prompt**: `Pulse sound effect, system feedback, rhythmic beat, subtle and clean, notification pulse`  
**Length**: 0.3-0.6 seconds  
**Volume**: 0.4

### Notification
**File**: `/public/audio/sfx/notification.mp3`  
**Prompt**: `Notification alert sound, attention-grabbing but pleasant, clear tone, alert feedback`  
**Length**: 0.5-1.0 seconds  
**Volume**: 0.5

### Page Turn
**File**: `/public/audio/sfx/page-turn.mp3`  
**Prompt**: `Page turn sound, paper rustle, subtle document navigation, gentle texture, book-like`  
**Length**: 0.4-0.8 seconds  
**Volume**: 0.3

---

## Generation Tips

1. **Seamless Loops**: For ambient sounds, ensure the start and end match in pitch and texture. Generate 45-60 seconds, then edit to create a seamless loop (fade in/out at start/end).

2. **Volume Consistency**: Generate all sounds at a consistent level. The sound engine in `public/js/fugue-sound-engine.js` handles volume adjustments automatically.

3. **Avoid Harsh Frequencies**: Keep UI sounds clean and minimal. Avoid harsh or jarring frequencies that could be unpleasant.

4. **Testing**: After generating new sounds:
   - Test on `/about.html` - should feel calm and reflective, not scary
   - Test on `/dameris.html` - should feel mysterious but pleasant, not ominous
   - Ensure seamless looping for ambient tracks
   - Verify volume levels feel appropriate

5. **File Replacement**: Simply replace the files in `/public/audio/` with your generated versions. No code changes needed - the sound engine will automatically use the new files.

---

## Priority Order

1. **Meditation** (`meditation.mp3`) - About page is too scary
2. **Space Ambient** (`space-ambient.mp3`) - Dameris page is too ominous
3. Other sounds can be updated as needed
























