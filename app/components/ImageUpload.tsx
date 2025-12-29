'use client'

import { useState, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, Sparkles, FileText } from 'lucide-react'

interface ImageUploadProps {
  onUploadComplete?: (memory: any) => void
  onClose?: () => void
}

export default function ImageUpload({ onUploadComplete, onClose }: ImageUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'image' | 'text' | 'pdf' | null>(null)
  const [context, setContext] = useState('')
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle')

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    const fileName = file.name.toLowerCase()
    const isImage = file.type.startsWith('image/')
    const isText = fileName.endsWith('.txt') || file.type === 'text/plain'
    const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf'

    // Validate file type
    if (!isImage && !isText && !isPdf) {
      setError('Please upload an image (JPG, PNG, GIF, WebP), text file (.txt), or PDF (.pdf)')
      return
    }

    // Validate file size (10MB for images, 100MB for text/PDF)
    const maxSize = isImage ? 10 * 1024 * 1024 : 100 * 1024 * 1024
    if (file.size > maxSize) {
      setError(isImage ? 'Image must be less than 10MB' : 'File must be less than 100MB')
      return
    }

    setFile(file)
    setFileType(isImage ? 'image' : isPdf ? 'pdf' : 'text')
    setError(null)

    // Create preview only for images
    if (isImage) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  const handleUpload = async () => {
    if (!file || !fileType) return

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      let response: Response
      let data: any

      if (fileType === 'image') {
        // Upload image to image analysis endpoint
        const formData = new FormData()
        formData.append('image', file)
        if (context) formData.append('context', context)
        if (title) formData.append('title', title)

        response = await fetch('/api/memories/upload-image', {
          method: 'POST',
          credentials: 'include',
          body: formData
        })

        clearInterval(progressInterval)
        setUploadProgress(100)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Upload failed')
        }

        data = await response.json()
        setAnalysis(data.memory)
      } else {
        // Upload text/PDF to general uploads endpoint
        const formData = new FormData()
        formData.append('file', file)
        if (title) {
          // Store title in context for text files
          formData.append('date', new Date().toISOString())
        }

        response = await fetch('/api/uploads', {
          method: 'POST',
          credentials: 'include',
          body: formData
        })

        clearInterval(progressInterval)
        setUploadProgress(100)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Upload failed')
        }

        data = await response.json()
        // Format response to match expected structure
        setAnalysis({
          id: data.memoryId,
          title: title || file.name,
          content: `Uploaded ${fileType === 'pdf' ? 'PDF' : 'text'} file: ${file.name}`,
          fileType: fileType,
          filename: file.name
        })

        // Check if this is a creative writing collection and show analysis status
        const fileName = file.name.toLowerCase()
        const isCreativeWriting = 
          fileName.includes('creative_writing') ||
          fileName.includes('complete_creative') ||
          fileName.includes('poetry') ||
          fileName.includes('poems')
        
        if (isCreativeWriting && data.memoryId) {
          setAnalysisStatus('running')
          // Poll for analysis completion
          const checkAnalysis = async () => {
            try {
              const analysisRes = await fetch(`/api/memories/creative-analysis?memoryId=${data.memoryId}`, {
                credentials: 'include'
              })
              if (analysisRes.ok) {
                const analysisData = await analysisRes.json()
                if (analysisData.exists && analysisData.status === 'complete') {
                  setAnalysisStatus('complete')
                  return true
                }
              }
            } catch (err) {
              console.error('Error checking analysis:', err)
            }
            return false
          }

          // Poll every 3 seconds for up to 60 seconds
          let pollCount = 0
          const pollInterval = setInterval(async () => {
            pollCount++
            const complete = await checkAnalysis()
            if (complete || pollCount >= 20) {
              clearInterval(pollInterval)
              if (!complete) {
                setAnalysisStatus('error')
              }
            }
          }, 3000)
        }
      }

      // Success! Wait a moment then call completion
      setTimeout(() => {
        if (onUploadComplete) {
          onUploadComplete(data.memory || data)
        }
      }, 2000)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed')
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setFileType(null)
    setContext('')
    setTitle('')
    setAnalysis(null)
    setError(null)
    setUploadProgress(0)
    setAnalysisStatus('idle')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl">
        {/* Close button */}
        {onClose && !uploading && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-2 flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-violet-400" />
              Upload Memory
            </h2>
            <p className="text-sm text-zinc-400">
              Add a photo, text file, or PDF and Dameris will analyze its themes, emotions, and significance
            </p>
          </div>

          {/* Upload complete - Show analysis */}
          {analysis ? (
            <div className="space-y-4 animate-in fade-in duration-500">
              {/* Success header */}
              <div className="flex items-center gap-2 text-emerald-400 mb-4">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">Memory Created Successfully!</span>
              </div>

              {/* Image preview or file info */}
              {analysis.imageUrl ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img
                    src={analysis.imageUrl}
                    alt={analysis.title}
                    className="w-full h-64 object-cover"
                  />
                </div>
              ) : (
                <div className="relative rounded-xl border border-zinc-700 bg-zinc-800/50 p-8">
                  <div className="flex flex-col items-center justify-center text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-violet-400" />
                    <h3 className="text-lg font-medium text-zinc-300 mb-2">
                      {analysis.filename || analysis.title}
                    </h3>
                    <p className="text-sm text-zinc-500">
                      {analysis.fileType === 'pdf' ? 'PDF Document' : 'Text File'} uploaded successfully
                    </p>
                  </div>
                </div>
              )}

              {/* Analysis results */}
              <div className="bg-zinc-800/50 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-medium text-zinc-200">{analysis.title}</h3>

                <div className="prose prose-sm prose-invert max-w-none">
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {analysis.analysis}
                  </p>
                </div>

                {/* Themes */}
                {analysis.themes && analysis.themes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-zinc-400 mb-2">Themes</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.themes.map((theme: string, i: number) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-xs text-violet-300"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mood & Colors */}
                <div className="grid grid-cols-2 gap-4">
                  {analysis.mood && (
                    <div>
                      <h4 className="text-xs font-medium text-zinc-400 mb-2">Mood</h4>
                      <span className="px-3 py-1 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-full text-xs text-fuchsia-300">
                        {analysis.mood}
                      </span>
                    </div>
                  )}

                  {analysis.colors && analysis.colors.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-zinc-400 mb-2">Dominant Colors</h4>
                      <div className="flex gap-1">
                        {analysis.colors.slice(0, 5).map((color: string, i: number) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full border border-zinc-700"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Analysis Status for Text/PDF files */}
              {analysisStatus === 'running' && (
                <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></div>
                    <span className="text-sm text-violet-300">Analyzing your creative writing collection...</span>
                  </div>
                  <p className="text-xs text-violet-400/70 mt-2 ml-5">This may take a minute. You can ask Dameris about your analysis once it's ready.</p>
                </div>
              )}
              {analysisStatus === 'complete' && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="text-sm text-emerald-300">Analysis complete! Ask Dameris about your character profile, writing style, or poem inspirations.</span>
                  </div>
                </div>
              )}
              {analysisStatus === 'error' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    <span className="text-sm text-amber-300">Analysis is taking longer than expected. You can still ask Dameris to analyze your writing.</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4">
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
                >
                  Upload Another
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm transition-all"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Drag & Drop Area */}
              {!preview ? (
                <div
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                    dragActive
                      ? 'border-violet-500 bg-violet-500/5'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="file-input"
                    accept="image/*,.txt,.pdf"
                    onChange={handleFileInput}
                    className="hidden"
                    disabled={uploading}
                  />

                  <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-600" />

                  <h3 className="text-lg font-medium text-zinc-300 mb-2">
                    Drop your file here
                  </h3>
                  <p className="text-sm text-zinc-500 mb-4">
                    or click to browse (JPG, PNG, GIF, WebP, TXT, PDF - Images: Max 10MB, Documents: Max 100MB)
                  </p>

                  <label
                    htmlFor="file-input"
                    className="inline-block px-6 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-white text-sm cursor-pointer transition-colors"
                  >
                    Select File
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Preview - Image or File Info */}
                  {preview ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-64 object-cover"
                      />
                      {!uploading && (
                        <button
                          onClick={reset}
                          className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative rounded-xl border border-zinc-700 bg-zinc-800/50 p-8">
                      <div className="flex flex-col items-center justify-center text-center">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-violet-400" />
                        <h3 className="text-lg font-medium text-zinc-300 mb-2">
                          {file?.name}
                        </h3>
                        <p className="text-sm text-zinc-500 mb-4">
                          {(file?.size || 0) / 1024 / 1024 < 1
                            ? `${((file?.size || 0) / 1024).toFixed(2)} KB`
                            : `${((file?.size || 0) / 1024 / 1024).toFixed(2)} MB`}
                          {' • '}
                          {fileType === 'pdf' ? 'PDF Document' : 'Text File'}
                        </p>
                        {!uploading && (
                          <button
                            onClick={reset}
                            className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm transition-colors"
                          >
                            Change File
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Upload progress */}
                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">
                          {uploadProgress < 100 
                            ? (fileType === 'image' 
                                ? 'Analyzing image...' 
                                : fileType === 'pdf'
                                ? 'Processing PDF...'
                                : 'Processing text...')
                            : 'Complete!'}
                        </span>
                        <span className="text-violet-400">{uploadProgress}%</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Context inputs */}
                  {!uploading && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                          Title (optional)
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g., Beach Sunset"
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                          Context (optional)
                        </label>
                        <textarea
                          value={context}
                          onChange={(e) => setContext(e.target.value)}
                          placeholder="e.g., My vacation in Paris last summer..."
                          rows={3}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Actions */}
                  {!uploading && (
                    <div className="flex gap-2 justify-end pt-4">
                      <button
                        onClick={reset}
                        className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpload}
                        className="px-6 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm transition-all flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {fileType === 'image' ? 'Analyze & Upload' : 'Process & Upload'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
