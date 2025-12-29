'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [reason, setReason] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setMessage('')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          full_name: fullName,
          reason,
          referral_code: referralCode || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist')
      }

      setStatus('success')
      setMessage(data.message || 'You\'re on the waitlist! We\'ll email you when access is granted.')

      // Clear form
      setEmail('')
      setFullName('')
      setReason('')
      setReferralCode('')
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center mb-4">
              <i data-lucide="check" className="w-8 h-8 text-emerald-400"></i>
            </div>
            <h1 className="font-serif-custom italic text-3xl text-zinc-100 mb-3">
              You're on the list!
            </h1>
            <p className="text-zinc-400 mb-6">{message}</p>

            {/* What Happens Next */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-5 text-left mb-6">
              <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider mb-3 text-center">What Happens Next</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-indigo-400 text-xs">1</span>
                  </div>
                  <p className="text-sm text-zinc-400">We'll review your request (typically within 24 hours)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-indigo-400 text-xs">2</span>
                  </div>
                  <p className="text-sm text-zinc-400">You'll receive an email with your signup link</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-emerald-400 text-xs">✓</span>
                  </div>
                  <p className="text-sm text-zinc-400">Click the link to create your account and start exploring</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-zinc-500 mb-1">
              We'll notify you at:
            </p>
            <p className="text-zinc-300 font-medium mb-4">{email}</p>
          </div>

          <div className="space-y-3">
            <Link href="/">
              <Button variant="primary" size="lg" fullWidth>
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-300 hover:text-white transition-colors mb-6"
          >
            <i data-lucide="arrow-left" className="w-4 h-4"></i>
            <span className="text-sm">Back to Home</span>
          </Link>
          <h1 className="font-serif-custom italic text-3xl text-zinc-100 mb-3">
            Join the Waitlist
          </h1>
          <p className="text-sm text-zinc-400 mb-4">
            Request early access to FugueState.ai — where your memories become art, insight, and voice.
          </p>

          {/* What to Expect */}
          <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-4 text-left">
            <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider mb-3">What to Expect</h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-indigo-400 text-xs">1</span>
                </div>
                <div>
                  <p className="text-sm text-zinc-300 font-medium">Request Access</p>
                  <p className="text-xs text-zinc-500">Submit this form with your email</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-indigo-400 text-xs">2</span>
                </div>
                <div>
                  <p className="text-sm text-zinc-300 font-medium">Quick Review</p>
                  <p className="text-xs text-zinc-500">We typically approve within 24 hours</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-indigo-400 text-xs">3</span>
                </div>
                <div>
                  <p className="text-sm text-zinc-300 font-medium">Get Your Invite</p>
                  <p className="text-xs text-zinc-500">Receive an email with your signup link</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-400 text-xs">✓</span>
                </div>
                <div>
                  <p className="text-sm text-zinc-300 font-medium">Start Creating</p>
                  <p className="text-xs text-zinc-500">Enter the fugue state and explore your memories</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {status === 'error' && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {message}
            </div>
          )}

          <Input
            id="fullName"
            type="text"
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            fullWidth
          />

          <Input
            id="email"
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            fullWidth
          />

          <div>
            <label htmlFor="reason" className="block text-sm text-zinc-400 mb-2">
              Why do you want access? (Optional)
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900/50 border border-white/10 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
              placeholder="Tell us what excites you about FugueState..."
            />
          </div>

          <Input
            id="referralCode"
            type="text"
            label="Referral Code (Optional)"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="How did you hear about us?"
            fullWidth
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={status === 'submitting'}
          >
            {status === 'submitting' ? 'Joining...' : 'Request Access'}
          </Button>

          <p className="text-xs text-zinc-600 text-center">
            Already approved? <Link href="/auth/signup" className="text-indigo-400 hover:text-indigo-300">Sign up here</Link>
          </p>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-xs text-zinc-600 text-center">
            By joining the waitlist, you'll be notified when FugueState.ai is ready for you.
          </p>
        </div>
      </div>
    </div>
  )
}
