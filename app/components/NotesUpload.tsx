'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import Button from './ui/Button'
import Card from './ui/Card'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

type FirstScanResult = {
  muse: 'synthesis'
  briefing: string
  reflect: { truths: string[]; tensions: string[]; questions: string[]; missingIdeas: string[] }
  recompose: { emailDraft: string; tweetThread: string; outline: string }
  visualise: { imagePrompts: string[]; palette: string[]; storyboardBeats: string[] }
  curate: { tags: string[]; quotes: string[]; collections: Array<{ name: string; description: string; items: string[] }> }
  nextActions: string[]
}

export default function NotesUpload({
  onUploaded,
  autoFirstScan = false,
  onFirstScan,
  onUploadCompleteUI,
  onNextActionClick
}: {
  onUploaded?: (payload?: { memoryId?: string }) => void
  autoFirstScan?: boolean
  onFirstScan?: (result: FirstScanResult) => void
  onUploadCompleteUI?: () => void
  onNextActionClick?: (action: string) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number; type: string } | null>(null)
  const [firstScanStatus, setFirstScanStatus] = useState<'idle' | 'scanning' | 'ready' | 'error'>('idle')
  const [firstScan, setFirstScan] = useState<FirstScanResult | null>(null)
  const [firstScanError, setFirstScanError] = useState<string | null>(null)
  const [showRetroComplete, setShowRetroComplete] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState('')
  const [dataStream, setDataStream] = useState<string[]>([])
  const [showSuccessConfirmation, setShowSuccessConfirmation] = useState(false)

  const maxBytes = useMemo(() => 1024 * 1024 * 1024, []) // 1GB
  const accept = useMemo(() => '*/*', [])

  // Generate hex codes and operation strings for data stream
  const generateDataStream = useCallback(() => {
    const ops = ['WRITE', 'ENCODE', 'VERIFY', 'STORE', 'INDEX', 'SYNC', 'BACKUP', 'ARCHIVE']
    const stream: string[] = []
    for (let i = 0; i < 20; i++) {
      const hex = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('')
      const op = ops[Math.floor(Math.random() * ops.length)]
      stream.push(`${hex} ${op}`)
    }
    return stream
  }, [])

  // Simulate upload progress
  useEffect(() => {
    if (status === 'uploading') {
      const stages = [
        { progress: 10, stage: '▸ INITIALIZING CONNECTION' },
        { progress: 25, stage: '▸ READING FILE DATA' },
        { progress: 40, stage: '▸ ENCRYPTING PAYLOAD' },
        { progress: 60, stage: '▸ ESTABLISHING SECURE CHANNEL' },
        { progress: 75, stage: '▸ TRANSFERRING TO VAULT' },
        { progress: 90, stage: '▸ VALIDATING INTEGRITY' }
      ]

      let currentStage = 0
      const interval = setInterval(() => {
        if (currentStage < stages.length && stages[currentStage]) {
          setUploadProgress(stages[currentStage]!.progress)
          setUploadStage(stages[currentStage]!.stage)
          currentStage++
        } else {
          clearInterval(interval)
        }
      }, 300)

      // Update data stream
      const streamInterval = setInterval(() => {
        setDataStream(generateDataStream())
      }, 200)

      return () => {
        clearInterval(interval)
        clearInterval(streamInterval)
      }
    } else {
      setUploadProgress(0)
      setUploadStage('')
      setDataStream([])
      return undefined
    }
  }, [status, generateDataStream])

  const reset = useCallback(() => {
    setStatus('idle')
    setMessage(null)
    setFileMeta(null)
    setFirstScanStatus('idle')
    setFirstScan(null)
    setFirstScanError(null)
    setShowRetroComplete(false)
    setShowSuccessConfirmation(false)
    setUploadProgress(0)
    setUploadStage('')
    setDataStream([])
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const runFirstScan = useCallback(
    async (memoryId?: string) => {
      if (!autoFirstScan) return
      if (!memoryId) return

      setFirstScanStatus('scanning')
      setFirstScanError(null)
      setFirstScan(null)
      try {
        const res = await fetch('/api/muse/first-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memoryId })
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(data?.error || 'First scan failed.')
        }
        const result = data?.result as FirstScanResult
        if (!result?.briefing) {
          throw new Error('First scan returned no briefing.')
        }
        setFirstScan(result)
        setFirstScanStatus('ready')
        onFirstScan?.(result)
      } catch (e: any) {
        setFirstScanStatus('error')
        setFirstScanError(e?.message || 'First scan failed.')
      }
    },
    [autoFirstScan, onFirstScan]
  )

  const upload = useCallback(async () => {
    const file = inputRef.current?.files?.[0]
    if (!file) return

    setStatus('uploading')
    setMessage(null)
    setFirstScanStatus('idle')
    setFirstScan(null)
    setFirstScanError(null)
    setShowRetroComplete(false)
    setShowSuccessConfirmation(false)
    setFileMeta({ name: file.name, size: file.size, type: file.type || 'unknown' })

    try {
      if (file.size > maxBytes) {
        throw new Error('File is too large. Max size is 1GB.')
      }

      const supabase = createSupabaseClient()
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) {
        throw new Error('Authentication required. Please sign in again.')
      }

      const userId = authData.user.id
      const safeName = file.name.replace(/[^\w.\-]+/g, '_')
      const storagePath = `vault/${userId}/${Date.now()}_${safeName}`
      const bucket = 'artefacts'

      setUploadProgress(95)
      setUploadStage('▸ COMMITTING TO VAULT')

      const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, {
        upsert: false,
        contentType: file.type || 'application/octet-stream'
      })

      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload file.')
      }

      // If it's small text, include content so it can be analyzed immediately.
      let content: string | undefined
      if ((file.type.startsWith('text/') || safeName.endsWith('.md') || safeName.endsWith('.txt')) && file.size <= 2 * 1024 * 1024) {
        content = (await file.text()).slice(0, 10000)
      }

      setUploadProgress(98)
      setUploadStage('▸ REGISTERING MEMORY')

      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket,
          storagePath,
          name: file.name,
          size: file.size,
          type: file.type,
          content
        })
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to register upload.')
      }

      setUploadProgress(100)
      setUploadStage('▸ TRANSFER COMPLETE')

      // Show success confirmation
      setTimeout(() => {
        setStatus('success')
        setMessage(data?.message || 'Uploaded to vault and saved as a memory.')
        setShowSuccessConfirmation(true)
        setShowRetroComplete(true) // Keep main retro panel active for scan

        const memoryId = data?.memoryId as string | undefined
        onUploaded?.({ memoryId })
        runFirstScan(memoryId)

        // Keep success visible, then hide overlay
        setTimeout(() => {
          setShowRetroComplete(false)
          setShowSuccessConfirmation(false)
          onUploadCompleteUI?.()
        }, 3000)
      }, 500)
    } catch (e: any) {
      setStatus('error')
      setMessage(e?.message || 'Upload failed.')
      setUploadProgress(0)
      setUploadStage('')
    }
  }, [maxBytes, onUploaded, onUploadCompleteUI, runFirstScan])

  const prettySize = useCallback((bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    let value = bytes
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024
      i++
    }
    return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
  }, [])

  return (
    <>
      {/* Full-screen dark overlay during upload */}
      {status === 'uploading' && (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center" style={{ backgroundColor: '#000000' }}>
          {/* Scanline effect */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(255,255,255,0.03) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px)',
              animation: 'flicker 0.15s infinite'
            }}
          />
          {/* CRT glow effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(34,197,94,0.15) 0%, rgba(0,0,0,0.95) 50%, rgba(0,0,0,1) 100%)'
            }}
          />

          <div className="relative z-10 max-w-4xl w-full px-8">
            {/* Title */}
            <div className="text-center mb-8">
              <div className="text-4xl font-mono text-emerald-400 tracking-wider mb-2" style={{ textShadow: '0 0 20px rgba(34,197,94,0.8)' }}>
                WRITING TO MEMORY
              </div>
            </div>

            {/* Memory blocks grid */}
            <div className="grid grid-cols-10 gap-1 mb-8">
              {Array.from({ length: 100 }).map((_, i) => {
                const isActive = (i / 100) * 100 <= uploadProgress
                return (
                  <div
                    key={i}
                    className={`h-8 border transition-all duration-300 ${
                      isActive
                        ? 'bg-emerald-500/40 border-emerald-500/60 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                        : 'bg-zinc-900/50 border-zinc-800/50'
                    }`}
                    style={{
                      animation: isActive ? 'pulse 1.5s ease-in-out infinite' : undefined
                    }}
                  />
                )
              })}
            </div>

            {/* Data stream */}
            <div className="mb-6 h-32 overflow-hidden relative">
              <div className="absolute inset-0 font-mono text-[10px] text-emerald-400/60 space-y-1" style={{ fontFamily: 'monospace' }}>
                {dataStream.map((line, idx) => (
                  <div key={idx} className="opacity-70" style={{ animation: `fadeIn 0.3s ease-in ${idx * 0.1}s both` }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="h-1 bg-zinc-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%`, boxShadow: '0 0 10px rgba(34,197,94,0.6)' }}
                />
              </div>
              <div className="mt-2 text-center">
                <div className="text-sm font-mono text-emerald-400">{uploadProgress}%</div>
                <div className="text-xs font-mono text-zinc-500 mt-1">{uploadStage}</div>
              </div>
            </div>

            {/* File info */}
            {fileMeta && (
              <div className="text-center">
                <div className="text-xs font-mono text-zinc-500 mb-1">FILE: {fileMeta.name}</div>
                <div className="text-[10px] font-mono text-zinc-600">
                  SIZE: {prettySize(fileMeta.size)} | TYPE: {fileMeta.type}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Confirmation Overlay */}
      {showSuccessConfirmation && status === 'success' && (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center" style={{ backgroundColor: '#000000' }}>
          {/* Scanline effect */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 1px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 6px)'
            }}
          />
          {/* CRT glow effect */}
          <div
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{
              background: 'radial-gradient(circle at center, rgba(16,185,129,0.10) 0%, rgba(0,0,0,0.92) 55%, rgba(0,0,0,1) 100%)'
            }}
          />

          <div className="relative text-center px-6">
            <div className="text-8xl mb-4 text-emerald-400" style={{ textShadow: '0 0 30px rgba(16,185,129,1), 0 0 60px rgba(16,185,129,0.8)' }}>
              ✓
            </div>
            <div className="text-4xl font-mono text-emerald-400 tracking-wider mb-3" style={{ textShadow: '0 0 20px rgba(16,185,129,1), 0 0 40px rgba(16,185,129,0.8)' }}>
              UPLOAD COMPLETE
            </div>
            <div className="text-xl font-mono text-cyan-400 mb-3" style={{ textShadow: '0 0 15px rgba(6,182,212,0.8)' }}>
              MEMORY SUCCESSFULLY WRITTEN
            </div>
            {fileMeta && (
              <>
                <div className="text-sm font-mono text-emerald-500/70 mb-2">
                  {fileMeta.name}
                </div>
                <div className="text-xs font-mono text-zinc-500 mb-6">
                  {prettySize(fileMeta.size)} · {fileMeta.type}
                </div>
              </>
            )}
            <div className="font-mono text-xs text-zinc-500 space-y-1 mb-6">
              <div>0x{Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('')} VERIFIED</div>
              <div>0x{Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('')} STORED</div>
              <div>0x{Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('')} INDEXED</div>
            </div>
            <div className="font-mono text-xs text-zinc-500 animate-pulse">
              ▸ RETURNING TO INTERFACE...
            </div>
          </div>
        </div>
      )}

      <Card className="relative overflow-hidden">
      {/* Card-scoped retro overlay (solid dark background for legibility) */}
      {showRetroComplete && status === 'success' && (
        <div className="absolute inset-0 z-20 bg-black flex items-center justify-center px-6">
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 1px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 6px)'
            }}
          />
          <div className="absolute inset-0 pointer-events-none opacity-60"
            style={{
              background:
                'radial-gradient(circle at center, rgba(16,185,129,0.10) 0%, rgba(0,0,0,0.92) 55%, rgba(0,0,0,1) 100%)'
            }}
          />

          <div className="relative text-center">
            <div className="text-6xl mb-3 text-emerald-400 animate-pulse"
              style={{ textShadow: '0 0 20px rgba(16,185,129,1), 0 0 40px rgba(16,185,129,0.8)' }}
            >
              ✓
            </div>
            <div className="text-3xl font-mono text-emerald-400 tracking-wider mb-2"
              style={{ textShadow: '0 0 15px rgba(16,185,129,1), 0 0 30px rgba(16,185,129,0.8)' }}
            >
              UPLOAD COMPLETE
            </div>
            <div className="text-lg font-mono text-cyan-400 mb-2"
              style={{ textShadow: '0 0 10px rgba(6,182,212,0.8)' }}
            >
              MEMORY SUCCESSFULLY WRITTEN
            </div>
            <div className="text-sm font-mono text-emerald-500/70">
              {(fileMeta?.name || 'file')} // {fileMeta ? prettySize(fileMeta.size) : ''}
            </div>
            <div className="mt-6 font-mono text-xs text-zinc-500 animate-pulse">
              ▸ CLOSING IN 2 SECONDS
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 relative z-10">
        <div>
          <h3 className="text-lg font-semibold">Upload to vault</h3>
          <p className="text-sm text-zinc-400">
            Upload files (up to 1GB). Text notes can be analyzed immediately; larger files are stored and referenced as memories.
          </p>
        </div>

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="block w-full text-sm text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-zinc-900 file:text-zinc-100 hover:file:bg-zinc-800"
            aria-label="Upload notes file"
            onChange={() => {
              setStatus('idle')
              setMessage(null)
              const f = inputRef.current?.files?.[0]
              if (f) {
                setFileMeta({ name: f.name, size: f.size, type: f.type || 'unknown' })
              } else {
                setFileMeta(null)
              }
            }}
          />

          {fileMeta && (
            <div className="text-xs text-zinc-500">
              Selected: <span className="text-zinc-300">{fileMeta.name}</span> · {prettySize(fileMeta.size)} ·{' '}
              <span className="font-mono">{fileMeta.type}</span>
              {fileMeta.size > maxBytes && <span className="ml-2 text-red-300">Too large (max 1GB)</span>}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={upload}
              disabled={status === 'uploading' || !inputRef.current?.files?.length || (fileMeta?.size || 0) > maxBytes}
            >
              {status === 'uploading' ? 'Importing…' : 'Import'}
            </Button>
            <Button variant="secondary" size="md" onClick={reset} disabled={status === 'uploading'}>
              Reset
            </Button>
          </div>
        </div>

        {message && status !== 'uploading' && !showSuccessConfirmation && (
          <div
            className={
              status === 'success'
                ? 'p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm'
                : status === 'error'
                  ? 'p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm'
                  : 'p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm'
            }
            role={status === 'error' ? 'alert' : 'status'}
          >
            {message}
          </div>
        )}

        {autoFirstScan && status === 'success' && !showSuccessConfirmation && (
          <div className="space-y-3">
            {firstScanStatus === 'scanning' && (
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-sm relative overflow-hidden">
                <span className="relative z-10 inline-block text-indigo-200">
                  Synthesis is scanning your note…
                </span>
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" style={{ width: '50%' }}></div>
              </div>
            )}
            {firstScanError && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
                First scan failed: {firstScanError}
              </div>
            )}
            {firstScan && (
              <div className="p-4 rounded-xl border border-white/10 bg-zinc-950/30">
                <div className="text-xs text-zinc-500 mb-2">Dameris Briefing (Synthesis)</div>
                <div className="text-sm text-zinc-100 whitespace-pre-wrap">{firstScan.briefing}</div>

                {firstScan.nextActions?.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-zinc-500 mb-2">Next actions</div>
                    <div className="flex flex-wrap gap-2">
                      {firstScan.nextActions.map((a, idx) => (
                        <button
                          key={idx}
                          onClick={() => onNextActionClick?.(a)}
                          className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-200 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                    <div className="text-xs text-zinc-500 mb-2">Reflect</div>
                    <div className="text-xs text-zinc-200 space-y-1">
                      {firstScan.reflect?.truths?.slice(0, 5).map((t, i) => (
                        <div key={i}>- {t}</div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                    <div className="text-xs text-zinc-500 mb-2">Visualise</div>
                    <div className="text-xs text-zinc-200 space-y-1">
                      {firstScan.visualise?.imagePrompts?.slice(0, 3).map((p, i) => (
                        <div key={i}>- {p}</div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                    <div className="text-xs text-zinc-500 mb-2">Recompose</div>
                    <div className="text-xs text-zinc-200">
                      {firstScan.recompose?.outline ? clamp(firstScan.recompose.outline, 420) : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                    <div className="text-xs text-zinc-500 mb-2">Curate</div>
                    <div className="text-xs text-zinc-200 space-y-1">
                      {firstScan.curate?.tags?.slice(0, 10).map((tag, i) => (
                        <span key={i} className="inline-block mr-2 text-[11px] text-zinc-300">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>

      <style jsx>{`
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes shimmer-text {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-shimmer-text {
          background-size: 200% auto;
          animation: shimmer-text 2s linear infinite;
        }
      `}</style>
    </>
  )
}

function clamp(text: string, maxChars: number) {
  if (!text) return ''
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '…'
}




