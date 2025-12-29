'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Pre-fill email from URL params (e.g., from waitlist approval email)
  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Check if user came from approval link (bypass waitlist check)
      const approvedParam = searchParams.get('approved')
      const skipWaitlistCheck = true // DEMO MODE: Disabled waitlist check for seamless signup

      // Step 1: Check waitlist status (unless pre-approved via URL)
      if (!skipWaitlistCheck) {
        const waitlistCheck = await fetch(`/api/waitlist?email=${encodeURIComponent(email)}`)
        const waitlistData = await waitlistCheck.json()

        if (!waitlistCheck.ok || !waitlistData.can_signup) {
          // Not approved yet
          if (waitlistData.status === 'pending') {
            setError('You\'re on the waitlist! We\'ll email you when approved.')
          } else if (waitlistData.error?.includes('not found')) {
            setError('Please join the waitlist first.')
            setTimeout(() => router.push('/waitlist'), 2000)
          } else {
            setError('Access not granted yet. Please check your waitlist status.')
          }
          setLoading(false)
          return
        }
      }

      // Step 2: Proceed with signup if approved
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Signup failed')
        return
      }

      // New users always need initialization
      router.push('/initialization')
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
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-300 hover:text-white transition-colors mb-6">
            <i data-lucide="arrow-left" className="w-4 h-4"></i>
            <span className="text-sm">Back to Home</span>
          </Link>
          <h1 className="font-serif-custom italic text-3xl text-zinc-100 mb-2">Begin Your Journey</h1>
          <p className="text-sm text-zinc-500">Create an account to enter the fugue state</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm text-zinc-400 mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900/50 border border-white/10 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-zinc-400 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-zinc-900/50 border border-white/10 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-zinc-400 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900/50 border border-white/10 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            <p className="mt-1 text-xs text-zinc-600">At least 8 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link
            href="/auth/login"
            className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors block"
          >
            Already have an account? <span className="text-indigo-400">Sign in</span>
          </Link>
          <Link
            href="/waitlist"
            className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors block"
          >
            Need access? <span className="text-amber-400">Join the waitlist</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

