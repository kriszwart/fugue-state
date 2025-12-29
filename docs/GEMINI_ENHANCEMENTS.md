# Google Gemini Enhancement Plan for FugueState AI

## Current State
- Using Vertex AI with basic text generation (gemini-1.5-pro-002, gemini-1.5-flash-002)
- Text-only memory analysis
- No multimodal capabilities
- No advanced features like caching, grounding, or extended thinking

## Proposed Enhancements

### 🎯 High Impact Features (Implement First)

#### 1. **Multimodal Memory Processing**
**What:** Process images, audio, video, and PDFs alongside text memories
**Impact:** Users can upload photos, voice memos, videos as memories
**API:** Gemini multimodal input (text + images + audio + video)

**Use Cases:**
- Upload photos from trips/events as visual memories
- Voice journal entries (audio → transcription + emotional analysis)
- Video memories (analyze scenes, emotions, themes)
- Import PDF journals (native PDF parsing)

**Implementation:**
```typescript
// New endpoint: /api/memories/upload-multimodal
{
  type: 'image' | 'audio' | 'video' | 'pdf',
  file: File,
  context?: string // Optional user context
}

// Gemini analyzes:
- Images: Visual themes, objects, emotions, colors, composition
- Audio: Transcription + tone + emotional content
- Video: Scene analysis, narrative arc, visual themes
- PDF: Extract text + understand layout + summarize
```

**Benefits:**
- Richer memory corpus
- Visual dream generation based on photo memories
- Voice-based journaling
- Complete multimedia memory ecosystem

---

#### 2. **Extended Context for Deep Memory Exploration**
**What:** Use Gemini 1.5 Pro's 2M token context window
**Impact:** Process entire journals, years of memories in one analysis
**API:** Gemini 1.5 Pro with context caching

**Use Cases:**
- Analyze entire life journals at once
- Find long-term patterns across years
- Generate comprehensive life narratives
- Deep psychological insights from complete memory corpus

**Implementation:**
```typescript
// lib/ai/providers/vertex-extended-context.ts
class ExtendedContextAnalyzer {
  async analyzeEntireJournal(userId: string): Promise<DeepInsights> {
    // Load ALL memories (up to 2M tokens)
    const memories = await loadAllUserMemories(userId)

    // Use context caching for repeated analysis
    const cachedContext = await this.cacheMemoryCorpus(memories)

    // Run deep analysis
    return await gemini.analyze({
      context: cachedContext,
      prompts: [
        "Analyze lifelong patterns",
        "Identify major life themes",
        "Track emotional evolution",
        "Find hidden connections"
      ]
    })
  }
}
```

**Benefits:**
- Unprecedented depth of analysis
- Long-term pattern recognition
- Life-spanning narrative generation
- Cost savings via context caching (60%+ reduction)

---

#### 3. **Gemini Thinking Mode for Creative Generation**
**What:** Use extended reasoning for complex creative tasks
**Impact:** Higher quality dreams, remixes, echoes with deeper reasoning
**API:** Gemini 2.0 Flash Thinking (thinking mode)

**Use Cases:**
- Complex dream narratives with multi-layered symbolism
- Sophisticated memory remixes with thematic coherence
- Deep pattern analysis in Echo mode
- Multi-step creative transformations

**Implementation:**
```typescript
// Update creative generation modes
async generateDream(fragments: Fragment[]): Promise<Dream> {
  // Use thinking mode for deep reasoning
  const response = await gemini.generate({
    model: 'gemini-2.0-flash-thinking-exp',
    prompt: `Analyze these memory fragments and create a surreal dream narrative.

    Think step-by-step:
    1. Identify symbolic elements in each fragment
    2. Find emotional/thematic connections
    3. Construct a dream logic that links them
    4. Generate a narrative that feels dreamlike yet meaningful

    Fragments: ${JSON.stringify(fragments)}`,
    temperature: 0.9,
    showThinking: true // See the reasoning process
  })

  return {
    narrative: response.content,
    thinking: response.thinking, // Show reasoning to user
    symbolism: response.extractedSymbols
  }
}
```

**Benefits:**
- More coherent creative outputs
- Explainable creativity (show thinking process)
- Better thematic connections
- Higher quality artistic generation

---

#### 4. **Function Calling for Structured Memory Processing**
**What:** Use Gemini's function calling for structured data extraction
**Impact:** Better fragment extraction, theme identification, metadata generation
**API:** Gemini function calling with JSON schema

**Use Cases:**
- Extract structured themes from memories
- Generate metadata automatically
- Fragment memories with precise boundaries
- Create structured collections

**Implementation:**
```typescript
// Define functions for memory analysis
const memoryAnalysisFunctions = [
  {
    name: 'extract_themes',
    description: 'Extract themes from memory text',
    parameters: {
      type: 'object',
      properties: {
        themes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              confidence: { type: 'number' },
              evidence: { type: 'string' }
            }
          }
        }
      }
    }
  },
  {
    name: 'create_fragments',
    description: 'Break memory into meaningful fragments',
    parameters: {
      type: 'object',
      properties: {
        fragments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              type: { type: 'string', enum: ['sensory', 'emotional', 'narrative', 'abstract'] },
              significance: { type: 'number' }
            }
          }
        }
      }
    }
  }
]

// Use in memory analyzer
const analysis = await gemini.generate({
  prompt: memoryText,
  functions: memoryAnalysisFunctions,
  function_call: 'auto'
})
```

**Benefits:**
- Structured, predictable outputs
- Better fragment quality
- Consistent theme extraction
- Easier downstream processing

---

#### 5. **Grounding with Google Search**
**What:** Enhance memories with real-world context
**Impact:** Enrich memories with factual information, dates, events
**API:** Gemini grounding with Google Search

**Use Cases:**
- Add historical context to memories
- Verify dates and events
- Enhance memories with related information
- Connect personal memories to world events

**Implementation:**
```typescript
async enrichMemoryWithContext(memory: Memory): Promise<EnrichedMemory> {
  const response = await gemini.generate({
    prompt: `Analyze this memory and add relevant context:

    Memory: "${memory.content}"

    Add:
    - Historical context if dates mentioned
    - Related events from that time period
    - Cultural references
    - Geographic information`,
    grounding: {
      googleSearch: true
    }
  })

  return {
    ...memory,
    context: response.groundingMetadata,
    enrichedContent: response.content
  }
}
```

**Benefits:**
- Richer memory context
- Educational value
- Better timeline construction
- Connection to world events

---

### 🚀 Medium Impact Features

#### 6. **Context Caching for Performance**
**What:** Cache user memory corpus for 60%+ cost reduction
**Impact:** Faster responses, lower costs for repeat queries
**API:** Gemini context caching

**Implementation:**
```typescript
// Cache user's memory corpus
const cachedContext = await gemini.cacheContext({
  userId: user.id,
  contents: allUserMemories,
  ttl: 3600 // 1 hour
})

// Use cached context for all queries
const response = await gemini.generate({
  cachedContent: cachedContext.name,
  prompt: userQuery
})
```

**Benefits:**
- 60-80% cost reduction on cached content
- 2-3x faster responses
- Better for frequent interactions

---

#### 7. **Video Memory Analysis**
**What:** Process video uploads as memories
**Impact:** Support video journals, life moments
**API:** Gemini video understanding

**Use Cases:**
- Upload video journals
- Analyze life events captured on video
- Extract key moments from videos
- Generate visual prompts from video scenes

---

#### 8. **Audio Understanding & Transcription**
**What:** Direct audio processing without separate transcription
**Impact:** Native voice journaling support
**API:** Gemini audio input

**Use Cases:**
- Voice journal entries
- Emotional tone analysis from voice
- Background sound analysis (music, ambient)
- Voice-based memory creation

---

#### 9. **Live API for Real-time Interactions**
**What:** Bidirectional streaming for live conversations
**Impact:** More natural Dameris conversations
**API:** Gemini Live API

**Use Cases:**
- Natural back-and-forth with Dameris
- Interruption support
- Live memory exploration sessions
- Real-time creative collaboration

---

#### 10. **Batch Processing for Background Analysis**
**What:** Process large memory batches at 50% cost
**Impact:** Affordable bulk analysis operations
**API:** Batch API

**Use Cases:**
- Nightly memory analysis
- Bulk theme extraction
- Large-scale pattern finding
- Archive processing

---

### 🎨 Creative Enhancement Features

#### 11. **Image Generation from Memories**
**What:** Use Imagen 3 for better image generation
**Impact:** Higher quality visual outputs
**API:** Vertex AI Imagen 3

**Current:** Using Hugging Face for image generation
**Upgrade:** Switch to Imagen 3 for photorealistic outputs

---

#### 12. **Advanced Safety Controls**
**What:** Fine-tune content filtering for sensitive memories
**Impact:** Better handling of personal/emotional content
**API:** Gemini safety settings

**Use Cases:**
- Gentle handling of traumatic memories
- Content warnings for sensitive themes
- Customizable safety thresholds
- Privacy-aware processing

---

### 📊 Implementation Priority Matrix

| Feature | Impact | Effort | Priority | Timeline |
|---------|--------|--------|----------|----------|
| Multimodal Processing | ⭐⭐⭐⭐⭐ | Medium | P0 | Week 1-2 |
| Extended Context | ⭐⭐⭐⭐⭐ | Low | P0 | Week 1 |
| Thinking Mode | ⭐⭐⭐⭐ | Low | P1 | Week 2 |
| Function Calling | ⭐⭐⭐⭐ | Medium | P1 | Week 2-3 |
| Context Caching | ⭐⭐⭐⭐ | Low | P1 | Week 2 |
| Grounding | ⭐⭐⭐ | Low | P2 | Week 3 |
| Video Analysis | ⭐⭐⭐ | Medium | P2 | Week 4 |
| Audio Understanding | ⭐⭐⭐ | Low | P2 | Week 3 |
| Live API | ⭐⭐ | High | P3 | Month 2 |
| Batch Processing | ⭐⭐ | Low | P3 | Week 4 |
| Imagen 3 | ⭐⭐⭐ | Medium | P2 | Week 3 |

---

### 💰 Cost Optimization with Gemini

**Current Costs (Estimated):**
- Gemini 1.5 Flash: $0.075 per 1M input tokens
- Average memory analysis: ~2K tokens
- Cost per analysis: ~$0.00015

**With Optimizations:**
1. **Context Caching**: 60% reduction on cached content
2. **Batch API**: 50% reduction for bulk operations
3. **Model Selection**: Use Flash for chat, Pro for complex tasks
4. **Smart Routing**: Simple queries → Flash, Complex → Pro

**Projected Savings:** 40-60% overall cost reduction

---

### 🔧 Technical Requirements

1. **Update Vertex Provider:**
   - Add multimodal input support
   - Implement function calling
   - Add context caching
   - Support thinking mode

2. **New Endpoints:**
   - `/api/memories/upload-image` - Image memory upload
   - `/api/memories/upload-audio` - Voice journal
   - `/api/memories/upload-video` - Video memory
   - `/api/memories/deep-analysis` - Extended context analysis
   - `/api/memories/enrich` - Grounding-enhanced analysis

3. **Database Schema Updates:**
   ```sql
   ALTER TABLE memories ADD COLUMN media_type VARCHAR(20);
   ALTER TABLE memories ADD COLUMN media_url TEXT;
   ALTER TABLE memories ADD COLUMN transcription TEXT;
   ALTER TABLE memories ADD COLUMN visual_analysis JSONB;
   ALTER TABLE memories ADD COLUMN grounding_metadata JSONB;
   ```

4. **Environment Variables:**
   ```bash
   # Vertex AI Configuration
   VERTEX_PROJECT_ID=fugue-state-481202
   VERTEX_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

   # Feature Flags
   ENABLE_MULTIMODAL=true
   ENABLE_EXTENDED_CONTEXT=true
   ENABLE_THINKING_MODE=true
   ENABLE_GROUNDING=true
   ENABLE_CONTEXT_CACHING=true

   # Model Selection
   GEMINI_CHAT_MODEL=gemini-2.0-flash-exp
   GEMINI_THINKING_MODEL=gemini-2.0-flash-thinking-exp
   GEMINI_VISION_MODEL=gemini-1.5-pro-002
   ```

---

### 🎯 Recommended Implementation Order

**Phase 1: Foundation (Week 1-2)**
1. Extended context support (2M tokens)
2. Context caching implementation
3. Multimodal image upload & analysis

**Phase 2: Enhanced Intelligence (Week 2-3)**
4. Thinking mode for creative generation
5. Function calling for structured outputs
6. Audio memory support

**Phase 3: Advanced Features (Week 3-4)**
7. Grounding with Google Search
8. Video memory analysis
9. Imagen 3 integration

**Phase 4: Optimization (Month 2)**
10. Batch processing setup
11. Live API integration
12. Advanced safety controls

---

### 📈 Expected Outcomes

**User Experience:**
- 5x richer memory inputs (text + image + audio + video)
- 10x deeper analysis (2M token context vs current)
- 3x better creative outputs (thinking mode)
- 2x faster responses (caching)

**Business Metrics:**
- 40-60% cost reduction
- Higher user engagement
- More valuable insights
- Competitive differentiation

**Technical Excellence:**
- Production-ready multimodal system
- Scalable architecture
- Cost-optimized operations
- State-of-the-art AI integration

---

### 🚀 Quick Wins (Start Today)

1. **Enable Context Caching** - 1 hour, 60% cost savings
2. **Add Thinking Mode** - 2 hours, better creative outputs
3. **Implement Function Calling** - 4 hours, structured outputs
4. **Extended Context** - 2 hours, deeper analysis

Total: ~1 day of work for 4x value improvement
