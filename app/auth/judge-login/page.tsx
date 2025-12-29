'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/app/components/ui/Button'
import Input from '@/app/components/ui/Input'

export default function JudgeLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signin',
          email,
          password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        return
      }

      // Verify user is a judge
      const profileResponse = await fetch('/api/user/profile')
      const profileData = await profileResponse.json()

      if (profileData.profile?.user_role !== 'judge') {
        setError('This account does not have judge access. Please use the regular login.')
        return
      }

      // Redirect to judge dashboard
      router.push('/judge-dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-300 hover:text-white transition-colors mb-6"
            aria-label="Return to home page"
          >
            <i data-lucide="arrow-left" className="w-4 h-4" aria-hidden="true"></i>
            <span className="text-sm">Back to Home</span>
          </Link>
          <h1 className="font-serif-custom italic text-3xl text-zinc-100 mb-2">Judge Login</h1>
          <p className="text-sm text-zinc-500">Sign in to access the judging dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" aria-label="Judge sign in form">
          {error && (
            <div
              className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          <Input
            id="email"
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            fullWidth
          />

          <Input
            id="password"
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            fullWidth
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={loading}
            aria-label={loading ? 'Signing in, please wait' : 'Sign in to judge account'}
          >
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link
            href="/auth/judge-signup"
            className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors block"
          >
            Don't have a judge account? <span className="text-indigo-400">Sign up</span>
          </Link>
          <Link
            href="/auth/login"
            className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors block"
          >
            Regular user? <span className="text-indigo-400">Sign in here</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
