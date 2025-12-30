'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DemoPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Preparing your demo...')
  const [error, setError] = useState('')

  useEffect(() => {
    const setupDemo = async () => {
      try {
        // Demo credentials
        const demoEmail = 'demo@fuguestate.ai'
        const demoPassword = 'DemoUser123!'

        setStatus('Creating demo account...')

        // Try to sign up (will fail if account exists, which is fine)
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'signup',
            email: demoEmail,
            password: demoPassword
          })
        })

        // Whether signup succeeded or failed, try to sign in
        setStatus('Signing in...')
        const signinResponse = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'signin',
            email: demoEmail,
            password: demoPassword
          })
        })

        if (!signinResponse.ok) {
          const data = await signinResponse.json()
          throw new Error(data.error || 'Failed to sign in')
        }

        setStatus('Loading demo data...')

        // Load demo data
        const demoDataResponse = await fetch('/api/initialization/demo', {
          method: 'POST'
        })

        if (!demoDataResponse.ok) {
          const data = await demoDataResponse.json()
          throw new Error(data.error || 'Failed to load demo data')
        }

        setStatus('Redirecting to workspace...')

        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 500))

        // Redirect to workspace
        router.push('/studio/workspace')
        router.refresh()
      } catch (err: any) {
        console.error('Demo setup error:', err)
        setError(err.message || 'An error occurred')
        setStatus('Error setting up demo')
      }
    }

    setupDemo()
  }, [router])

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <i data-lucide="zap" className="w-8 h-8 text-indigo-400"></i>
          </div>
          <h1 className="font-serif-custom italic text-3xl text-zinc-100 mb-2">
            Demo Mode
          </h1>
          <p className="text-sm text-zinc-500">{status}</p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
            {error}
            <button
              onClick={() => router.push('/auth/login')}
              className="mt-3 text-xs underline hover:no-underline"
            >
              Go to login
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-75"></div>
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-150"></div>
        </div>
      </div>
    </div>
  )
}
