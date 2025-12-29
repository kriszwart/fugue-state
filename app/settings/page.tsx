'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const [isResetting, setIsResetting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleReset = async () => {
    setIsResetting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset account')
      }

      // Clear all localStorage
      localStorage.clear()

      setSuccess('Account reset successfully! Redirecting to initialization...')

      // Redirect to initialization after a brief delay
      setTimeout(() => {
        router.push('/initialization')
      }, 2000)
    } catch (err: any) {
      console.error('Reset error:', err)
      setError(err.message || 'Failed to reset account')
      setIsResetting(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const supabase = createSupabaseClient()
      await supabase.auth.signOut()
      router.push('/')
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Settings
            </h1>
            <button
              onClick={() => router.push('/studio/workspace')}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Back to Workspace
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Account Section */}
        <div className="mb-12">
          <h2 className="text-lg font-medium text-zinc-200 mb-6">Account</h2>

          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 space-y-4">
            {/* Sign Out */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/50">
              <div>
                <h3 className="text-sm font-medium text-zinc-300">Sign Out</h3>
                <p className="text-xs text-zinc-500 mt-1">Sign out of your FugueState account</p>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>

            {/* Reset Account */}
            <div className="flex items-center justify-between pt-4">
              <div>
                <h3 className="text-sm font-medium text-red-400">Reset Account</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Delete all memories, conversations, and artefacts. Start fresh from initialization.
                </p>
              </div>
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={isResetting}
                className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Account
              </button>
            </div>
          </div>
        </div>

        {/* Developer Section */}
        <div className="mb-12">
          <h2 className="text-lg font-medium text-zinc-200 mb-6">Developer</h2>

          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-300">Demo Mode</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Quick reset for testing and recording demos
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-mono">Ready for hackathon</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <p className="text-sm text-emerald-400">{success}</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 text-center mb-2">
                Reset Account?
              </h3>
              <p className="text-sm text-zinc-400 text-center">
                This will permanently delete all your memories, conversations, and artefacts. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={isResetting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false)
                  handleReset()
                }}
                disabled={isResetting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResetting ? 'Resetting...' : 'Reset Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
