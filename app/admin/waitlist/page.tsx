'use client'

import { useState, useEffect } from 'react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

type WaitlistEntry = {
  id: string
  email: string
  full_name: string | null
  reason: string | null
  referral_code: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export default function AdminWaitlistPage() {
  const [apiKey, setApiKey] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [error, setError] = useState('')

  useEffect(() => {
    const savedKey = localStorage.getItem('admin_api_key')
    if (savedKey) {
      setApiKey(savedKey)
      setIsAuthenticated(true)
      loadWaitlist(savedKey, filter)
    }
  }, [])

  const loadWaitlist = async (key: string, status?: string) => {
    setLoading(true)
    setError('')

    try {
      const url = status && status !== 'all'
        ? `/api/waitlist/admin?status=${status}`
        : '/api/waitlist/admin'

      const response = await fetch(url, {
        headers: { 'x-admin-key': key }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load waitlist')
      }

      setEntries(data.entries || [])
      setStats(data.stats || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load waitlist')
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = () => {
    if (!apiKey) {
      setError('API key is required')
      return
    }
    localStorage.setItem('admin_api_key', apiKey)
    setIsAuthenticated(true)
    loadWaitlist(apiKey, filter)
  }

  const handleStatusChange = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      const response = await fetch('/api/waitlist/admin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': apiKey
        },
        body: JSON.stringify({
          id,
          status: newStatus,
          send_email: true
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status')
      }

      // Reload list
      loadWaitlist(apiKey, filter)
    } catch (err: any) {
      setError(err.message || 'Failed to update entry')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const response = await fetch(`/api/waitlist/admin?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': apiKey }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete entry')
      }

      loadWaitlist(apiKey, filter)
    } catch (err: any) {
      setError(err.message || 'Failed to delete entry')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4">Admin Access</h1>
          <p className="text-zinc-400 text-sm mb-6">
            Enter your admin API key to manage the waitlist
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Admin API Key"
              className="w-full px-4 py-3 rounded-lg bg-zinc-900/50 border border-white/10 text-zinc-100 focus:outline-none focus:border-indigo-500/50"
            />
            <Button onClick={handleAuth} variant="primary" size="lg" fullWidth>
              Authenticate
            </Button>
          </div>

          <p className="mt-4 text-xs text-zinc-600">
            API Key is stored in .env.local as API_KEY or ADMIN_API_KEY
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Waitlist Management</h1>
            <p className="text-zinc-400 text-sm mt-1">Review and approve access requests</p>
          </div>
          <Button
            onClick={() => {
              localStorage.removeItem('admin_api_key')
              setIsAuthenticated(false)
            }}
            variant="secondary"
            size="sm"
          >
            Sign Out
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.status}>
              <div className="text-sm text-zinc-400 mb-1 capitalize">{stat.status}</div>
              <div className="text-3xl font-bold">{stat.count}</div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <Button
              key={f}
              onClick={() => {
                setFilter(f)
                loadWaitlist(apiKey, f)
              }}
              variant={filter === f ? 'primary' : 'secondary'}
              size="sm"
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
          <Button
            onClick={() => loadWaitlist(apiKey, filter)}
            variant="secondary"
            size="sm"
            isLoading={loading}
          >
            Refresh
          </Button>
        </div>

        {/* Entries Table */}
        <Card>
          {loading ? (
            <div className="text-center py-8 text-zinc-500">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">No entries found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr className="text-left">
                    <th className="pb-3 font-medium text-zinc-400">Email</th>
                    <th className="pb-3 font-medium text-zinc-400">Name</th>
                    <th className="pb-3 font-medium text-zinc-400">Reason</th>
                    <th className="pb-3 font-medium text-zinc-400">Joined</th>
                    <th className="pb-3 font-medium text-zinc-400">Status</th>
                    <th className="pb-3 font-medium text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-white/5">
                      <td className="py-3">{entry.email}</td>
                      <td className="py-3">{entry.full_name || '—'}</td>
                      <td className="py-3 max-w-xs truncate">{entry.reason || '—'}</td>
                      <td className="py-3">{new Date(entry.created_at).toLocaleDateString()}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            entry.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : entry.status === 'rejected'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-3 space-x-2">
                        {entry.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(entry.id, 'approved')}
                              className="text-emerald-400 hover:text-emerald-300 text-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(entry.id, 'rejected')}
                              className="text-red-400 hover:text-red-300 text-xs"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-zinc-500 hover:text-zinc-400 text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
