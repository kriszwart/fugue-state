'use client'

import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'

interface Artefact {
  id: string
  artefact_type: 'image' | 'text' | 'audio' | 'video'
  title: string
  description: string
  file_url: string | null
  metadata: any
  created_at: string
}

export default function ArtefactGallery() {
  const [artefacts, setArtefacts] = useState<Artefact[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'image' | 'text' | 'poem' | 'journal'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadArtefacts()
  }, [filter])

  const loadArtefacts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/artefacts/recent?limit=50&within=86400', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        let filtered = data.artefacts || []

        // Apply type filter
        if (filter === 'poem') {
          filtered = filtered.filter((a: Artefact) => a.metadata?.kind === 'poem')
        } else if (filter === 'journal') {
          filtered = filtered.filter((a: Artefact) => a.metadata?.kind === 'journal_entry')
        } else if (filter === 'image') {
          filtered = filtered.filter((a: Artefact) => a.artefact_type === 'image')
        } else if (filter === 'text') {
          filtered = filtered.filter((a: Artefact) => a.artefact_type === 'text' && a.metadata?.kind !== 'poem' && a.metadata?.kind !== 'journal_entry')
        }

        // Apply search
        if (searchQuery) {
          filtered = filtered.filter((a: Artefact) => 
            a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.description?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        }

        setArtefacts(filtered)
      }
    } catch (error) {
      console.error('Error loading artefacts:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Artefact Gallery</h2>
        <button
          onClick={loadArtefacts}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Search artefacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-1.5 text-xs bg-zinc-900/50 border border-white/10 rounded-lg text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
        />
        {(['all', 'image', 'poem', 'journal', 'text'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              filter === f
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                : 'bg-zinc-900/50 border-white/10 text-zinc-400 hover:border-white/20'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500 text-sm">Loading artefacts...</div>
      ) : artefacts.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm">No artefacts found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {artefacts.map((artefact) => (
            <div
              key={artefact.id}
              className="p-4 rounded-xl bg-zinc-900/50 border border-white/10 hover:border-amber-500/30 transition-all cursor-pointer group"
            >
              {artefact.artefact_type === 'image' && artefact.file_url && (
                <img
                  src={artefact.file_url}
                  alt={artefact.title || 'Generated image'}
                  className="w-full h-48 object-cover rounded-lg mb-3"
                />
              )}
              <div className="text-sm font-medium text-zinc-200 mb-1 group-hover:text-amber-400 transition-colors">
                {artefact.title || 'Untitled'}
              </div>
              <div className="text-xs text-zinc-500 line-clamp-2 mb-2">
                {artefact.description}
              </div>
              <div className="text-[10px] text-zinc-600 font-mono">
                {new Date(artefact.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}











