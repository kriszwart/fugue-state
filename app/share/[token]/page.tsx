'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Card from '@/app/components/ui/Card'
import Button from '@/app/components/ui/Button'
import { DashboardSkeleton } from '@/app/components/LoadingSkeleton'
import FadeIn from '@/app/components/FadeIn'

interface SharedArtefact {
  id: string
  artefact_type: 'image' | 'text' | 'audio' | 'video'
  title: string
  description: string
  file_url: string | null
  metadata: any
  created_at: string
  users: {
    full_name: string | null
  }
}

export default function SharePage() {
  const params = useParams()
  const router = useRouter()
  const token = params?.token as string

  const [artefact, setArtefact] = useState<SharedArtefact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) {
      fetchSharedArtefact()
    }
  }, [token])

  const fetchSharedArtefact = async () => {
    try {
      const response = await fetch(`/api/share/${token}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Artefact not found')
        return
      }

      setArtefact(data.artefact)
    } catch (err: any) {
      console.error('Error fetching shared artefact:', err)
      setError('Failed to load artefact')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6">
        <div className="max-w-4xl mx-auto">
          <DashboardSkeleton />
        </div>
      </div>
    )
  }

  if (error || !artefact) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
        <Card variant="elevated" padding="lg" className="max-w-md text-center">
          <div className="mb-4 text-6xl">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Artefact Not Found</h1>
          <p className="text-zinc-400 mb-6">
            {error || 'This artefact is no longer shared or doesn\'t exist.'}
          </p>
          <Button
            variant="secondary"
            onClick={() => router.push('/')}
          >
            Go to Homepage
          </Button>
        </Card>
      </div>
    )
  }

  const creatorName = artefact.users?.full_name || 'Anonymous'
  const createdDate = new Date(artefact.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <FadeIn duration={400}>
      <div className="min-h-screen bg-[#09090b] text-zinc-100">
        {/* Header */}
        <header className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-serif-custom italic text-2xl bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  FugueState.ai
                </h1>
                <p className="text-sm text-zinc-500 mt-1">Shared Artefact</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/')}
              >
                Create Your Own
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-6 py-12">
          <Card variant="elevated" padding="lg" className="mb-6">
            {/* Meta Info */}
            <div className="mb-6 pb-6 border-b border-white/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl">
                  {creatorName[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Created by</p>
                  <p className="font-medium text-zinc-200">{creatorName}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm text-zinc-500">Created on</p>
                  <p className="font-medium text-zinc-200">{createdDate}</p>
                </div>
              </div>

              <h1 className="text-3xl font-bold mb-2">{artefact.title}</h1>
              {artefact.description && (
                <p className="text-zinc-400 leading-relaxed">{artefact.description}</p>
              )}
            </div>

            {/* Artefact Content */}
            <div className="space-y-6">
              {artefact.artefact_type === 'image' && artefact.file_url && (
                <div className="rounded-lg overflow-hidden bg-black">
                  <img
                    src={artefact.file_url}
                    alt={artefact.title}
                    className="w-full h-auto"
                  />
                </div>
              )}

              {artefact.artefact_type === 'text' && artefact.metadata?.content && (
                <div className="prose prose-invert max-w-none">
                  <div className="p-6 bg-zinc-900/50 rounded-lg border border-white/10">
                    <pre className="whitespace-pre-wrap font-sans text-zinc-300 leading-relaxed">
                      {artefact.metadata.content}
                    </pre>
                  </div>
                </div>
              )}

              {artefact.artefact_type === 'audio' && artefact.file_url && (
                <div className="p-6 bg-zinc-900/50 rounded-lg border border-white/10">
                  <audio controls className="w-full">
                    <source src={artefact.file_url} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {artefact.artefact_type === 'video' && artefact.file_url && (
                <div className="rounded-lg overflow-hidden bg-black">
                  <video controls className="w-full h-auto">
                    <source src={artefact.file_url} />
                    Your browser does not support the video element.
                  </video>
                </div>
              )}
            </div>
          </Card>

          {/* CTA */}
          <Card variant="default" padding="md" className="text-center">
            <p className="text-zinc-400 mb-4">
              Want to create your own AI-powered artefacts?
            </p>
            <Button
              variant="primary"
              onClick={() => router.push('/auth/signup')}
            >
              Get Started with FugueState.ai →
            </Button>
          </Card>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 mt-16">
          <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-zinc-500">
            Powered by FugueState.ai - Your AI Creative Companion
          </div>
        </footer>
      </div>
    </FadeIn>
  )
}
