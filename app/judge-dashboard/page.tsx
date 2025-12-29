'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/app/components/AuthGuard'
import Button from '@/app/components/ui/Button'
import Card from '@/app/components/ui/Card'
import LoadingSpinner from '@/app/components/LoadingSpinner'

interface JudgeProfile {
  id: string
  email: string
  user_role: string
  is_judge: boolean
}

export default function JudgeDashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<JudgeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      const data = await response.json()

      if (!response.ok) {
        setError('Failed to load profile')
        return
      }

      // Verify user is actually a judge
      if (!data.profile?.is_judge) {
        setError('Access denied: You do not have judge privileges')
        setTimeout(() => router.push('/studio/workspace'), 2000)
        return
      }

      setProfile(data.profile)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signout' })
      })
      router.push('/auth/judge-login')
      router.refresh()
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  return (
    <AuthGuard requireInitialization={false}>
      <div className="min-h-screen bg-[#09090b] text-zinc-100">
        {/* Header */}
        <header className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="font-serif-custom italic text-2xl">Judge Dashboard</h1>
              <p className="text-sm text-zinc-500 mt-1">Hackathon Judging Portal</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {loading && (
            <LoadingSpinner message="Loading judge dashboard..." />
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              {error}
            </div>
          )}

          {!loading && !error && profile && (
            <div className="space-y-6">
              {/* Welcome Section */}
              <Card variant="elevated" padding="lg">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-100 mb-1">
                      Welcome, Judge!
                    </h2>
                    <p className="text-zinc-400 text-sm">
                      Signed in as: <span className="text-indigo-400">{profile.email}</span>
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span className="text-sm text-indigo-400 font-medium">Judge Access Active</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card variant="default" padding="md">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-zinc-100 mb-1">0</div>
                    <div className="text-sm text-zinc-500">Projects to Judge</div>
                  </div>
                </Card>

                <Card variant="default" padding="md">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-zinc-100 mb-1">0</div>
                    <div className="text-sm text-zinc-500">Completed Reviews</div>
                  </div>
                </Card>

                <Card variant="default" padding="md">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-zinc-100 mb-1">-</div>
                    <div className="text-sm text-zinc-500">Avg. Score Given</div>
                  </div>
                </Card>
              </div>

              {/* Actions */}
              <Card variant="elevated" padding="lg">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4">Judging Actions</h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-zinc-100 font-medium mb-1">View Submissions</h4>
                        <p className="text-sm text-zinc-500">Review hackathon project submissions</p>
                      </div>
                      <Button variant="secondary" size="sm" disabled>
                        Coming Soon
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-zinc-100 font-medium mb-1">Scoring Rubric</h4>
                        <p className="text-sm text-zinc-500">View judging criteria and guidelines</p>
                      </div>
                      <Button variant="secondary" size="sm" disabled>
                        Coming Soon
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-zinc-100 font-medium mb-1">My Reviews</h4>
                        <p className="text-sm text-zinc-500">View and edit your submitted reviews</p>
                      </div>
                      <Button variant="secondary" size="sm" disabled>
                        Coming Soon
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Info Section */}
              <Card variant="default" padding="lg">
                <div className="text-center text-zinc-500 text-sm">
                  <p>This is a placeholder judge dashboard for the hackathon.</p>
                  <p className="mt-2">Features like submission review, scoring, and analytics will be added as needed.</p>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
