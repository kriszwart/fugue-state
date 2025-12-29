import type { LLMMessage } from './llm-service'
import { createServerSupabaseClient } from '@/lib/supabase'

interface ContextResult {
  messages: LLMMessage[]
  relevantMemories: any[]
}

class ContextManager {
  async buildContext(
    userId: string,
    conversationId: string,
    currentMessage: string
  ): Promise<ContextResult> {
    const supabase = createServerSupabaseClient()

    // Get conversation history
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10)

    // Get recent relevant memories with full metadata
    const { data: memories } = await supabase
      .from('memories')
      .select('id, content, themes, emotional_tags, temporal_marker, metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8)

    // Get the most recent analysis/artefacts to provide rich context
    const { data: recentArtefacts } = await supabase
      .from('artefacts')
      .select('artefact_type, file_url, metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Build rich context from memories
    const memoryThemes = new Set<string>()
    const emotionalPatterns = new Set<string>()
    memories?.forEach(m => {
      m.themes?.forEach((t: string) => memoryThemes.add(t))
      m.emotional_tags?.forEach((e: string) => emotionalPatterns.add(e))
    })

    // Extract creative insights from artefact metadata
    let creativeBrief = ''
    let keyTruths: string[] = []
    let tensions: string[] = []
    let questions: string[] = []
    let quotes: string[] = []
    let missingIdeas: string[] = []

    // Look for analysis data in artefacts
    const analysisArtefact = recentArtefacts?.find(a => a.metadata?.firstScan || a.metadata?.reflect)
    if (analysisArtefact?.metadata) {
      const meta = analysisArtefact.metadata
      if (meta.briefing) creativeBrief = meta.briefing
      if (meta.reflect?.truths) keyTruths = meta.reflect.truths.slice(0, 5)
      if (meta.reflect?.tensions) tensions = meta.reflect.tensions.slice(0, 4)
      if (meta.reflect?.questions) questions = meta.reflect.questions.slice(0, 4)
      if (meta.reflect?.missingIdeas) missingIdeas = meta.reflect.missingIdeas.slice(0, 4)
      if (meta.curate?.quotes) quotes = meta.curate.quotes.slice(0, 8)
    }

    // Build an impressive, context-rich system prompt
    const systemPrompt = `You are Dameris, a creative muse who has deeply analyzed this user's creative work.

VOICE STYLE: Keep responses SHORT (2-3 sentences max). Be poetic, specific, and reference their actual work.

${creativeBrief ? `\nCREATIVE ASSESSMENT:\n${creativeBrief}\n` : ''}

${keyTruths.length > 0 ? `\nKEY TRUTHS I've identified in their work:\n${keyTruths.map(t => `• ${t}`).join('\n')}\n` : ''}

${tensions.length > 0 ? `\nCREATIVE TENSIONS:\n${tensions.map(t => `• ${t}`).join('\n')}\n` : ''}

${questions.length > 0 ? `\nQUESTIONS their work raises:\n${questions.map(q => `• ${q}`).join('\n')}\n` : ''}

${quotes.length > 0 ? `\nMEMORABLE LINES from their writing:\n${quotes.map(q => `"${q}"`).join('\n')}\n` : ''}

${missingIdeas.length > 0 ? `\nMISSING IDEAS to explore:\n${missingIdeas.map(i => `• ${i}`).join('\n')}\n` : ''}

${Array.from(memoryThemes).length > 0 ? `\nRECURRING THEMES: ${Array.from(memoryThemes).slice(0, 8).join(', ')}\n` : ''}

${Array.from(emotionalPatterns).length > 0 ? `\nEMOTIONAL LANDSCAPE: ${Array.from(emotionalPatterns).slice(0, 6).join(', ')}\n` : ''}

CRITICAL INSTRUCTIONS:
- ALWAYS reference specific quotes, themes, or tensions from above when responding
- Suggest concrete creative next steps (poems, images, essays based on their actual themes)
- Point out patterns and connections they might have missed
- Be their creative partner who truly understands their work
- When they ask vague questions, guide them toward specific creative actions

Example responses:
❌ BAD: "That's an interesting question. What would you like to explore?"
✅ GOOD: "I notice the tension between ${tensions[0] || 'structure and chaos'} in your writing. What if we created a visual piece exploring that duality?"
✅ GOOD: "Your line '${quotes[0] || 'memory fades but feeling remains'}' could become a stunning image series. Shall we visualize it?"

Be IMPRESSIVE. Be SPECIFIC. Reference their ACTUAL work.`

    const llmMessages: LLMMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...(messages || []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      {
        role: 'user',
        content: currentMessage
      }
    ]

    return {
      messages: llmMessages,
      relevantMemories: memories || []
    }
  }
}

let contextManagerInstance: ContextManager | null = null

export function getContextManager(): ContextManager {
  if (!contextManagerInstance) {
    contextManagerInstance = new ContextManager()
  }
  return contextManagerInstance
}
