'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthGuard from '../components/AuthGuard'
import NotesUpload from '../components/NotesUpload'

declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized?: boolean
      init?: () => void
    }
  }
}

type VoiceStatus = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'error'

type FirstScanResult = {
  muse: 'synthesis'
  briefing: string
  reflect: { truths: string[]; tensions: string[]; questions: string[]; missingIdeas: string[] }
  recompose: { emailDraft: string; tweetThread: string; outline: string }
  visualise: { imagePrompts: string[]; palette: string[]; storyboardBeats: string[] }
  curate: { tags: string[]; quotes: string[]; collections: Array<{ name: string; description: string; items: string[] }> }
  nextActions: string[]
}

function formatSourceLabel(source: string) {
  if (source === 'gmail') return 'Gmail'
  if (source === 'drive') return 'Drive'
  if (source === 'notion') return 'Notion'
  if (source === 'local') return 'Local'
  return source
}

export default function VoicePage() {
  return (
    <AuthGuard redirectTo="/auth/login?redirect=/voice" requireInitialization={false}>
      <VoiceSession />
    </AuthGuard>
  )
}

function VoiceSession() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [micHelp, setMicHelp] = useState<string | null>(null)

  const [connectedSources, setConnectedSources] = useState<string[]>([])

  const [syncingSource, setSyncingSource] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const [firstScan, setFirstScan] = useState<FirstScanResult | null>(null)
  const [pendingArtefacts, setPendingArtefacts] = useState<any | null>(null)
  const [pipelineError, setPipelineError] = useState<{ error: string; selectedMuse?: string } | null>(null)
  const [retryingPipeline, setRetryingPipeline] = useState(false)

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string>('')
  const [responseText, setResponseText] = useState<string>('')
  
  // New state for enhanced features
  const [recordingDuration, setRecordingDuration] = useState<number>(0)
  const [conversationHistory, setConversationHistory] = useState<Array<{id: string, role: 'user' | 'assistant', text: string, timestamp: Date}>>([])
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [lastError, setLastError] = useState<{message: string, retry?: () => void} | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [uploadedFiles, setUploadedFiles] = useState<Array<{id: string, name: string, uploadedAt: string}>>([])
  const [memoryRichness, setMemoryRichness] = useState<{score: number, level: string, memoryCount: number} | null>(null)
  const [autoStopCountdown, setAutoStopCountdown] = useState<number | null>(null)
  const [micPermissionStatus, setMicPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking')
  const [sidebarTab, setSidebarTab] = useState<'context' | 'files' | 'insights' | 'history'>('context')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recordingStartTimeRef = useRef<number>(0)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastVoiceActivityRef = useRef<number>(0)

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const hasInitializedRef = useRef<boolean>(false)
  
  // Playback waveform refs
  const playbackCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const playbackAudioContextRef = useRef<AudioContext | null>(null)
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null)
  const playbackAnimationFrameRef = useRef<number | null>(null)

  const canRecord = useMemo(() => typeof window !== 'undefined' && 'MediaRecorder' in window, [])
  const canSyncGmail = useMemo(() => connectedSources.includes('gmail'), [connectedSources])
  const canSyncDrive = useMemo(() => connectedSources.includes('drive'), [connectedSources])
  
  // Memoized filtered conversation history for performance
  const filteredHistory = useMemo(() => {
    if (!searchQuery) return conversationHistory
    const query = searchQuery.toLowerCase()
    return conversationHistory.filter(msg => msg.text.toLowerCase().includes(query))
  }, [conversationHistory, searchQuery])

  const stopWaveform = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
  }, [])

  const stopPlaybackWaveform = useCallback(() => {
    if (playbackAnimationFrameRef.current) {
      cancelAnimationFrame(playbackAnimationFrameRef.current)
      playbackAnimationFrameRef.current = null
    }
    if (playbackAudioContextRef.current) {
      playbackAudioContextRef.current.close()
      playbackAudioContextRef.current = null
    }
    playbackAnalyserRef.current = null
  }, [])

  const drawPlaybackWaveform = useCallback(() => {
    if (!playbackCanvasRef.current || !playbackAnalyserRef.current) return

    const canvas = playbackCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const analyser = playbackAnalyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      playbackAnimationFrameRef.current = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)

      // Clear with fade effect
      ctx.fillStyle = 'rgba(9, 9, 11, 0.15)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const centerY = canvas.height / 2
      const barCount = 80
      const barWidth = canvas.width / barCount
      const maxBarHeight = canvas.height * 0.7

      // Draw ethereal waveform
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength)
        const value = (dataArray[dataIndex] || 0) / 255
        const barHeight = value * maxBarHeight * (0.3 + value * 0.7)
        
        const x = i * barWidth + barWidth / 2
        const topY = centerY - barHeight / 2
        const bottomY = centerY + barHeight / 2

        // Ethereal gradient colors - purple, indigo, pink
        const hue = 250 + (i / barCount) * 60 // Purple to pink range
        const saturation = 70 + value * 30
        const lightness = 50 + value * 30
        
        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(x, topY, x, bottomY)
        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`)
        gradient.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.6)`)
        gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.4)`)
        
        ctx.fillStyle = gradient
        ctx.shadowBlur = 20 * value
        ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`
        
        // Draw rounded bar
        const barX = x - barWidth * 0.4
        const barW = barWidth * 0.8
        const radius = barWidth * 0.4
        ctx.beginPath()
        ctx.moveTo(barX + radius, topY)
        ctx.lineTo(barX + barW - radius, topY)
        ctx.quadraticCurveTo(barX + barW, topY, barX + barW, topY + radius)
        ctx.lineTo(barX + barW, topY + barHeight - radius)
        ctx.quadraticCurveTo(barX + barW, topY + barHeight, barX + barW - radius, topY + barHeight)
        ctx.lineTo(barX + radius, topY + barHeight)
        ctx.quadraticCurveTo(barX, topY + barHeight, barX, topY + barHeight - radius)
        ctx.lineTo(barX, topY + radius)
        ctx.quadraticCurveTo(barX, topY, barX + radius, topY)
        ctx.closePath()
        ctx.fill()
        
        // Add glow dots at peaks
        if (value > 0.5) {
          ctx.beginPath()
          ctx.arc(x, topY, 3 * value, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(x, bottomY, 3 * value, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Draw center line with ethereal glow
      const avgValue = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.2 + avgValue * 0.3})`
      ctx.lineWidth = 1
      ctx.shadowBlur = 15
      ctx.shadowColor = 'rgba(139, 92, 246, 0.6)'
      ctx.beginPath()
      ctx.moveTo(0, centerY)
      ctx.lineTo(canvas.width, centerY)
      ctx.stroke()
    }

    draw()
  }, [])

  const startPlaybackWaveform = useCallback((audioElement: HTMLAudioElement) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      playbackAudioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      playbackAnalyserRef.current = analyser

      const source = audioContext.createMediaElementSource(audioElement)
      source.connect(analyser)
      analyser.connect(audioContext.destination)

      drawPlaybackWaveform()
    } catch (e) {
      console.error('Failed to start playback waveform:', e)
    }
  }, [drawPlaybackWaveform])

  const stopPlayback = useCallback(() => {
    stopPlaybackWaveform()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    setIsPlaying(false)
    setAudioProgress(0)
    setAudioDuration(0)
  }, [stopPlaybackWaveform])

  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw)

      analyser.getByteTimeDomainData(dataArray)

      // Calculate voice activity level for auto-stop
      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        sum += Math.abs((dataArray[i] || 0) - 128)
      }
      const activity = sum / bufferLength / 128
      // Voice activity tracking (removed state variable)
      
      // Check for silence (auto-stop after 3 seconds of silence)
      const now = Date.now()
      if (activity > 0.1) {
        lastVoiceActivityRef.current = now
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = null
        }
      } else if (now - lastVoiceActivityRef.current > 3000 && lastVoiceActivityRef.current > 0) {
        // 3 seconds of silence - show countdown then auto-stop
        if (!silenceTimerRef.current) {
          // Show countdown
          setAutoStopCountdown(3)
          const countdownInterval = setInterval(() => {
            setAutoStopCountdown(prev => {
              if (prev === null || prev <= 1) {
                clearInterval(countdownInterval)
                if (status === 'recording') {
                  stopRecording()
                }
                return null
              }
              return prev - 1
            })
          }, 1000)
          silenceTimerRef.current = setTimeout(() => {
            clearInterval(countdownInterval)
            setAutoStopCountdown(null)
            if (status === 'recording') {
              stopRecording()
            }
          }, 3500)
        }
      } else if (activity > 0.1) {
        // Reset countdown if voice activity detected
        setAutoStopCountdown(null)
      }

      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(9, 9, 11, 0.2)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Enhanced waveform visualization with bars and dots (inspired by image)
      const intensity = Math.min(activity * 2, 1)
      const centerY = canvas.height / 2
      const barCount = 60 // Number of bars for visualizer
      const barWidth = canvas.width / barCount
      const maxBarHeight = canvas.height * 0.8

      // Draw bars and dots
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength)
        const value = (dataArray[dataIndex] || 0) / 255
        const barHeight = value * maxBarHeight * (0.5 + intensity * 0.5)
        
        const x = i * barWidth + barWidth / 2
        const topY = centerY - barHeight / 2
        const bottomY = centerY + barHeight / 2

        // Color gradient based on position and intensity
        const hue = (i / barCount) * 60 + 120 // Green to yellow range
        const saturation = 70 + intensity * 30
        const lightness = 50 + intensity * 20
        
        // Draw bar
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
        ctx.shadowBlur = 15 * intensity
        ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`
        
        // Draw vertical bar
        ctx.fillRect(x - barWidth * 0.3, topY, barWidth * 0.6, barHeight)
        
        // Draw dots at bar ends for more visual interest
        if (barHeight > 5) {
          ctx.beginPath()
          ctx.arc(x, topY, 3 * intensity, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(x, bottomY, 3 * intensity, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Draw center line with glow
      ctx.strokeStyle = `rgba(251, 191, 36, ${0.3 + intensity * 0.3})`
      ctx.lineWidth = 1
      ctx.shadowBlur = 10 * intensity
      ctx.shadowColor = '#fbbf24'
      ctx.beginPath()
      ctx.moveTo(0, centerY)
      ctx.lineTo(canvas.width, centerY)
      ctx.stroke()
    }

    draw()
  }, [status])

  const startWaveform = useCallback((stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    audioContextRef.current = audioContext

    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    analyserRef.current = analyser

    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    drawWaveform()
  }, [drawWaveform])

  const cleanupRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null
    chunksRef.current = []

    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop()
      }
      mediaStreamRef.current = null
    }

    stopWaveform()
  }, [stopWaveform])

  const clearCacheAndReset = useCallback(() => {
    try {
      // Clear all localStorage keys used by the voice system
      localStorage.removeItem('fugue_demo_loaded')
      localStorage.removeItem('fugue_has_visited_voice')
      localStorage.removeItem('fugue_pending_first_scan')
      localStorage.removeItem('fugue_pending_artefacts')
      localStorage.removeItem('fugue_pipeline_error')
      localStorage.removeItem('fugue_voice_history')

      // Reset all state
      setConversationHistory([])
      setFirstScan(null)
      setPendingArtefacts(null)
      setPipelineError(null)
      setTranscript('')
      setResponseText('')
      setSearchQuery('')
      setUploadedFiles([])
      setError(null)
      setLastError(null)
      setSyncResult('Cache cleared and reset complete!')

      // Auto-clear success message
      setTimeout(() => setSyncResult(null), 3000)

      console.log('[Voice] Cache cleared and state reset')
    } catch (err) {
      console.error('[Voice] Error clearing cache:', err)
      setError('Failed to clear cache')
    }
  }, [])

  useEffect(() => {
    const convFromUrl = searchParams.get('conversationId')
    if (convFromUrl) setConversationId(convFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Removed demo version tracking - no longer used

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    // Check if data exists and welcome the user accordingly
    const loadFirstScan = async () => {
      try {
        // STEP 1: Check if user has visited before
        const hasVisited = localStorage.getItem('fugue_has_visited_voice')
        const isReturningUser = hasVisited === 'true'

        // STEP 2: Check if user has ANY data (from initialization or previous sessions)
        console.log('[Voice] 🔍 Checking for existing data...')
        const memRes = await fetch('/api/memories?limit=1')
        const memData = await memRes.json()
        const hasData = memRes.ok && memData?.memories?.[0]

        console.log('[Voice] Has data:', hasData)
        console.log('[Voice] Is returning user:', isReturningUser)

        // STEP 3a: Load analysis data to personalize welcome
        let quote = ''
        let tension = ''
        let truth = ''
        let theme = ''

        if (hasData) {
          try {
            const artefactsRes = await fetch('/api/artefacts?limit=10')
            const artefactsData = await artefactsRes.json()

            // Find analysis artefact with first-scan data
            const analysisArtefact = artefactsData?.artefacts?.find((a: any) =>
              a.metadata?.kind === 'first-scan' || a.metadata?.firstScan
            )

            if (analysisArtefact?.metadata) {
              const meta = analysisArtefact.metadata
              const scan = meta.firstScan || meta

              // Extract specific elements for personalization
              if (scan.curate?.quotes?.[0]) {
                quote = scan.curate.quotes[0]
              }
              if (scan.reflect?.tensions?.[0]) {
                tension = scan.reflect.tensions[0]
              }
              if (scan.reflect?.truths?.[0]) {
                truth = scan.reflect.truths[0]
              }
              if (scan.curate?.tags?.[0]) {
                theme = scan.curate.tags[0]
              }

              console.log('[Voice] 📖 Found analysis:', {
                hasQuote: !!quote,
                hasTension: !!tension,
                hasTruth: !!truth,
                hasTheme: !!theme
              })
            }
          } catch (e) {
            console.warn('[Voice] Could not load analysis for personalization:', e)
          }
        }

        // STEP 3b: Craft intimate, personalized welcome message
        let welcomeMessage = ''

        if (hasData) {
          // User has uploaded data - make it INTIMATE and PERSONAL
          if (isReturningUser) {
            // Returning user - reference their work
            if (quote) {
              welcomeMessage = `Welcome back. I was just thinking about your line, "${quote.slice(0, 60)}..." Want to explore it further?`
            } else if (tension) {
              welcomeMessage = `Welcome back. I've been reflecting on ${tension.toLowerCase()}. Ready to create something from it?`
            } else if (truth) {
              welcomeMessage = `Welcome back. Remember this: ${truth.slice(0, 70)}. Let's build on it.`
            } else {
              welcomeMessage = 'Welcome back. Ready to continue exploring your creative work?'
            }
          } else {
            // First time - introduce herself as their muse who knows their work
            if (quote && tension) {
              welcomeMessage = `I've been reading your work. "${quote.slice(0, 50)}..." This reveals ${tension.toLowerCase()}. I'm Dameris. Let's bring these fragments together.`
            } else if (quote) {
              welcomeMessage = `I'm Dameris, your muse. I've been studying your writing. "${quote.slice(0, 60)}..." This line stayed with me. Let's explore it.`
            } else if (truth) {
              welcomeMessage = `I'm Dameris. I've analyzed your work and found this: ${truth.slice(0, 70)}. Let me help you create from it.`
            } else if (theme) {
              welcomeMessage = `I'm Dameris, your creative muse. I notice ${theme} runs through your work. Let's explore that together.`
            } else {
              welcomeMessage = 'Welcome to your creative space. I\'m Dameris, your muse. I\'ve analyzed your work and I\'m ready to help you create.'
            }
          }
        } else {
          // No data yet - guide them to upload
          welcomeMessage = isReturningUser
            ? 'Welcome back. Upload your creative work to get started.'
            : 'Welcome. I\'m Dameris, your creative muse. Upload your writing or notes in the Context panel to begin.'
        }

        console.log('[Voice] 🎤 Speaking welcome:', welcomeMessage)

        // STEP 4: Speak welcome message
        await speakText(welcomeMessage)

        // Wait to ensure welcome completes
        await new Promise(resolve => setTimeout(resolve, 800))

        // Mark as visited AFTER speaking welcome
        localStorage.setItem('fugue_has_visited_voice', 'true')

        // STEP 5: Only proceed with analysis if data exists
        if (!hasData) {
          console.log('[Voice] ⏸️  No data to analyze. Waiting for upload.')
          return
        }

        // STEP 6: Check for cached first scan from initialization
        const raw = localStorage.getItem('fugue_pending_first_scan')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.briefing) {
            setFirstScan(parsed)
            console.log('[Voice] 📖 Speaking cached briefing')
            await speakText(String(parsed.briefing))
            setTimeout(() => {
              localStorage.removeItem('fugue_pending_first_scan')
            }, 5 * 60 * 1000)
            return
          }
        }

        // STEP 7: Generate fresh first scan from existing data
        console.log('[Voice] 🔄 Generating first scan from existing data...')
        const recentMemory = memData.memories[0]

        const scanRes = await fetch('/api/muse/first-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            museType: 'synthesis',
            memoryId: recentMemory.id,
            limit: 8
          })
        })

        const scanData = await scanRes.json()
        if (scanRes.ok && scanData?.result?.briefing) {
          setFirstScan(scanData.result)
          console.log('[Voice] 📖 Speaking fresh briefing')
          await new Promise(resolve => setTimeout(resolve, 500))
          await speakText(String(scanData.result.briefing))

          localStorage.setItem('fugue_pending_first_scan', JSON.stringify(scanData.result))

          // Auto-generate content in background
          console.log('[Voice] 🎨 Auto-generating content...')
          triggerAutoCreate(recentMemory.id, scanData.result)
        }
      } catch (e) {
        console.error('[Voice] Error loading first scan:', e)
      }
    }

    loadFirstScan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-create impressive content in background after first scan
  const triggerAutoCreate = useCallback(async (memoryId: string, scanResult: any) => {
    try {
      console.log('[Voice] Triggering auto-create for demo...')

      const res = await fetch('/api/muse/auto-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          museType: 'synthesis',
          memoryId,
          firstScan: scanResult
        })
      })

      const data = await res.json()

      if (res.ok && data?.success) {
        console.log('[Voice] Auto-create completed!', data)

        // Set the artefacts to display them
        setPendingArtefacts({
          museType: 'synthesis',
          memoryId,
          poem: data?.poemArtefact ? { id: data.poemArtefact.id, text: data.poemText || '' } : null,
          image: data?.imageArtefact ? { id: data.imageArtefact.id, url: data.imageArtefact.file_url || data.image || '' } : null,
          collection: data?.collectionArtefact ? { id: data.collectionArtefact.id, data: data.collection || null } : null
        })

        // Save to localStorage
        localStorage.setItem('fugue_pending_artefacts', JSON.stringify({
          poem: data?.poemArtefact ? { id: data.poemArtefact.id, text: data.poemText || '' } : null,
          image: data?.imageArtefact ? { id: data.imageArtefact.id, url: data.imageArtefact.file_url || data.image || '' } : null,
          collection: data?.collectionArtefact ? { id: data.collectionArtefact.id, data: data.collection || null } : null
        }))
      }
    } catch (e) {
      console.error('[Voice] Auto-create failed:', e)
      // Don't show error to user - this is background
    }
  }, [])

  useEffect(() => {
    const loadPendingArtefacts = async () => {
      // Try localStorage first
      try {
        const raw = localStorage.getItem('fugue_pending_artefacts')
        if (raw) {
          const parsed = JSON.parse(raw)
          setPendingArtefacts(parsed)
          localStorage.removeItem('fugue_pending_artefacts')
          return
        }
      } catch {
        // ignore localStorage errors
      }

      // Fallback: query DB for artefacts created in last 60 seconds
      try {
        const res = await fetch('/api/artefacts/recent?limit=3&within=60')
        const data = await res.json()
        if (data?.success && data?.artefacts?.length > 0) {
          // Transform DB artefacts to display format
          const poem = data.artefacts.find((a: any) => a.metadata?.kind === 'poem')
          const image = data.artefacts.find((a: any) => a.artefact_type === 'image')
          const collection = data.artefacts.find((a: any) => a.metadata?.kind === 'collection')

          if (poem || image || collection) {
            setPendingArtefacts({
              poem: poem ? { id: poem.id, text: poem.metadata?.text || poem.description } : null,
              image: image ? { id: image.id, url: image.file_url } : null,
              collection: collection ? { id: collection.id, data: collection.metadata?.collection } : null
            })
          }
        }
      } catch (e) {
        console.error('Failed to load recent artefacts:', e)
      }
    }

    loadPendingArtefacts()
  }, [])
  const loadConnectedSources = useCallback(async () => {
    try {
      const res = await fetch('/api/initialization/status')
      const data = await res.json()
      if (res.ok && Array.isArray(data.connectedSources)) {
        setConnectedSources(data.connectedSources)
      }
    } catch {
      // fail open; we can still demo uploads + voice
    }
  }, [])

  const loadUploadedFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/memories?limit=5')
      const data = await res.json()
      if (res.ok && data.memories) {
        const files = data.memories
          .filter((m: any) => m.extracted_data?.filename || m.content_type === 'document')
          .map((m: any) => ({
            id: m.id,
            name: m.extracted_data?.filename || 'Document',
            uploadedAt: m.created_at || m.temporal_marker
          }))
        setUploadedFiles(files)
      }
    } catch (e) {
      console.error('Failed to load uploaded files:', e)
    }
  }, [])

  const loadMemoryRichness = useCallback(async () => {
    try {
      const res = await fetch('/api/memories/richness')
      const data = await res.json()
      if (res.ok && data) {
        setMemoryRichness({
          score: data.score || 0,
          level: data.level || 'getting_started',
          memoryCount: data.memoryCount || 0
        })
      }
    } catch (e) {
      console.error('Failed to load memory richness:', e)
      // Set default if API fails
      setMemoryRichness({ score: 0, level: 'getting_started', memoryCount: 0 })
    }
  }, [])

  useEffect(() => {
    loadConnectedSources()
    loadUploadedFiles()
    loadMemoryRichness()
  }, [loadConnectedSources, loadUploadedFiles, loadMemoryRichness])

  useEffect(() => {
    // Check for pipeline errors from initialization
    try {
      const raw = localStorage.getItem('fugue_pipeline_error')
      if (raw) {
        const parsed = JSON.parse(raw)
        // Only show errors from last 5 minutes
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          setPipelineError(parsed)
        }
        localStorage.removeItem('fugue_pipeline_error')
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    return () => {
      cleanupRecorder()
      stopPlayback()
    }
  }, [cleanupRecorder, stopPlayback])

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const tag = el?.tagName?.toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || (el as any)?.isContentEditable
      
      // If speaking, handle pause/resume and stop (priority over other shortcuts)
      if (status === 'speaking') {
        // Space to pause/resume
        if (e.code === 'Space' && !isInput) {
          e.preventDefault()
          if (audioRef.current) {
            if (isPlaying) {
              audioRef.current.pause()
            } else {
              audioRef.current.play()
            }
          }
          return
        }
        
        // Escape to stop completely (but allow closing shortcuts if open)
        if (e.code === 'Escape' && !showShortcuts) {
          e.preventDefault()
          stopPlayback()
          setStatus('idle')
          isSpeakingRef.current = false
          return
        }
      }
      
      // Spacebar toggles mic (unless user is typing or speaking)
      if (e.code === 'Space' && !isInput && status !== 'speaking') {
        e.preventDefault()
        void handleMicClick()
        return
      }
      
      // Cmd/Ctrl+K opens shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowShortcuts(prev => !prev)
        return
      }
      
      // Escape closes shortcuts
      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false)
        return
      }
      
      // Cmd/Ctrl+F focuses search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && !isInput) {
        e.preventDefault()
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement
        searchInput?.focus()
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, canRecord, showShortcuts, isPlaying, stopPlayback])
  
  // Load conversation history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fugue_voice_history')
      if (saved) {
        const parsed = JSON.parse(saved)
        setConversationHistory(parsed.map((msg: any) => ({ ...msg, timestamp: new Date(msg.timestamp) })))
      }
    } catch {
      // ignore
    }
  }, [])
  
  // Save conversation history
  useEffect(() => {
    if (conversationHistory.length > 0) {
      try {
        localStorage.setItem('fugue_voice_history', JSON.stringify(conversationHistory.slice(-50))) // Keep last 50 messages
      } catch {
        // ignore
      }
    }
  }, [conversationHistory])
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationHistory, transcript, responseText])

  const syncSource = useCallback(
    async (sourceType: 'gmail' | 'drive') => {
      setError(null)
      setMicHelp(null)
      setSyncResult(null)
      setSyncingSource(sourceType)
      try {
        const res = await fetch('/api/data-sources/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceType })
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error || `Failed to sync ${sourceType}`)
        }
        setSyncResult(`Synced ${formatSourceLabel(sourceType)}: imported ${data.memoriesCreated ?? 0} memories`)
        await loadConnectedSources()
      } catch (e: any) {
        setError(e?.message || `Failed to sync ${sourceType}`)
      } finally {
        setSyncingSource(null)
      }
    },
    [loadConnectedSources]
  )

  // Sync all sources (unused but available for future use)
  // const syncAll = useCallback(async () => {
  //   if (!hasAnyGoogle) return
  //   if (canSyncGmail) await syncSource('gmail')
  //   if (canSyncDrive) await syncSource('drive')
  // }, [canSyncDrive, canSyncGmail, hasAnyGoogle, syncSource])

  const isSpeakingRef = useRef(false)

  // Clean any JSON artifacts from text before speaking
  const cleanTextForSpeech = (text: string): string => {
    if (!text) return ''

    return text
      // Remove markdown code blocks
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      // Remove JSON object syntax
      .replace(/^\s*\{\s*/g, '')
      .replace(/\}\s*$/g, '')
      // Remove JSON property syntax (e.g., "reflect": {, "truths": [)
      .replace(/"[a-zA-Z_][a-zA-Z0-9_]*":\s*[\{\[]/g, '')
      .replace(/^\s*"[a-zA-Z_][a-zA-Z0-9_]*":\s*/g, '')
      // Remove array/object closing brackets at start of lines
      .replace(/^\s*[\}\]],?\s*/gm, '')
      .replace(/[\}\]]\s*$/g, '')
      // Remove "muse": "synthesis"
      .replace(/"muse":\s*"synthesis",?\s*/gi, '')
      // Remove "briefing": "
      .replace(/"briefing":\s*"/gi, '')
      // Clean up quotes
      .replace(/\\"/g, '"')
      .replace(/^"\s*/g, '')
      .replace(/\s*"$/g, '')
      .trim()
  }

  const speakText = useCallback(async (text: string) => {
    // Prevent concurrent playback
    if (isSpeakingRef.current) {
      console.log('[Voice] Already speaking, skipping duplicate call')
      return Promise.resolve() // Return resolved promise so caller doesn't hang
    }

    isSpeakingRef.current = true
    setError(null)
    setMicHelp(null)
    stopPlayback()
    setStatus('speaking')

    return new Promise<void>((resolve, reject) => {
      (async () => {
        try {
          // Clean text before speaking to remove any JSON artifacts
          const cleanedText = cleanTextForSpeech(text)
          console.log('[Voice] 🎤 Speaking (cleaned):', cleanedText.substring(0, 100))

          // Explicitly use a confirmed female voice - Bella (EXAVITQu4vr4xnSDxMaL)
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: cleanedText,
              voiceId: 'EXAVITQu4vr4xnSDxMaL' // Bella - confirmed female voice
            })
          })

          if (!res.ok) {
            const data = await res.json().catch(() => null)
            throw new Error(data?.error || data?.details || 'Failed to generate speech')
          }

          const audioBlob = await res.blob()
          const url = URL.createObjectURL(audioBlob)
          audioUrlRef.current = url
          const audio = new Audio(url)
          audioRef.current = audio
          audio.playbackRate = playbackSpeed

          // Update progress
          audio.addEventListener('timeupdate', () => {
            setAudioProgress(audio.currentTime)
            setAudioDuration(audio.duration || 0)
          })

          audio.addEventListener('play', () => setIsPlaying(true))
          audio.addEventListener('pause', () => setIsPlaying(false))

          audio.onended = () => {
            setStatus('idle')
            stopPlaybackWaveform()
            stopPlayback()
            isSpeakingRef.current = false
            resolve() // Resolve promise when audio finishes
          }
          audio.onerror = () => {
            setStatus('idle')
            stopPlaybackWaveform()
            stopPlayback()
            isSpeakingRef.current = false
            const error = new Error('Audio playback failed.')
            setError('Audio playback failed.')
            setLastError({ message: 'Audio playback failed.', retry: () => speakText(text) })
            reject(error)
          }
          await audio.play()
          setIsPlaying(true)

          // Start ethereal waveform visualization
          startPlaybackWaveform(audio)
        } catch (e: any) {
          setStatus('idle')
          isSpeakingRef.current = false
          const errorMsg = e?.message || 'Failed to speak response.'
          setError(errorMsg)
          setLastError({ message: errorMsg, retry: () => speakText(text) })
          reject(e)
        }
      })()
    })
  }, [stopPlayback, playbackSpeed, startPlaybackWaveform, stopPlaybackWaveform])

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null)
      setMicHelp(null)
      setStatus('thinking')
      
      // Add user message to history
      const userMessage = { id: Date.now().toString(), role: 'user' as const, text, timestamp: new Date() }
      setConversationHistory(prev => [...prev, userMessage])
      setTranscript(text)
      
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            conversationId: conversationId || undefined
          })
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error || 'Chat failed')
        }
        setConversationId(data.conversationId || null)
        const response = data.response || ''
        setResponseText(response)
        
        // Add assistant response to history
        if (response) {
          const assistantMessage = { id: (Date.now() + 1).toString(), role: 'assistant' as const, text: response, timestamp: new Date() }
          setConversationHistory(prev => [...prev, assistantMessage])
        }
        
        setStatus('idle')
        if (response) {
          await speakText(response)
        }
        
        // Scroll to bottom
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      } catch (e: any) {
        setStatus('idle')
        const errorMsg = e?.message || 'Failed to send message.'
        setError(errorMsg)
        setLastError({ message: errorMsg, retry: () => sendMessage(text) })
      }
    },
    [conversationId, speakText]
  )

  const transcribeAudio = useCallback(
    async (audioBlob: Blob) => {
      setError(null)
      setMicHelp(null)
      setStatus('transcribing')

      console.log('[Voice] 🎤 Transcribing audio blob:', {
        size: audioBlob.size,
        type: audioBlob.type
      })

      try {
        if (audioBlob.size === 0) {
          throw new Error('Recording is empty. Please speak louder and try again.')
        }

        const formData = new FormData()
        formData.append('audio', audioBlob, 'voice.webm')

        console.log('[Voice] 📡 Sending to /api/stt...')
        const res = await fetch('/api/stt', {
          method: 'POST',
          body: formData
        })
        const data = await res.json().catch(() => null)

        console.log('[Voice] 📝 STT Response:', {
          ok: res.ok,
          status: res.status,
          data
        })

        if (!res.ok) {
          throw new Error(data?.error || data?.details || 'Transcription failed')
        }
        const text = data?.transcript || data?.text || ''
        if (!text) {
          throw new Error('No speech detected. Please speak clearly and try again.')
        }

        console.log('[Voice] ✅ Transcript:', text)
        setTranscript(text)
        setStatus('idle')

        console.log('[Voice] 💬 Sending message to Dameris...')
        await sendMessage(text)
      } catch (e: any) {
        console.error('[Voice] ❌ Transcription error:', e)
        setStatus('idle')
        const errorMsg = e?.message || 'Failed to transcribe audio.'
        setError(errorMsg)
        setLastError({ message: errorMsg, retry: () => transcribeAudio(audioBlob) })
      }
    },
    [sendMessage]
  )

  const startRecording = useCallback(async () => {
    setError(null)
    setMicHelp(null)
    setSyncResult(null)
    setAutoStopCountdown(null)
    stopPlayback()

    if (!canRecord) {
      setError('Audio recording is not supported in this browser.')
      setStatus('error')
      return
    }

    // Check microphone permission
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      setMicPermissionStatus(permissionStatus.state as 'granted' | 'denied' | 'prompt')
      permissionStatus.onchange = () => {
        setMicPermissionStatus(permissionStatus.state as 'granted' | 'denied' | 'prompt')
      }
    } catch {
      // Permission API not supported, will check via getUserMedia
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicPermissionStatus('granted')
      mediaStreamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      // Store interval reference for cleanup
      let durationInterval: NodeJS.Timeout | null = null
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        if (durationInterval) {
          clearInterval(durationInterval)
          durationInterval = null
        }
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = null
        }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        cleanupRecorder()
        await transcribeAudio(blob)
      }

      recorder.start()
      setStatus('recording')
      recordingStartTimeRef.current = Date.now()
      setRecordingDuration(0)
      lastVoiceActivityRef.current = Date.now()

      // Update recording duration
      durationInterval = setInterval(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          setRecordingDuration(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000))
        } else {
          if (durationInterval) {
            clearInterval(durationInterval)
            durationInterval = null
          }
        }
      }, 1000)

      // Start waveform visualization
      startWaveform(stream)
    } catch (e: any) {
      cleanupRecorder()
      setStatus('idle')
      const name = e?.name || ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setMicHelp('Microphone permission is blocked. Allow microphone access for this site in your browser settings, then try again.')
      } else if (name === 'NotFoundError') {
        setMicHelp('No microphone found. Connect a microphone and try again.')
      } else {
        setMicHelp(e?.message || 'Unable to access microphone.')
      }
    }
  }, [canRecord, cleanupRecorder, stopPlayback, transcribeAudio])

  const stopRecording = useCallback(() => {
    setAutoStopCountdown(null)
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        cleanupRecorder()
        setStatus('idle')
        setRecordingDuration(0)
      }
    } else {
      cleanupRecorder()
      setStatus('idle')
      setRecordingDuration(0)
    }
  }, [cleanupRecorder])

  const handleMicClick = useCallback(async () => {
    if (status === 'recording') {
      stopRecording()
      return
    }
    await startRecording()
  }, [startRecording, status, stopRecording])

  const handleReplay = useCallback(async () => {
    if (!responseText) return
    await speakText(responseText)
  }, [responseText, speakText])

  const handleMuseAction = useCallback(async (action: string) => {
    if (!firstScan) return

    setError(null)
    setMicHelp(null)
    setStatus('thinking')

    try {
      // Get the most recent memory ID
      const memRes = await fetch('/api/memories?limit=1')
      const memData = await memRes.json()

      if (!memRes.ok || !memData?.memories?.[0]) {
        throw new Error('No memory found')
      }

      const memoryId = memData.memories[0].id

      // Call auto-create API with the specific action
      const res = await fetch('/api/muse/auto-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          museType: 'synthesis',
          memoryId,
          firstScan,
          action // visualise, reflect, recompose, or curate
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create content')
      }

      // Update pending artefacts with the created content
      setPendingArtefacts({
        museType: 'synthesis',
        memoryId,
        poem: data?.poemArtefact ? { id: data.poemArtefact.id, text: data.poemText || '' } : null,
        image: data?.imageArtefact ? { id: data.imageArtefact.id, url: data.imageArtefact.file_url || data.image || '' } : null,
        collection: data?.collectionArtefact ? { id: data.collectionArtefact.id, data: data.collection || null } : null
      })

      // Speak a response about what was created
      const actionMessage = action === 'visualise'
        ? 'I\'ve created a visual representation of your collection.'
        : action === 'reflect'
        ? 'I\'ve reflected on the deeper themes in your work.'
        : action === 'recompose'
        ? 'I\'ve drafted new content from your collection.'
        : 'I\'ve curated your writings into meaningful collections.'

      setResponseText(actionMessage)
      setStatus('idle')
      await speakText(actionMessage)

    } catch (e: any) {
      setStatus('idle')
      setError(e?.message || 'Failed to create content.')
    }
  }, [firstScan, speakText])

  // Clear demo data (unused but available for future use)
  // const clearDemo = useCallback(async () => {
  //   if (!demoVersion) return
  //   setError(null)
  //   setSyncResult(null)
  //   try {
  //     const res = await fetch('/api/demo/clear', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ version: demoVersion })
  //     })
  //     const data = await res.json().catch(() => null)
  //     if (!res.ok) {
  //       throw new Error(data?.error || 'Failed to clear demo data')
  //     }
  //     try {
  //       localStorage.removeItem('fugue_demo_loaded')
  //     } catch {
  //       // ignore
  //     }
  //     setDemoVersion(null)
  //     setSyncResult(`Cleared demo data${demoVersion ? ` (${demoVersion})` : ''}.`)
  //     await loadConnectedSources()
  //   } catch (e: any) {
  //     setError(e?.message || 'Failed to clear demo data.')
  //   }
  // }, [demoVersion, loadConnectedSources])

  const retryPipeline = useCallback(async () => {
    if (!pipelineError) return
    setRetryingPipeline(true)
    setError(null)
    setPipelineError(null)

    try {
      // Get recent memories to work with
      const memRes = await fetch('/api/memories?limit=1')
      const memData = await memRes.json()
      if (!memRes.ok || !memData?.memories?.[0]) {
        throw new Error('No memories found. Please upload a file first.')
      }

      const memoryId = memData.memories[0].id
      const museType = pipelineError.selectedMuse || 'synthesis'

      // Run first scan
      const scanRes = await fetch('/api/muse/first-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ museType, memoryId, limit: 8 })
      })
      const scanData = await scanRes.json()

      if (!scanRes.ok || !scanData?.result?.briefing) {
        throw new Error(scanData?.error || 'First scan failed')
      }

      setFirstScan(scanData.result)

      // Run auto-create
      const createRes = await fetch('/api/muse/auto-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ museType, memoryId, firstScan: scanData.result })
      })
      const createData = await createRes.json()

      if (!createRes.ok || !createData?.success) {
        throw new Error(createData?.error || 'Auto-create failed')
      }

      setPendingArtefacts({
        museType,
        memoryId,
        poem: { id: createData?.poemArtefact?.id, text: createData?.poemText || '' },
        image: { id: createData?.imageArtefact?.id, url: createData?.imageArtefact?.file_url || createData?.image || '' },
        collection: { id: createData?.collectionArtefact?.id, data: createData?.collection || null }
      })

      setSyncResult('Pipeline completed successfully!')
      await speakText(scanData.result.briefing)
    } catch (e: any) {
      setError(e?.message || 'Retry failed. Please try uploading a new file.')
    } finally {
      setRetryingPipeline(false)
    }
  }, [pipelineError, speakText])

  // Initialize Unicorn Studio background on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.UnicornStudio?.isInitialized) {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js'
      script.onload = () => {
        if (window.UnicornStudio && !window.UnicornStudio.isInitialized) {
          window.UnicornStudio.init?.()
          if (window.UnicornStudio) {
            window.UnicornStudio.isInitialized = true
          }
        }
      }
      document.head.appendChild(script)
    }
  }, [])

  return (
    <>
      <style jsx global>{`
        @keyframes hue-rotate {
          0% {
            filter: hue-rotate(0deg) saturate(1.2);
          }
          100% {
            filter: hue-rotate(360deg) saturate(1.2);
          }
        }
        .color-shift-bg {
          animation: hue-rotate 20s linear infinite;
        }
        /* Hide scrollbar but keep scroll functionality */
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;  /* Chrome, Safari and Opera */
        }
      `}</style>
      <div className="min-h-screen bg-[#09090b] text-zinc-100 relative overflow-y-auto scrollbar-hide">
        {/* Unicorn Studio Background Animation (like index.html) */}
        <div className="fixed inset-0 -z-10 overflow-hidden" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 0%, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 0%, black 80%, transparent)' }}>
          <div className="absolute inset-0 color-shift-bg">
            <div data-us-project="NMlvqnkICwYYJ6lYb064" className="absolute w-full h-full left-0 top-0 -z-10"></div>
            {/* Dotted/Pixelated Overlay Effect (Animated) */}
            <div className="absolute inset-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, rgba(167, 139, 250, 0.6) 1.5px, transparent 1.5px), radial-gradient(circle, rgba(217, 70, 239, 0.3) 1px, transparent 1px)', backgroundSize: '12px 12px, 6px 6px', backgroundPosition: '0 0, 6px 6px' }}></div>
          </div>
        </div>

      {/* Additional Animated Background Gradients */}
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        {/* Main gradient blobs */}
        <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-gradient-to-br from-violet-600/20 via-purple-500/15 to-transparent rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-[20%] right-[15%] w-[400px] h-[400px] bg-gradient-to-br from-amber-500/15 via-orange-400/10 to-transparent rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-[10%] left-[20%] w-[450px] h-[450px] bg-gradient-to-br from-indigo-500/20 via-blue-400/10 to-transparent rounded-full blur-[110px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[-5%] right-[10%] w-[550px] h-[550px] bg-gradient-to-br from-pink-500/15 via-rose-400/10 to-transparent rounded-full blur-[130px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Top Navigation */}
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b] animate-pulse"></div>
            <span className="font-serif-custom italic text-lg text-zinc-100 tracking-tight">Dameris</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Memory Richness Bar (Context Percentage) */}
            {memoryRichness && (
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 border border-violet-500/20 hover:border-violet-500/40 transition-all group relative">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <div className="flex flex-col min-w-[120px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-violet-300">{memoryRichness.score}%</span>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                        {memoryRichness.level === 'deep_context' ? 'Deep' : 
                         memoryRichness.level === 'rich_foundation' ? 'Rich' :
                         memoryRichness.level === 'building_context' ? 'Building' : 'Starting'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                        style={{ width: `${memoryRichness.score}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                {/* Tooltip with details */}
                <div className="absolute top-full right-0 mt-2 w-72 p-3 bg-zinc-900/95 backdrop-blur-xl border border-violet-500/30 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="text-xs uppercase tracking-wider text-violet-400 mb-2">Context Availability</div>
                  <div className="space-y-2 text-xs text-zinc-300">
                    <div className="flex justify-between">
                      <span>Memories:</span>
                      <span className="text-violet-300 font-medium">{memoryRichness.memoryCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Context Score:</span>
                      <span className="text-violet-300 font-medium">{memoryRichness.score}%</span>
                    </div>
                    <div className="pt-2 border-t border-white/5 text-zinc-400 text-[10px]">
                      {memoryRichness.score < 20 && 'Upload more memories to unlock creative features'}
                      {memoryRichness.score >= 20 && memoryRichness.score < 50 && 'Good foundation! More context = better results'}
                      {memoryRichness.score >= 50 && memoryRichness.score < 80 && 'Rich context available for advanced features'}
                      {memoryRichness.score >= 80 && 'Deep context - ready for amazing creations!'}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Navigation Links */}
            <div className="flex items-center gap-2">
              <a
                href="/studio/workspace.html"
                className="group flex items-center gap-2 text-xs text-zinc-400 hover:text-violet-300 transition-all px-3 py-2 rounded-lg hover:bg-violet-500/10 border border-transparent hover:border-violet-500/30"
                title="View all your creative artefacts"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Workspace</span>
              </a>

              <a
                href="/modes/index.html#creative"
                className="group flex items-center gap-2 text-xs text-zinc-400 hover:text-amber-300 transition-all px-3 py-2 rounded-lg hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30"
                title="Explore creative modes"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <span>Modes</span>
              </a>

              {pendingArtefacts && (pendingArtefacts.image || pendingArtefacts.poem || pendingArtefacts.collection) && (
                <a
                  href="/studio/artefact.html"
                  className="group flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-all px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                  title="View created artefacts"
                >
                  <svg className="w-3.5 h-3.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span className="font-medium">View Creations</span>
                  <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500/20 rounded-full">New</span>
                </a>
              )}

              <button
                onClick={() => router.push('/initialization')}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
              >
                Connect Sources
              </button>
            </div>

            <div className="flex gap-2 ml-4">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} className="text-zinc-400 hover:text-zinc-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {[
                { key: 'Space', desc: 'Start/Stop voice recording' },
                { key: '⌘K', desc: 'Show/hide shortcuts' },
                { key: '⌘F', desc: 'Focus search' },
                { key: 'Esc', desc: 'Close modals' },
                { key: 'Enter', desc: 'Send message (in input)' },
              ].map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                  <span className="text-sm text-zinc-300">{shortcut.desc}</span>
                  <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 font-mono">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>

            {/* Clear Cache & Reset Button */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  if (window.confirm('This will clear all cached data and conversation history. Continue?')) {
                    clearCacheAndReset()
                    setShowShortcuts(false)
                  }
                }}
                className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-lg text-red-300 text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Cache & Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Centered Chat Interface */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 gap-4 pt-20 lg:flex-row flex-col">
        {/* Chat Window */}
        <div className="w-full max-w-4xl h-[90vh] max-h-[90vh] lg:h-[90vh] lg:max-h-[90vh] rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative ring-1 ring-white/5">
          {/* Window glow effects */}
          <div className="absolute top-[-20%] left-[20%] w-[60%] h-[30%] bg-violet-500/10 blur-[80px] pointer-events-none mix-blend-screen"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-amber-500/10 blur-[80px] pointer-events-none mix-blend-screen"></div>

          {/* Header */}
          <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02] relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></div>
              <span className="font-serif-custom italic text-base text-zinc-100 tracking-tight">Chat</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative hidden md:block">
                <input
                  type="text"
                  data-search-input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-32 bg-zinc-950/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50 placeholder-zinc-600 transition-all"
                />
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 pointer-events-none">⌘F</kbd>
              </div>
              
              {/* Export */}
              {conversationHistory.length > 0 && (
                <button
                  onClick={() => {
                    const exportText = conversationHistory.map(msg => 
                      `[${msg.timestamp.toLocaleTimeString()}] ${msg.role === 'user' ? 'You' : 'Dameris'}: ${msg.text}`
                    ).join('\n\n')
                    const blob = new Blob([exportText], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `dameris-conversation-${new Date().toISOString().split('T')[0]}.txt`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1 rounded hover:bg-white/5"
                  title="Export conversation"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              )}
              
              {/* Shortcuts toggle */}
              <button
                onClick={() => setShowShortcuts(prev => !prev)}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1 rounded hover:bg-white/5"
                title="Keyboard shortcuts (⌘K)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              
              {pipelineError && (
                <div className="text-xs text-amber-400 flex items-center gap-2">
                  <span>Artefact error</span>
                  <button onClick={retryPipeline} className="text-amber-300 underline" disabled={retryingPipeline}>
                    {retryingPipeline ? 'Retrying…' : 'Retry'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto px-6 py-4 space-y-4 relative z-10 scroll-smooth no-scrollbar"
            role="log"
            aria-live="polite"
            aria-label="Conversation messages"
          >
            {/* Enhanced Empty State */}
            {!firstScan && conversationHistory.length === 0 && !transcript && !responseText && status === 'idle' && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4 animate-pulse">
                  <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-zinc-200 mb-2">Welcome to Dameris</h3>
                <p className="text-sm text-zinc-400 mb-2 max-w-md">
                  Start a conversation by speaking or typing. Upload files to get insights, or connect your data sources for a richer experience.
                </p>
                
                {/* Contextual Tips */}
                {uploadedFiles.length > 0 && (
                  <p className="text-xs text-emerald-400/80 mb-4 max-w-md">
                    💡 You have {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded. Try asking about them!
                  </p>
                )}
                {memoryRichness && memoryRichness.memoryCount > 0 && (
                  <p className="text-xs text-indigo-400/80 mb-4 max-w-md">
                    📚 You have {memoryRichness.memoryCount} memories. Ask me to synthesize insights from them.
                  </p>
                )}
                {uploadedFiles.length === 0 && (!memoryRichness || memoryRichness.memoryCount === 0) && (
                  <p className="text-xs text-zinc-500 mb-4 max-w-md">
                    💡 Tip: Upload a document or connect a data source to unlock powerful insights
                  </p>
                )}

                {/* Example Prompts */}
                <div className="w-full max-w-lg mb-6">
                  <p className="text-xs text-zinc-500 mb-3">Try asking:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      uploadedFiles.length > 0 ? 'What insights can you find in my uploaded files?' : 'What can you help me with?',
                      memoryRichness && memoryRichness.memoryCount > 0 ? 'Synthesize patterns from my memories' : 'Tell me about your capabilities',
                      'Help me brainstorm creative ideas',
                      'Analyze a document I upload'
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => void sendMessage(prompt)}
                        className="px-3 py-2 text-xs text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-zinc-300 transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={handleMicClick}
                    disabled={!canRecord}
                    className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-emerald-200 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Start Recording
                  </button>
                  <button
                    onClick={() => router.push('/initialization')}
                    className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 rounded-lg text-indigo-200 text-sm font-medium transition-colors"
                  >
                    Connect Sources
                  </button>
                </div>
              </div>
            )}
            
            {/* Conversation History */}
            {filteredHistory.map((msg) => {
              return (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''} animate-fadeInSlide`}>
                <div className={`flex-1 max-w-[80%] space-y-1 ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                  <div className="text-[10px] text-zinc-500">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={`group relative p-3 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'rounded-tr-none bg-white/5 border border-white/10 text-xs text-zinc-200' 
                      : 'rounded-tl-none bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-xs text-zinc-200 leading-relaxed'
                  }`}>
                    {msg.text}
                    {/* Message actions */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.text)
                          setSyncResult('Copied to clipboard')
                          setTimeout(() => setSyncResult(null), 2000)
                        }}
                        className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Copy"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => {
                            void sendMessage(`Regenerate response for: ${conversationHistory.find(m => m.id === (parseInt(msg.id) - 1).toString())?.text || 'previous message'}`)
                          }}
                          className="p-1 rounded bg-zinc-800/80 hover:bg-indigo-500/20 text-zinc-400 hover:text-indigo-400 transition-colors"
                          title="Regenerate"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      )}
                      {msg.role === 'user' && (
                        <button
                          onClick={() => {
                            setConversationHistory(prev => prev.filter(m => m.id !== msg.id))
                            setSyncResult('Message deleted')
                            setTimeout(() => setSyncResult(null), 2000)
                          }}
                          className="p-1 rounded bg-zinc-800/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                      {/* Reaction buttons */}
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => {
                            setSyncResult('👍 Reaction saved')
                            setTimeout(() => setSyncResult(null), 2000)
                          }}
                          className="p-1 rounded bg-zinc-800/80 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 transition-colors"
                          title="Thumbs up"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v3.67c0 .228.052.454.152.666L7.5 15l2.5 5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setSyncResult('👎 Feedback saved')
                            setTimeout(() => setSyncResult(null), 2000)
                          }}
                          className="p-1 rounded bg-zinc-800/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                          title="Thumbs down"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17.5 10l-2.5-5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )
            })}
            
            {/* First Scan Briefing - Beautiful & Short */}
            {firstScan && (
              <div className="flex gap-3 animate-fadeInSlide">
                <div className="flex-1 space-y-3">
                  <div className="text-[10px] text-zinc-500 ml-1 flex items-center gap-2">
                    <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Synthesis Analysis • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  
                  <div className="p-5 rounded-2xl rounded-tl-none bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 shadow-lg">
                    {/* Short, beautiful briefing */}
                    <div className="text-sm text-zinc-100 leading-relaxed space-y-3">
                      {firstScan.briefing.split('\n').slice(0, 3).map((line, idx) => (
                        line.trim() && (
                          <p key={idx} className={idx === 0 ? 'font-medium text-indigo-200' : 'text-zinc-300'}>
                            {line.trim()}
                          </p>
                        )
                      ))}
                      {firstScan.briefing.split('\n').length > 3 && (
                        <p className="text-zinc-400 italic text-xs">
                          {firstScan.briefing.split('\n').slice(3).join(' ').substring(0, 100)}...
                        </p>
                      )}
                    </div>

                    {/* Next Actions - Prominent */}
                    {firstScan.nextActions && firstScan.nextActions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-indigo-500/20">
                        <div className="text-xs text-indigo-400/80 mb-2 font-medium">Quick Actions</div>
                        <div className="flex flex-wrap gap-2">
                          {firstScan.nextActions.slice(0, 3).map((action, idx) => (
                            <button
                              key={idx}
                              onClick={() => void sendMessage(action)}
                              className="px-3 py-1.5 text-xs bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 rounded-lg text-indigo-200 hover:text-indigo-100 transition-all hover:scale-105"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Transcript */}
            {transcript && (
              <div className="flex gap-3 justify-end">
                <div className="flex-1 max-w-[80%] space-y-1">
                  <div className="p-3 rounded-2xl rounded-tr-none bg-white/5 border border-white/10 text-xs text-zinc-200">
                    {transcript}
                  </div>
                </div>
              </div>
            )}

            {/* Response */}
            {responseText && !conversationHistory.some(msg => msg.role === 'assistant' && msg.text === responseText) && (
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <div className="p-4 rounded-2xl rounded-tl-none bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {responseText}
                  </div>
                  <div className="flex items-center gap-2 ml-1">
                    {/* Audio Controls */}
                    {audioRef.current && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (isPlaying) {
                              audioRef.current?.pause()
                            } else {
                              audioRef.current?.play()
                            }
                          }}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {isPlaying ? '⏸' : '▶'}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max={audioDuration || 100}
                          value={audioProgress}
                          onChange={(e) => {
                            if (audioRef.current) {
                              audioRef.current.currentTime = parseFloat(e.target.value)
                            }
                          }}
                          className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <select
                          value={playbackSpeed}
                          onChange={(e) => {
                            const speed = parseFloat(e.target.value)
                            setPlaybackSpeed(speed)
                            if (audioRef.current) {
                              audioRef.current.playbackRate = speed
                            }
                          }}
                          className="text-[10px] bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-zinc-300"
                        >
                          <option value="0.5">0.5x</option>
                          <option value="0.75">0.75x</option>
                          <option value="1">1x</option>
                          <option value="1.25">1.25x</option>
                          <option value="1.5">1.5x</option>
                          <option value="2">2x</option>
                        </select>
                      </div>
                    )}
                    <button onClick={handleReplay} disabled={status === 'speaking'} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
                      Replay
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(responseText)
                        setSyncResult('Copied to clipboard')
                        setTimeout(() => setSyncResult(null), 2000)
                      }}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />

            {/* Enhanced Thinking indicator */}
            {(status === 'transcribing' || status === 'thinking') && (
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <div className="text-[10px] text-zinc-500 ml-1 flex items-center gap-2">
                    <span>{status === 'transcribing' ? 'Transcribing audio...' : 'Dameris is thinking...'}</span>
                    {status === 'thinking' && (
                      <span className="text-zinc-600">(usually takes 2-5 seconds)</span>
                    )}
                  </div>
                  <div className="p-3 rounded-2xl rounded-tl-none bg-white/5 border border-white/5 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '0s' }}></div>
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Error Display with Retry */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm" role="alert">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium mb-1">Error</div>
                    <div>{error}</div>
                  </div>
                  {lastError?.retry && (
                    <button
                      onClick={() => {
                        setError(null)
                        lastError.retry?.()
                      }}
                      className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-200 text-xs font-medium transition-colors flex-shrink-0"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setError(null)
                      setLastError(null)
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {micHelp && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm" role="status">
                {micHelp}
              </div>
            )}

            {syncResult && (
              <div className="text-sm text-emerald-400 text-center" role="status">
                {syncResult}
              </div>
            )}
          </div>

          {/* Ethereal Playback Waveform - When Dameris is speaking */}
          {status === 'speaking' && (
            <div className="px-6 pb-3 relative z-10 animate-fadeInSlide">
              <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-950/80 via-indigo-950/60 to-pink-950/80 border border-purple-500/30 shadow-[0_0_40px_rgba(139,92,246,0.3)]">
                <canvas
                  ref={playbackCanvasRef}
                  width={1200}
                  height={160}
                  className="w-full h-full"
                  style={{ display: 'block' }}
                />
                {/* Ethereal gradient overlays */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-purple-950/40 via-transparent to-pink-950/40"></div>
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-purple-950/60 via-transparent to-transparent"></div>
                
                {/* Title and Status */}
                <div className="absolute top-3 left-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/40 flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white mb-0.5">Dameris Speaking</div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.8)]"></div>
                      <span className="text-xs font-mono text-purple-300 uppercase tracking-wider">Voice Synthesis</span>
                    </div>
                  </div>
                </div>
                
                {/* Pause/Stop Controls - Top Right */}
                <div className="absolute top-3 right-4 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        if (isPlaying) {
                          audioRef.current.pause()
                        } else {
                          audioRef.current.play()
                        }
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-medium transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95"
                    title={isPlaying ? 'Pause (Space)' : 'Resume (Space)'}
                  >
                    {isPlaying ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span>Resume</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      stopPlayback()
                      setStatus('idle')
                      isSpeakingRef.current = false
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-xs font-medium transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95"
                    title="Stop (Esc) - saves tokens"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 6h12v12H6z"/>
                    </svg>
                    <span>Stop</span>
                  </button>
                </div>
                
                {/* Progress indicator */}
                {audioRef.current && (
                  <div className="absolute bottom-3 left-4 right-4">
                    <div className="h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Waveform Visualization (Inspired by image) - Always visible when recording */}
          {status === 'recording' && (
            <div className="px-6 pb-3 relative z-10 animate-fadeInSlide">
              <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-950/80 via-zinc-900/60 to-zinc-950/80 border border-amber-500/30 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
                <canvas
                  ref={canvasRef}
                  width={1200}
                  height={160}
                  className="w-full h-full"
                  style={{ display: 'block' }}
                />
                {/* Gradient overlays for depth */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-zinc-950/40 via-transparent to-zinc-950/40"></div>
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent"></div>
                
                {/* Title and Status */}
                <div className="absolute top-3 left-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white mb-0.5">Harmonic Isolation</div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                      <span className="text-xs font-mono text-emerald-300 uppercase tracking-wider">Live Audio</span>
                    </div>
                  </div>
                </div>
                
                {/* Timestamp and Countdown (Top Right) */}
                <div className="absolute top-3 right-4 flex flex-col items-end gap-1">
                  <span className="text-sm font-mono text-amber-400 font-semibold">
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </span>
                  {autoStopCountdown !== null && (
                    <span className="text-xs font-mono text-red-400 animate-pulse">
                      Stopping in {autoStopCountdown}...
                    </span>
                  )}
                  {micPermissionStatus === 'denied' && (
                    <span className="text-xs text-red-400">⚠️ Mic permission denied</span>
                  )}
                </div>
                
                {/* Progress Bar (Bottom) */}
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((recordingDuration / 60) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Voice Input Section */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-white/5 bg-zinc-900/40 relative z-10 space-y-3">
            {/* Text input for asking questions */}
            <div className="relative">
              <input
                type="text"
                placeholder="Ask Dameris about your creative work..."
                className="w-full bg-zinc-950/50 border border-white/10 rounded-xl pl-4 pr-24 py-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 placeholder-zinc-600 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    void sendMessage(e.currentTarget.value)
                    e.currentTarget.value = ''
                  }
                }}
                aria-label="Message input"
                aria-describedby="input-help"
              />
              <span id="input-help" className="sr-only">Press Enter to send, or use Space to start voice recording</span>
              <button
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement
                  if (input?.value.trim()) {
                    void sendMessage(input.value)
                    input.value = ''
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-emerald-200 text-xs font-medium transition-colors"
              >
                Send
              </button>
            </div>

            {/* Voice recording prompt */}
            <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  status === 'recording'
                    ? 'bg-gradient-to-br from-red-500/20 to-red-600/20 animate-pulse'
                    : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke={status === 'recording' ? '#f87171' : '#34d399'} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <div className={`text-sm font-medium ${status === 'recording' ? 'text-red-200' : 'text-emerald-200'}`}>
                    {status === 'idle' && 'Or speak with Dameris'}
                    {status === 'recording' && 'Recording...'}
                    {status === 'transcribing' && 'Transcribing...'}
                    {status === 'thinking' && 'Thinking...'}
                    {status === 'speaking' && 'Speaking...'}
                  </div>
                  {status === 'idle' && (
                    <div className="text-xs text-emerald-400/70">Press Space or click to start</div>
                  )}
                  {status === 'recording' && (
                    <div className="text-xs text-red-400/70">Release Space or click Stop</div>
                  )}
                  {micPermissionStatus === 'denied' && (
                    <div className="text-xs text-red-400/70">⚠️ Microphone permission denied</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {status === 'idle' && (
                  <button
                    onClick={async () => {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                        setMicPermissionStatus('granted')
                        setSyncResult('Microphone test successful!')
                        setTimeout(() => setSyncResult(null), 2000)
                        stream.getTracks().forEach(track => track.stop())
                      } catch (e: any) {
                        setMicPermissionStatus('denied')
                        setMicHelp('Microphone test failed. Please check permissions.')
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-zinc-500/20 hover:bg-zinc-500/30 border border-zinc-500/40 text-zinc-200 transition-colors"
                    title="Test microphone"
                  >
                    Test
                  </button>
                )}
                <button
                  onClick={handleMicClick}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 ${
                    status === 'recording'
                      ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200'
                  }`}
                  disabled={status === 'transcribing' || status === 'thinking' || status === 'speaking'}
                  aria-label={status === 'recording' ? 'Stop recording' : 'Start recording'}
                  aria-pressed={status === 'recording'}
                >
                  {status === 'recording' ? 'Stop' : 'Start'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Context Panel */}
        <div className="w-full lg:w-96 h-[60vh] lg:h-[90vh] lg:max-h-[90vh] rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative ring-1 ring-white/5">
          {/* Header with Tabs */}
          <div className="flex-shrink-0 px-4 py-4 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-serif-custom italic text-base text-zinc-100 tracking-tight">Context</span>
            </div>
            {/* Tabs */}
            <div className="flex gap-1">
              {(['context', 'files', 'insights', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded transition-colors ${
                    sidebarTab === tab
                      ? 'bg-white/10 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            {/* Tab Content */}
            {sidebarTab === 'context' && (
              <>
            {/* Upload Section */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  const newSet = new Set(collapsedSections)
                  if (newSet.has('upload')) {
                    newSet.delete('upload')
                  } else {
                    newSet.add('upload')
                  }
                  setCollapsedSections(newSet)
                }}
                className="w-full text-xs uppercase tracking-widest text-zinc-400 font-medium flex items-center justify-between gap-2 hover:text-zinc-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Upload Files
                </div>
                <svg className={`w-3 h-3 transition-transform ${collapsedSections.has('upload') ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 mb-3">
                  {uploadedFiles.slice(0, 3).map((file) => (
                    <div key={file.id} className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-emerald-200 truncate">{file.name}</div>
                        <div className="text-[10px] text-emerald-400/70">Uploaded</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {!collapsedSections.has('upload') && (
              <NotesUpload
                autoFirstScan={true}
                onUploaded={() => {
                  loadConnectedSources()
                  loadUploadedFiles()
                  loadMemoryRichness()
                  setSyncResult('Notes imported as memories.')
                }}
                onFirstScan={async (result) => {
                  setFirstScan(result)
                  await speakText(result.briefing)
                }}
                onNextActionClick={(action) => {
                  void sendMessage(action)
                }}
              />
              )}
            </div>

            {/* Created Artefacts - Quick Access */}
            {(pendingArtefacts?.image || pendingArtefacts?.poem || pendingArtefacts?.collection || firstScan) && (
              <div className="space-y-3 animate-fadeIn">
                <div className="text-xs uppercase tracking-widest text-emerald-400 font-medium flex items-center gap-2">
                  <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Your Creations
                </div>

                <div className="space-y-2">
                  {/* Image Card */}
                  {pendingArtefacts?.image && (
                    <a
                      href="/studio/artefact.html"
                      className="w-full group relative overflow-hidden rounded-lg border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-purple-500/10 hover:from-violet-500/20 hover:to-purple-500/20 transition-all p-3 text-left block"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-violet-200 mb-0.5">Visual Created</div>
                          <div className="text-[10px] text-zinc-400">Click to view image</div>
                        </div>
                        <svg className="w-4 h-4 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </a>
                  )}

                  {/* Poem Card */}
                  {pendingArtefacts?.poem && (
                    <a
                      href="/studio/workspace.html"
                      className="w-full group relative overflow-hidden rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 transition-all p-3 text-left block"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-amber-200 mb-0.5">Poem Created</div>
                          <div className="text-[10px] text-zinc-400 truncate">{pendingArtefacts.poem.text?.slice(0, 40)}...</div>
                        </div>
                        <svg className="w-4 h-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </a>
                  )}

                  {/* Collection Card */}
                  {pendingArtefacts?.collection && (
                    <a
                      href="/studio/workspace.html"
                      className="w-full group relative overflow-hidden rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 transition-all p-3 text-left block"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-emerald-200 mb-0.5">Collection Curated</div>
                          <div className="text-[10px] text-zinc-400">View organized themes</div>
                        </div>
                        <svg className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </a>
                  )}

                  {/* View All Button */}
                  <a
                    href="/studio/workspace.html"
                    className="w-full mt-3 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-xs text-zinc-300 hover:text-zinc-100 transition-all flex items-center justify-center gap-2 group"
                  >
                    <span>View All in Workspace</span>
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                </div>
              </div>
            )}

            {/* Data Sources */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  const newSet = new Set(collapsedSections)
                  if (newSet.has('sources')) {
                    newSet.delete('sources')
                  } else {
                    newSet.add('sources')
                  }
                  setCollapsedSections(newSet)
                }}
                className="w-full text-xs uppercase tracking-widest text-zinc-400 font-medium flex items-center justify-between gap-2 hover:text-zinc-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  Data Sources
                </div>
                <svg className={`w-3 h-3 transition-transform ${collapsedSections.has('sources') ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {!collapsedSections.has('sources') && (
              <div className="space-y-2">
                <button
                  onClick={() => syncSource('gmail')}
                  disabled={!canSyncGmail || syncingSource !== null}
                  className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-sm text-red-300 font-medium">{syncingSource === 'gmail' ? 'Syncing...' : 'Sync Gmail'}</span>
                </button>
                <button
                  onClick={() => syncSource('drive')}
                  disabled={!canSyncDrive || syncingSource !== null}
                  className="w-full p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-sm text-blue-300 font-medium">{syncingSource === 'drive' ? 'Syncing...' : 'Sync Drive'}</span>
                </button>
              </div>
              )}
            </div>

            {/* First Scan Insights */}
            {firstScan && (
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-medium flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Insights
                </h3>
                
                {/* Next Actions */}
                {firstScan.nextActions && firstScan.nextActions.length > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent border border-indigo-500/20">
                    <div className="text-xs text-zinc-400 mb-2 flex items-center gap-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Next Actions
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {firstScan.nextActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => void sendMessage(action)}
                          className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all cursor-pointer"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  {/* Reflect Card */}
                  {firstScan.reflect && (firstScan.reflect.truths?.length > 0 || firstScan.reflect.questions?.length > 0) && (
                    <div className="group relative p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <h4 className="text-sm font-semibold text-emerald-300">Reflect</h4>
                        </div>

                        {firstScan.reflect.truths && firstScan.reflect.truths.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {firstScan.reflect.truths.slice(0, 3).map((truth, idx) => (
                              <div key={idx} className="text-xs text-zinc-300 flex items-start gap-2 leading-relaxed">
                                <span className="text-emerald-400 mt-0.5 flex-shrink-0">−</span>
                                <span>{truth}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {firstScan.reflect.questions && firstScan.reflect.questions.length > 0 && (
                          <div className="space-y-2 pt-3 border-t border-emerald-500/10">
                            <div className="text-[10px] uppercase tracking-wider text-emerald-400/70 mb-2">Questions</div>
                            {firstScan.reflect.questions.slice(0, 2).map((question, idx) => (
                              <div key={idx} className="text-xs text-zinc-400 flex items-start gap-2 leading-relaxed italic">
                                <span className="text-emerald-400 mt-0.5 flex-shrink-0">?</span>
                                <span>{question}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => handleMuseAction('reflect')}
                          className="mt-4 w-full px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-xs text-emerald-300 hover:text-emerald-200 transition-all flex items-center justify-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Explore Emotional Landscape
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Visualise Card */}
                  {firstScan.visualise?.imagePrompts && firstScan.visualise.imagePrompts.length > 0 && (
                    <div className="group relative p-4 rounded-xl bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-transparent border border-violet-500/20 hover:border-violet-500/40 transition-all duration-300 backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <svg className="w-3 h-3 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h4 className="text-sm font-semibold text-violet-300">Visualise</h4>
                        </div>
                        <div className="space-y-2">
                          {firstScan.visualise.imagePrompts.slice(0, 2).map((prompt, idx) => (
                            <div key={idx} className="text-xs text-zinc-300 flex items-start gap-2 leading-relaxed">
                              <span className="text-violet-400 mt-0.5 flex-shrink-0">−</span>
                              <span>{prompt}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => handleMuseAction('visualise')}
                          className="mt-4 w-full px-3 py-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 hover:border-violet-500/50 text-xs text-violet-300 hover:text-violet-200 transition-all flex items-center justify-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Create Visual
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Recompose Card */}
                  {firstScan.recompose?.outline && (
                    <div className="group relative p-4 rounded-xl bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300 backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </div>
                          <h4 className="text-sm font-semibold text-amber-300">Recompose</h4>
                        </div>
                        <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap line-clamp-4">
                          {firstScan.recompose.outline.split('\n').slice(0, 5).join('\n')}
                        </div>

                        <button
                          onClick={() => handleMuseAction('recompose')}
                          className="mt-4 w-full px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-xs text-amber-300 hover:text-amber-200 transition-all flex items-center justify-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Recompose Content
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Curate Tags */}
                  {firstScan.curate?.tags && firstScan.curate.tags.length > 0 && (
                    <div className="group relative p-4 rounded-xl bg-gradient-to-br from-indigo-500/5 via-blue-500/5 to-transparent border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-300 backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <h4 className="text-sm font-semibold text-indigo-300">Curate</h4>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {firstScan.curate.tags.slice(0, 8).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-[10px] bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={() => handleMuseAction('curate')}
                          className="mt-4 w-full px-3 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-500/50 text-xs text-indigo-300 hover:text-indigo-200 transition-all flex items-center justify-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          Organize & Tag
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Artefacts */}
            {pendingArtefacts && (
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-medium flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  New Creations
                </h3>
                {pendingArtefacts?.image?.url && (
                  <div className="rounded-lg overflow-hidden border border-white/10 group cursor-pointer hover:border-violet-500/50 transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pendingArtefacts.image.url} alt="Generated" className="w-full h-auto group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                {pendingArtefacts?.poem?.text && (
                  <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
                    <div className="text-[10px] uppercase tracking-wider text-violet-400 mb-2">Poem</div>
                    <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap italic">{pendingArtefacts.poem.text}</div>
                  </div>
                )}
              </div>
            )}

            {/* Shortcuts */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  const newSet = new Set(collapsedSections)
                  if (newSet.has('shortcuts')) {
                    newSet.delete('shortcuts')
                  } else {
                    newSet.add('shortcuts')
                  }
                  setCollapsedSections(newSet)
                }}
                className="w-full text-xs uppercase tracking-widest text-zinc-400 font-medium flex items-center justify-between gap-2 hover:text-zinc-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Shortcuts
                </div>
                <svg className={`w-3 h-3 transition-transform ${collapsedSections.has('shortcuts') ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {!collapsedSections.has('shortcuts') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <span className="text-xs text-zinc-400">Voice recording</span>
                    <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 font-mono">Space</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <span className="text-xs text-zinc-400">Show shortcuts</span>
                    <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 font-mono">⌘K</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <span className="text-xs text-zinc-400">Search</span>
                    <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 font-mono">⌘F</kbd>
                  </div>
                </div>
              )}
            </div>
            </>
            )}
            
            {sidebarTab === 'files' && (
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-medium">Uploaded Files</h3>
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-2">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                        <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-emerald-200 truncate">{file.name}</div>
                          <div className="text-[10px] text-emerald-400/70">Uploaded {new Date(file.uploadedAt).toLocaleDateString()}</div>
                        </div>
                        <button
                          onClick={() => void sendMessage(`Tell me about ${file.name}`)}
                          className="px-2 py-1 text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded text-emerald-200 transition-colors"
                        >
                          Ask
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 text-center py-8">No files uploaded yet</p>
                )}
              </div>
            )}
            
            {sidebarTab === 'insights' && (
              <div className="space-y-4">
                {firstScan ? (
                  <>
                    <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-medium">Synthesis Insights</h3>
                    
                    {/* Briefing - Short & Beautiful */}
                    <div className="p-4 rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
                      <div className="text-xs text-indigo-400 mb-2 font-medium">Summary</div>
                      <div className="text-sm text-zinc-200 leading-relaxed">
                        {firstScan.briefing.split('\n')[0] || firstScan.briefing.substring(0, 150)}...
                      </div>
                    </div>

                    {/* Key Insights */}
                    {firstScan.reflect && (
                      <div className="space-y-2">
                        {firstScan.reflect.truths && firstScan.reflect.truths.length > 0 && (
                          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                            <div className="text-xs text-emerald-400 mb-1.5 font-medium">Key Observations</div>
                            <div className="space-y-1">
                              {firstScan.reflect.truths.slice(0, 2).map((truth, idx) => (
                                <div key={idx} className="text-xs text-zinc-300">• {truth}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {firstScan.reflect.questions && firstScan.reflect.questions.length > 0 && (
                          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                            <div className="text-xs text-amber-400 mb-1.5 font-medium">Questions to Explore</div>
                            <div className="space-y-1">
                              {firstScan.reflect.questions.slice(0, 2).map((q, idx) => (
                                <div key={idx} className="text-xs text-zinc-300">? {q}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Next Actions */}
                    {firstScan.nextActions && firstScan.nextActions.length > 0 && (
                      <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                        <div className="text-xs text-indigo-400 mb-2 font-medium">Quick Actions</div>
                        <div className="flex flex-wrap gap-2">
                          {firstScan.nextActions.map((a, idx) => (
                            <button
                              key={idx}
                              onClick={() => void sendMessage(a)}
                              className="text-xs px-2 py-1 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 transition-all"
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-zinc-500 text-center py-8">Upload a file to see insights</p>
                )}
              </div>
            )}
            
            {sidebarTab === 'history' && (
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-medium">Recent Conversations</h3>
                {conversationHistory.length > 0 ? (
                  <div className="space-y-2">
                    {conversationHistory.slice(-10).reverse().map((msg) => (
                      <div key={msg.id} className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-[10px] text-zinc-500 mb-1">{msg.timestamp.toLocaleString()}</div>
                        <div className="text-xs text-zinc-300 truncate">{msg.text}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 text-center py-8">No conversation history</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  )
}


