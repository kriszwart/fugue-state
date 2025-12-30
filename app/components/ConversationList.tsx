'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { ListItemSkeleton } from './LoadingSkeleton'
import FadeIn from './FadeIn'

interface Conversation {
  id: string
  title: string
  muse_type: string
  created_at: string
  updated_at: string
  message_count?: number
}

interface ConversationListProps {
  onSelect: (conversationId: string) => void
  selectedId?: string
  onNewConversation: () => void
}

export default function ConversationList({ onSelect, selectedId, onNewConversation }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, muse_type, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) throw error

      // Get message counts
      const conversationsWithCounts = await Promise.all(
        (data || []).map(async (conv) => {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
          
          return { ...conv, message_count: count || 0 }
        })
      )

      setConversations(conversationsWithCounts)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return

    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)

      if (error) throw error
      setConversations(prev => prev.filter(c => c.id !== id))
      if (selectedId === id) {
        onNewConversation()
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
      alert('Failed to delete conversation')
    }
  }

  const filtered = conversations.filter(c =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.muse_type?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Conversations</h3>
          <button
            onClick={onNewConversation}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            title="New conversation"
          >
            <i data-lucide="plus" className="w-4 h-4 text-zinc-400"></i>
          </button>
        </div>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-2 py-1.5 text-xs bg-zinc-900/50 border border-white/10 rounded-lg text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
        />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-2">
            {[...Array(5)].map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-3 text-xs text-zinc-500 text-center">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          <FadeIn duration={300}>
            <div className="space-y-1 p-2">
            {filtered.map(conv => (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`group relative p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedId === conv.id
                    ? 'bg-amber-500/10 border border-amber-500/20'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-zinc-200 truncate">
                      {conv.title || 'Untitled Conversation'}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {conv.message_count || 0} messages · {new Date(conv.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-all"
                    title="Delete conversation"
                  >
                    <i data-lucide="trash-2" className="w-3 h-3 text-red-400"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
          </FadeIn>
        )}
      </div>
    </div>
  )
}











