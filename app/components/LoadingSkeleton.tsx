'use client'

export default function LoadingSkeleton() {
  return <ChatMessageSkeleton />
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-zinc-800"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
        <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
      </div>
    </div>
  )
}

export function PipelineStepSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-4 bg-zinc-800 rounded w-1/4"></div>
      <div className="h-2 bg-zinc-800 rounded w-full"></div>
    </div>
  )
}

export function ArtefactCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/10 animate-pulse">
      <div className="h-32 bg-zinc-800 rounded-lg mb-3"></div>
      <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
    </div>
  )
}
