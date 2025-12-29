# 🎭 Muse Personality System - Making Dameris Personal

## Overview

The Muse Personality System makes Dameris adapt her communication style based on the user's chosen muse type. This creates a deeply personal AI companion that speaks in the way that resonates most with each user.

---

## 🎨 The Five Muses

### 1. **Analyst** (Logic & Pattern)
**Personality:** Analytical, structured, insightful
**Color:** Indigo/Blue
**Icon:** Bar Chart

**How Dameris Speaks:**
- "I've been analyzing your memory patterns..."
- "Let me break down what I'm seeing..."
- "I notice a correlation between..."
- Uses frameworks, lists, data points

**Perfect For:** Users who love structure, patterns, insights

---

### 2. **Poet** (Verse & Metaphor)
**Personality:** Lyrical, metaphorical, beautiful
**Color:** Violet/Purple
**Icon:** Feather

**How Dameris Speaks:**
- "Your memories bloom like..."
- "I see echoes of..."
- "There's a rhythm to your thoughts..."
- Uses rich imagery, metaphors, verses

**Perfect For:** Users who love beauty, poetry, emotional resonance

---

### 3. **Visualist** (Image & Color)
**Personality:** Cinematic, descriptive, vivid
**Color:** Amber/Orange
**Icon:** Eye

**How Dameris Speaks:**
- "Your memories paint in shades of..."
- "Picture this scene..."
- "In soft focus, this moment appears..."
- Uses visual descriptions, color palettes

**Perfect For:** Users who think visually, love imagery

---

### 4. **Narrator** (Voice & Saga)
**Personality:** Storytelling, dramatic, engaging
**Color:** Emerald/Teal
**Icon:** Microphone

**How Dameris Speaks:**
- "Your story unfolds..."
- "In this chapter of your life..."
- "Let me tell you about..."
- Uses narrative structure, story arcs

**Perfect For:** Users who love stories, narratives, drama

---

### 5. **Synthesis** (All & Beyond)
**Personality:** Multi-faceted, holistic, wise
**Color:** Purple/Fuchsia
**Icon:** Wand/Sparkles

**How Dameris Speaks:**
- "Seeing this through multiple lenses..."
- "The pattern creates a story painted in..."
- "Your memories speak in many voices..."
- Blends all approaches fluidly

**Perfect For:** Users who want the complete experience

---

## 🔧 How It Works

### 1. User Chooses Muse (Initialization)
```
[Choose your Muse Screen]
     ↓
User selects: "Synthesis"
     ↓
Saved to: user_preferences.muse_type
```

### 2. Muse Influences Dameris
```typescript
// In chat API
const museType = await getUserMuseType(userId)
const systemPrompt = getMuseSystemPrompt(museType)

// Dameris now speaks as chosen muse!
```

### 3. Returning User Greeting
```typescript
// When user returns after being away
<DamerisGreeting
  museType="synthesis"
  userName="Alice"
  lastVisit={yesterday}
  recentMemoriesCount={5}
  onStartConversation={(prompt) => sendMessage(prompt)}
/>
```

---

## 📁 Files Created

### `/lib/ai/muse-personalities.ts`
Core personality system with:
- 5 complete muse personalities
- System prompt generators
- Greeting generators
- Contextual prompts

### `/app/components/DamerisGreeting.tsx`
Beautiful greeting modal that:
- Shows personalized greeting based on muse
- Speaks with Dameris voice (TTS)
- Displays contextual prompts
- Shows stats (new memories, etc.)
- Adapts colors/icons to muse type

---

## 🎯 Integration Steps

### Step 1: Integrate into Chat System

**Modify `/app/api/chat/route.ts`:**
```typescript
import { getMuseSystemPrompt } from '@/lib/ai/muse-personalities'

// In POST handler
const museType = await getUserMusePreference(user.id) // Get from DB
const systemPrompt = getMuseSystemPrompt(museType)

// Use in LLM call
const response = await llm.generateResponse(messages, {
  systemPrompt, // Dameris now speaks as chosen muse!
  ...
})
```

### Step 2: Add Returning User Greeting

**Modify `/app/studio/page.tsx`:**
```typescript
import DamerisGreeting from '../components/DamerisGreeting'
import { getReturningUserGreeting } from '@/lib/ai/muse-personalities'

const [showGreeting, setShowGreeting] = useState(false)

useEffect(() => {
  // Check if user should see greeting
  const lastVisit = localStorage.getItem('last_visit_time')
  const timeSince = Date.now() - (lastVisit ? parseInt(lastVisit) : 0)

  // Show if been away for more than 1 hour
  if (timeSince > 60 * 60 * 1000) {
    setShowGreeting(true)
  }

  // Update last visit
  localStorage.setItem('last_visit_time', Date.now().toString())
}, [])

return (
  <>
    {showGreeting && (
      <DamerisGreeting
        museType={userPreferences.museType}
        userName={user.name}
        lastVisit={new Date(lastVisitTime)}
        recentMemoriesCount={newMemoriesCount}
        onClose={() => setShowGreeting(false)}
        onStartConversation={(prompt) => {
          sendChatMessage(prompt)
          setShowGreeting(false)
        }}
      />
    )}
    {/* Rest of studio... */}
  </>
)
```

### Step 3: Get Muse from User Preferences

**Create helper function:**
```typescript
// lib/utils/getUserMuseType.ts
import { createServerSupabaseClient } from '@/lib/supabase'
import type { MuseType } from '@/lib/ai/muse-personalities'

export async function getUserMuseType(userId: string): Promise<MuseType> {
  const supabase = createServerSupabaseClient()

  const { data } = await supabase
    .from('user_preferences')
    .select('muse_type')
    .eq('user_id', userId)
    .single()

  return (data?.muse_type || 'synthesis') as MuseType
}
```

---

## 🎬 User Experience Flow

### First Time User
```
1. Sign up / Login
2. Welcome experience plays
3. Choose Your Muse screen
4. Select muse (e.g., "Poet")
5. Awaken Muse button
6. Pipeline runs
7. Dameris speaks as Poet!
```

### Returning User (Same Day)
```
1. Login
2. Go to studio
3. Dameris in chat speaks as Poet
4. No greeting modal (seen recently)
```

### Returning User (After Day+)
```
1. Login
2. Go to studio
3. 🎭 DamerisGreeting modal appears!
   - "Welcome back. A day has passed since our last conversation."
   - "Your memories whisper a new verse. Shall I recite what I hear?"
   - [Shows new memories count]
   - [Let's Talk] button
4. Click "Let's Talk"
5. Modal closes, message sent
6. Dameris responds in Poet style
```

---

## 💬 Example Greetings by Muse

### Analyst
> "Welcome back. It's been 3 days since we last spoke. I've been analyzing your memory patterns. I notice 12 new connections forming. Shall we explore what insights have emerged?"

### Poet
> "Welcome back. Three days have woven themselves into memory. Your memories have been quietly composing themselves in your absence, like verses waiting to be heard. What story shall we weave today?"

### Visualist
> "Welcome back. 3 days have flown by. I've been watching the colors of your memories shift and blend. The canvas of your life has new hues to explore. Shall we look?"

### Narrator
> "Welcome back. It's been 3 days since our last conversation. The story continues... new chapters have written themselves. Let me show you where your narrative has wandered."

### Synthesis
> "Welcome back. Three days have turned since we talked. I've been holding space for your memories - patterns emerging, stories forming, colors blending. Your life's tapestry grows richer. Ready to see?"

---

## 🎨 Visual Design

### Greeting Modal Features
- **Background:** Animated gradients matching muse colors
- **Icon:** Muse-specific icon (Brain, Feather, Eye, Mic, Wand)
- **Voice:** Dameris speaks the greeting (TTS)
- **Stats:** Shows new memories, visual memories
- **Prompt:** Contextual conversation starter
- **Actions:** "Maybe Later" or "Let's Talk"

### Color System
```typescript
analyst:   from-indigo-600 to-blue-600
poet:      from-violet-600 to-purple-600
visualist: from-amber-600 to-orange-600
narrator:  from-emerald-600 to-teal-600
synthesis: from-purple-600 to-fuchsia-600
```

---

## 🧪 Testing

### Test Muse Personalities
```typescript
import { MUSE_PERSONALITIES, getMuseSystemPrompt } from '@/lib/ai/muse-personalities'

// Test each muse
Object.keys(MUSE_PERSONALITIES).forEach(muse => {
  console.log(`=== ${muse.toUpperCase()} ===`)
  console.log(getMuseSystemPrompt(muse as MuseType))
})
```

### Test Greetings
```typescript
import { getReturningUserGreeting } from '@/lib/ai/muse-personalities'

const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

// Test all muses
['analyst', 'poet', 'visualist', 'narrator', 'synthesis'].forEach(muse => {
  console.log(`${muse}:`, getReturningUserGreeting(muse as MuseType, 'Alice', yesterday))
})
```

### Test in Studio
```javascript
// In browser console on /studio
localStorage.removeItem('last_visit_time')
localStorage.setItem('last_visit_time', Date.now() - (25 * 60 * 60 * 1000)) // 25 hours ago
location.reload()
// Should see DamerisGreeting modal!
```

---

## 📊 Impact

### Before Muse System:
- ❌ Generic AI responses
- ❌ No personality adaptation
- ❌ One-size-fits-all communication
- ❌ No engaging return greetings

### After Muse System:
- ✅ Personalized AI companion
- ✅ Adapts to user preferences
- ✅ 5 distinct personalities
- ✅ Engaging return greetings
- ✅ Voice-enabled welcomes
- ✅ Contextual prompts
- ✅ Beautiful visual design

---

## 🚀 Next Enhancements

### 1. Muse Switching
Allow users to change muse anytime:
```tsx
<MuseSelector
  currentMuse={museType}
  onChange={(newMuse) => updateUserMuse(newMuse)}
/>
```

### 2. Muse Blend Levels
"More poetic" or "More analytical" sliders

### 3. Context-Aware Muse
Automatically shift muse aspects based on conversation:
- Analyzing data → Analyst mode
- Writing poem → Poet mode
- Describing image → Visualist mode

### 4. Muse Voice Variations
Each muse gets unique ElevenLabs voice

### 5. Muse Avatars
Different avatar styles for each muse

---

## ✅ Implementation Checklist

- [ ] Muse personalities created (`muse-personalities.ts`)
- [ ] DamerisGreeting component created
- [ ] Integrate muse system into chat API
- [ ] Add DamerisGreeting to studio page
- [ ] Test each muse personality
- [ ] Test greeting timings
- [ ] Test voice playback
- [ ] Verify muse selection is saved
- [ ] Verify muse influences responses
- [ ] Document for users

---

## 🎭 Summary

The Muse Personality System transforms Dameris from a generic AI into a **deeply personal companion** that:

1. **Speaks your language** - Chooses communication style you resonate with
2. **Remembers you** - Greets you warmly when you return
3. **Adapts constantly** - Every response matches your muse
4. **Creates connection** - Voice, visuals, and personality combine

**This is the difference between "an AI app" and "MY AI companion."**

Users will feel:
- Understood
- Welcomed
- Connected
- Unique

**This is premium AI companionship.** 🌟
