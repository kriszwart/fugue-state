/**
 * Enhanced Fugue State Type Definitions
 * Comprehensive types for fragmented memory processing and creative generation
 */

// ============================================================================
// FRAGMENT TYPES
// ============================================================================

export type FragmentType =
  | 'observation'      // Simple observations, notes about the world
  | 'idea'            // Business concepts, creative ideas, innovations
  | 'memory'          // Personal memories, experiences, events
  | 'intention'       // Tasks, goals, things to do
  | 'reflection'      // Deep thoughts, philosophical musings
  | 'raw_emotion'     // Unfiltered feelings, emotional expressions
  | 'dream_fragment'  // Surreal, creative, imaginative content
  | 'question'        // Queries, wonderings, unknowns
  | 'insight'         // Realizations, epiphanies, breakthroughs

export type MuseMode =
  | 'synthesis'    // Balanced synthesis — insight + creativity
  | 'analyst'      // Pattern-forward, specific, pragmatic
  | 'poet'         // Lyrical, metaphor-forward, tender
  | 'visualist'    // Sensory, cinematic, image-forward
  | 'narrator'     // Saga-forward, voice-first, dramatic
  | 'dreamer'      // Surreal, subconscious, unexpected
  | 'collagist'    // Fragmentary, juxtaposition-focused
  | 'alchemist'    // Transformative, remix-oriented

export type ConceptualDensity = 'sparse' | 'medium' | 'rich' | 'overwhelming'

// ============================================================================
// FRAGMENT ANALYSIS
// ============================================================================

export interface FragmentAnalysis {
  dominantTypes: FragmentType[]
  emotionalArc: string[]
  conceptualDensity: ConceptualDensity
  temporalSpread: {
    earliest?: Date
    latest?: Date
    gaps: number
    periodLabels: string[]  // e.g., ["Early 2023", "Summer 2024"]
  }
  thematicClusters: Array<{
    theme: string
    frequency: number
    fragments: string[]
  }>
  uniqueVoices: number  // How many distinct "modes" of writing detected
}

// ============================================================================
// ENHANCED REFLECTION
// ============================================================================

export interface EnhancedReflect {
  truths: string[]
  tensions: string[]
  questions: string[]
  missingIdeas: string[]
  // NEW
  obsessions: Array<{
    theme: string
    frequency: number
    firstMention: string
    evolution: string
  }>
  evolution: string  // How thinking has changed over time
  contradictions: Array<{
    statement1: string
    statement2: string
    context: string
  }>
  patterns: Array<{
    pattern: string
    evidence: string[]
    significance: string
  }>
}

// ============================================================================
// ENHANCED RECOMPOSE
// ============================================================================

export type RecomposeFormat =
  | 'poem'
  | 'narrative'
  | 'outline'
  | 'manifesto'
  | 'microStory'
  | 'tweetStorm'
  | 'visualScript'
  | 'songLyrics'
  | 'epistolary'
  | 'dialogue'
  | 'aphorisms'
  | 'dreamLog'

export interface FusionPrompt {
  fragments: string[]      // Which fragments to combine
  style: string           // How to combine them
  mood: string            // Emotional tone
  format: RecomposeFormat // Output format
  prompt: string          // The actual creative prompt
}

export interface EnhancedRecompose {
  // Original formats
  emailDraft?: string
  tweetThread?: string
  outline?: string

  // Enhanced formats
  formats: Partial<Record<RecomposeFormat, string>>

  // Fusion suggestions
  fusionPrompts: FusionPrompt[]

  // Meta
  suggestedFormat: RecomposeFormat
  tone: string
}

// ============================================================================
// ENHANCED CURATE
// ============================================================================

export interface Constellation {
  name: string
  centerpiece: string      // Core fragment
  satellites: string[]     // Related fragments
  visualization: string    // Description for visual representation
  mermaidDiagram?: string // Mermaid syntax for diagram
}

export interface Obsession {
  theme: string
  frequency: number
  evolution: string
  fragments: string[]
  intensity: 'passing' | 'recurring' | 'persistent' | 'defining'
}

export interface OrphanFragment {
  fragment: string
  uniqueness: number       // 0-100, how different from others
  potential: string        // What could be done with it
  reason: string          // Why it's an orphan
}

export interface EnhancedCurate {
  // Original
  tags: string[]
  quotes: string[]
  collections: Array<{
    name: string
    description: string
    items: string[]
  }>

  // NEW
  constellations: Constellation[]
  obsessions: Obsession[]
  orphans: OrphanFragment[]

  // Temporal organization
  timeline: Array<{
    period: string
    dominantThemes: string[]
    fragmentCount: number
    emotionalTone: string
  }>
}

// ============================================================================
// NEW: COLLAGE RESULT
// ============================================================================

export interface CollageElement {
  type: 'text' | 'image' | 'hybrid'
  content: string
  position?: { x: number; y: number }
  style?: string
  sourceFragments: string[]
}

export interface CollageResult {
  type: 'textual' | 'visual' | 'hybrid'
  title: string
  description: string
  elements: CollageElement[]
  visualPrompt?: string  // For image generation
  moodboard?: {
    colors: string[]
    textures: string[]
    atmosphere: string
  }
  narrative?: string  // Story connecting the fragments
}

// ============================================================================
// NEW: DREAM RESULT
// ============================================================================

export interface DreamResult {
  narrative: string       // Surreal story
  imagePrompt: string     // Dreamlike visual
  soundscape: string      // Audio description
  interpretation: string  // What it might mean
  symbols: Array<{
    symbol: string
    meaning: string
    sourceFragments: string[]
  }>
  atmosphere: {
    mood: string
    colors: string[]
    textures: string[]
    sounds: string[]
  }
  lucidMoments: string[]  // Clearer, more grounded parts
}

// ============================================================================
// NEW: REMIX RESULT
// ============================================================================

export interface RemixResult {
  original: string[]      // Source fragments
  remixed: string         // New creation
  technique: string       // How they were combined
  style: string          // Literary/artistic style
  surprises: string[]    // Unexpected connections found
  variations: Array<{
    version: string
    approach: string
  }>
}

// ============================================================================
// NEW: ECHO RESULT
// ============================================================================

export interface EchoResult {
  repeatingPatterns: Array<{
    pattern: string
    occurrences: number
    context: string[]
    significance: string
  }>
  recurringQuestions: Array<{
    question: string
    askedTimes: number
    evolution: string
  }>
  persistentThemes: Array<{
    theme: string
    frequency: number
    intensity: 'faint' | 'clear' | 'loud' | 'deafening'
    firstEcho: string
    latestEcho: string
  }>
  metaReflection: string  // Reflection on the patterns themselves
  amplification: string   // What happens when we amplify the echoes
}

// ============================================================================
// ENHANCED FIRST SCAN RESULT
// ============================================================================

export interface EnhancedFirstScanResult {
  muse: MuseMode
  briefing: string

  // Fragment analysis
  fragmentAnalysis: FragmentAnalysis

  // Enhanced core features
  reflect: EnhancedReflect
  recompose: EnhancedRecompose
  visualise: {
    imagePrompts: string[]
    palette: string[]
    storyboardBeats: string[]
    // NEW
    visualStyles: string[]
    moodboards: Array<{
      theme: string
      colors: string[]
      textures: string[]
      references: string[]
    }>
  }
  curate: EnhancedCurate

  // New creative modes
  collage: CollageResult
  dream: DreamResult
  remix: RemixResult
  echo: EchoResult

  nextActions: string[]

  // Meta information
  processingStats: {
    totalFragments: number
    processedFragments: number
    tokensUsed?: number
    processingTime?: number
  }
}

// ============================================================================
// FUGUE ENGINE TYPES
// ============================================================================

export interface FugueEngineConfig {
  fragmentCount: number       // How many fragments to mix (3-10)
  mode: 'random' | 'thematic' | 'temporal' | 'emotional'
  creativity: number          // 0-1, how wild the combinations
  preserveCoherence: boolean  // Whether to maintain logical connections
}

export interface FugueEnginResult {
  prompt: string
  selectedFragments: Array<{
    content: string
    reason: string  // Why this fragment was chosen
  }>
  connections: Array<{
    fragment1: number
    fragment2: number
    connection: string
  }>
  suggestion: string
  format: RecomposeFormat
}

// ============================================================================
// VISUALIZATION TYPES
// ============================================================================

export interface MemoryTimelineNode {
  date: Date
  fragments: Array<{
    id: string
    preview: string
    type: FragmentType
    emotional: string
  }>
  density: number
  dominantTheme: string
}

export interface ConceptNode {
  id: string
  concept: string
  frequency: number
  position: { x: number; y: number; z: number }
  connections: string[]  // IDs of related concepts
  fragments: string[]
  color: string
  size: number
}

export interface MemoryGardenPlant {
  id: string
  fragment: string
  type: FragmentType
  growth: 'seed' | 'sprout' | 'blooming' | 'wilting'
  position: { x: number; y: number }
  connections: string[]
  lastTended: Date
  nutrients: {  // How it's being fed
    referenced: number
    developed: number
    connected: number
  }
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface GenerateCollageRequest {
  memoryIds?: string[]
  style?: 'textual' | 'visual' | 'hybrid'
  fragmentCount?: number
  theme?: string
}

export interface GenerateDreamRequest {
  memoryIds?: string[]
  intensity?: 'subtle' | 'medium' | 'surreal' | 'extreme'
  mood?: string
}

export interface GenerateRemixRequest {
  memoryIds?: string[]
  technique?: 'juxtapose' | 'blend' | 'transform' | 'collide'
  style?: string
  targetFormat?: RecomposeFormat
}

export interface GenerateEchoRequest {
  memoryIds?: string[]
  lookback?: 'week' | 'month' | 'year' | 'all'
  sensitivity?: number  // 0-1, how sensitive to patterns
}

export interface SurpriseMeRequest {
  config?: Partial<FugueEngineConfig>
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ActionType =
  | 'reflect'
  | 'visualise'
  | 'recompose'
  | 'curate'
  | 'explore'
  | 'collage'
  | 'dream'
  | 'remix'
  | 'echo'
  | 'surprise'

export interface ActionResult {
  type: ActionType
  message: string
  data?: any
  timestamp: Date
  success: boolean
}

// ============================================================================
// BACKWARDS COMPATIBILITY
// ============================================================================

// Legacy type for backwards compatibility
export type SynthesisFirstScan = {
  muse: 'synthesis'
  briefing: string
  reflect: {
    truths: string[]
    tensions: string[]
    questions: string[]
    missingIdeas: string[]
  }
  recompose: {
    emailDraft: string
    tweetThread: string
    outline: string
  }
  visualise: {
    imagePrompts: string[]
    palette: string[]
    storyboardBeats: string[]
  }
  curate: {
    tags: string[]
    quotes: string[]
    collections: Array<{ name: string; description: string; items: string[] }>
  }
  nextActions: string[]
}
