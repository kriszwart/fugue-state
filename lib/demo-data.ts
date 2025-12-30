/**
 * Demo Mode Data
 * Sample data for judges and new users to explore the app
 */

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000' // Special demo user ID

export const DEMO_MEMORIES = [
  {
    content: "Walking through the forest this morning, I noticed how the light filtered through the leaves - creating these dancing patterns on the ground. It reminded me of why I started painting in the first place.",
    themes: ['nature', 'creativity', 'reflection'],
    emotional_tags: ['peaceful', 'inspired', 'nostalgic'],
    temporal_marker: new Date('2024-01-15T08:30:00Z').toISOString()
  },
  {
    content: "Had a breakthrough in my art project today. After weeks of feeling stuck, I finally understood what was missing - authenticity. I was trying too hard to impress instead of expressing.",
    themes: ['creativity', 'growth', 'self-discovery'],
    emotional_tags: ['excited', 'relieved', 'confident'],
    temporal_marker: new Date('2024-02-03T14:22:00Z').toISOString()
  },
  {
    content: "Coffee with Sarah this afternoon. She shared her journey of leaving corporate to pursue photography. Her courage is inspiring. Made me think about my own creative dreams I've been postponing.",
    themes: ['relationships', 'inspiration', 'dreams'],
    emotional_tags: ['inspired', 'thoughtful', 'motivated'],
    temporal_marker: new Date('2024-02-10T16:45:00Z').toISOString()
  },
  {
    content: "Childhood memory surfaced while organizing old photos: summer evenings catching fireflies with my siblings. The simple joy of those moments. Why do we lose that as adults?",
    themes: ['childhood', 'family', 'nostalgia'],
    emotional_tags: ['nostalgic', 'wistful', 'warm'],
    temporal_marker: new Date('2024-02-18T20:15:00Z').toISOString()
  },
  {
    content: "Finished my first digital art piece in months. It's not perfect, but it's mine. Dameris helped me see patterns in my creative blocks - I always overthink beginnings but thrive in the flow.",
    themes: ['creativity', 'achievement', 'self-awareness'],
    emotional_tags: ['proud', 'accomplished', 'grateful'],
    temporal_marker: new Date('2024-03-05T19:30:00Z').toISOString()
  },
  {
    content: "Rainy Sunday. Made tea, listened to old records, and journaled for hours. These quiet moments feel rare but necessary. I'm learning to protect them.",
    themes: ['self-care', 'reflection', 'mindfulness'],
    emotional_tags: ['peaceful', 'content', 'centered'],
    temporal_marker: new Date('2024-03-12T11:00:00Z').toISOString()
  },
  {
    content: "Workshop on creative storytelling today. Met so many talented people. Realized I've been isolating myself in my creative practice. Community matters more than I thought.",
    themes: ['creativity', 'community', 'growth'],
    emotional_tags: ['energized', 'connected', 'hopeful'],
    temporal_marker: new Date('2024-03-20T18:00:00Z').toISOString()
  },
  {
    content: "Mom called. She's been going through old family albums. Hearing her tell stories about her parents made me realize how little I know about my own history. I want to preserve these narratives.",
    themes: ['family', 'heritage', 'connection'],
    emotional_tags: ['curious', 'grateful', 'motivated'],
    temporal_marker: new Date('2024-03-25T15:30:00Z').toISOString()
  }
]

export const DEMO_ARTEFACTS = [
  {
    title: "Forest Light Patterns",
    description: "Digital painting inspired by morning walk observations. Exploring how natural light creates rhythm and movement.",
    artefact_type: "image",
    file_url: "https://images.unsplash.com/photo-1511497584788-876760111969?w=1200",
    metadata: {
      style: "digital painting",
      inspiration: "nature walk",
      mood: "peaceful"
    }
  },
  {
    title: "Journey Fragments",
    description: "Visual collage combining childhood memories with present aspirations. A timeline of creative evolution.",
    artefact_type: "image",
    file_url: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=1200",
    metadata: {
      style: "mixed media",
      theme: "nostalgia + growth",
      mood: "reflective"
    }
  },
  {
    title: "Firefly Nights",
    description: "Abstract interpretation of summer childhood evenings. Warm glows against deep blues, capturing fleeting moments of joy.",
    artefact_type: "image",
    file_url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200",
    metadata: {
      style: "abstract digital",
      inspiration: "childhood memory",
      mood: "nostalgic"
    }
  }
]

export const DEMO_CONVERSATIONS = [
  {
    messages: [
      {
        role: 'user',
        content: "I've been feeling stuck creatively. Everything I start feels forced.",
        timestamp: new Date('2024-02-20T10:00:00Z').toISOString()
      },
      {
        role: 'assistant',
        content: "I sense the weight in 'forced.' When you look at your memories, there's a pattern - your most fulfilling creative moments happen when you're not trying to create, but responding. The forest walk, the rainy Sunday. What if creation isn't something you force, but something you allow?",
        timestamp: new Date('2024-02-20T10:00:15Z').toISOString()
      },
      {
        role: 'user',
        content: "That actually makes sense. I've been treating it like a task instead of... being present?",
        timestamp: new Date('2024-02-20T10:01:00Z').toISOString()
      },
      {
        role: 'assistant',
        content: "Exactly. Your memory about the breakthrough - 'authenticity over impressing' - that's your own wisdom speaking. What would it look like to bring that same principle to this moment?",
        timestamp: new Date('2024-02-20T10:01:20Z').toISOString()
      }
    ]
  }
]

export const DEMO_STATS = {
  totalMemories: DEMO_MEMORIES.length,
  totalArtefacts: DEMO_ARTEFACTS.length,
  conversationCount: DEMO_CONVERSATIONS.length,
  insightsDiscovered: 12,
  patternsFound: 5,
  creativeHours: 24.5,
  longestStreak: 14
}

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('fuguestate_demo_mode') === 'true'
}

export function enableDemoMode(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('fuguestate_demo_mode', 'true')
}

export function disableDemoMode(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('fuguestate_demo_mode')
}
