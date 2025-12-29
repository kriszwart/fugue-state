import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getLLMService, type LLMMessage } from '@/lib/ai/llm-service'

export const runtime = 'nodejs'

/**
 * WEAVE MODE - Knowledge Graph Interconnections
 *
 * Creates a web of connections between your memories, revealing
 * the hidden network of ideas, people, places, and concepts.
 *
 * Features:
 * - Maps memories as nodes in a knowledge graph
 * - Identifies connections (edges) between memories
 * - Detects clusters and communities of related ideas
 * - Shows central hubs (most connected memories)
 * - Reveals surprising bridges between distant concepts
 */

interface WeaveRequest {
  memoryIds?: string[]
  connectionType?: 'thematic' | 'temporal' | 'emotional' | 'conceptual' | 'all'
  depth?: 'surface' | 'deep' | 'comprehensive'
}

interface WeaveNode {
  id: string
  label: string
  type: 'memory' | 'concept' | 'person' | 'place' | 'event'
  content: string
  centrality: number
  cluster: string
}

interface WeaveEdge {
  from: string
  to: string
  type: string
  strength: number
  reason: string
}

interface WeaveCluster {
  name: string
  theme: string
  nodes: string[]
  significance: string
}

interface WeaveBridge {
  node1: string
  node2: string
  bridgeThrough: string[]
  surprise: string
}

interface WeaveResult {
  nodes: WeaveNode[]
  edges: WeaveEdge[]
  clusters: WeaveCluster[]
  hubs: string[]
  bridges: WeaveBridge[]
  insights: string[]
  visualization: string
  imagePrompt: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: WeaveRequest = await request.json().catch(() => ({}))
    const {
      memoryIds,
      connectionType = 'all',
      depth = 'deep'
    } = body

    // Fetch memories
    let memQuery = supabase
      .from('memories')
      .select('id, content, themes, emotional_tags, temporal_marker, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (memoryIds && memoryIds.length > 0) {
      memQuery = memQuery.in('id', memoryIds)
    } else {
      memQuery = memQuery.limit(30) // Limit for graph complexity
    }

    const { data: memories, error } = await memQuery
    if (error || !memories || memories.length === 0) {
      return NextResponse.json(
        { error: 'No memories found for weaving' },
        { status: 400 }
      )
    }

    // Build weave prompt
    const memoriesText = memories
      .map((m, i) => {
        return `Node ${i + 1} (ID: ${m.id.slice(0, 8)}):
Content: ${m.content.slice(0, 300)}
Themes: ${m.themes?.join(', ') || 'none'}
Emotions: ${m.emotional_tags?.join(', ') || 'none'}
Date: ${new Date(m.temporal_marker || m.created_at).toLocaleDateString()}`
      })
      .join('\n\n')

    const connectionDescriptions = {
      thematic: 'shared themes and topics',
      temporal: 'time-based proximity and sequence',
      emotional: 'similar emotional tones and feelings',
      conceptual: 'abstract ideas and philosophical connections',
      all: 'all types of connections'
    }

    const depthDescriptions = {
      surface: 'obvious direct connections',
      deep: 'hidden and indirect connections',
      comprehensive: 'all possible connections including weak links'
    }

    const prompt = `You are Dameris in WEAVE MODE - a master of seeing connections and networks.

Analyze these memories as nodes in a knowledge graph. Find the web of connections.

Connection Type: ${connectionType} (${connectionDescriptions[connectionType]})
Analysis Depth: ${depth} (${depthDescriptions[depth]})
Total Memories: ${memories.length}

MEMORY NODES:
${memoriesText}

Create a KNOWLEDGE GRAPH showing:

1. **Nodes**: Each memory and extracted concepts/entities
2. **Edges**: Connections between nodes with strength and type
3. **Clusters**: Groups of strongly connected nodes
4. **Hubs**: Most central/connected nodes
5. **Bridges**: Surprising connections between distant clusters

Return ONLY valid JSON (no markdown):
{
  "nodes": [
    {
      "id": string (use provided ID or create for concepts),
      "label": string (short descriptive label),
      "type": "memory" | "concept" | "person" | "place" | "event",
      "content": string (brief description),
      "centrality": number (1-10, how connected is this node),
      "cluster": string (which cluster it belongs to)
    }
  ],
  "edges": [
    {
      "from": string (node id),
      "to": string (node id),
      "type": string (thematic, temporal, emotional, etc.),
      "strength": number (1-10),
      "reason": string (why they're connected)
    }
  ],
  "clusters": [
    {
      "name": string,
      "theme": string,
      "nodes": [string] (node ids),
      "significance": string
    }
  ],
  "hubs": [string] (ids of most central nodes),
  "bridges": [
    {
      "node1": string (id),
      "node2": string (id),
      "bridgeThrough": [string] (path of connection),
      "surprise": string (why this connection is unexpected)
    }
  ],
  "insights": [string] (3-5 key discoveries from the network),
  "visualization": string (describe how the network looks overall),
  "imagePrompt": string (visual representation of the knowledge web)
}`

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are Dameris in weave mode: network-focused, seeing connections everywhere. You map the invisible web between ideas. Output strict JSON only.',
      },
      { role: 'user', content: prompt },
    ]

    const llm = getLLMService()
    const useThinking = process.env.ENABLE_THINKING_MODE === 'true'

    if (useThinking) {
      console.log('[Weave] Using thinking mode for network analysis')
    }

    const resp = await llm.generateResponse(messages, {
      modelType: useThinking ? 'thinking' : 'chat',
      temperature: 0.6,
      maxTokens: useThinking ? 3500 : 2500,
      useThinking: useThinking,
    })

    // Parse JSON
    const jsonMatch = resp.content.match(/\{[\s\S]*\}/)
    const result: WeaveResult = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : {
          nodes: [],
          edges: [],
          clusters: [],
          hubs: [],
          bridges: [],
          insights: ['Unable to generate network analysis'],
          visualization: resp.content,
          imagePrompt: 'An interconnected web of glowing nodes and connections',
        }

    if (resp.thinking) {
      console.log('[Weave] AI Reasoning:', resp.thinking.substring(0, 200) + '...')
    }

    return NextResponse.json({
      success: true,
      result,
      memoryCount: memories.length,
      connectionType,
      depth,
      model: resp.model,
      provider: resp.provider,
      thinking: resp.thinking,
      usage: resp.usage,
    })
  } catch (error: any) {
    console.error('Weave generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate knowledge weave' },
      { status: 500 }
    )
  }
}
