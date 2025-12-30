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

export function StatsCardSkeleton() {
  return (
    <div className="p-6 rounded-lg bg-zinc-900/50 border border-white/10 animate-pulse">
      <div className="text-center space-y-3">
        <div className="h-10 w-24 bg-zinc-800 rounded mx-auto"></div>
        <div className="h-3 w-32 bg-zinc-800 rounded mx-auto"></div>
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="p-6 rounded-lg bg-zinc-900/50 border border-white/10 animate-pulse">
      <div className="h-5 w-40 bg-zinc-800 rounded mb-6"></div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <div className="h-3 w-24 bg-zinc-800 rounded"></div>
              <div className="h-3 w-8 bg-zinc-800 rounded"></div>
            </div>
            <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-800 rounded-full" style={{ width: `${Math.random() * 60 + 40}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TimelineSkeleton() {
  return (
    <div className="p-6 rounded-lg bg-zinc-900/50 border border-white/10 animate-pulse">
      <div className="h-5 w-40 bg-zinc-800 rounded mb-6"></div>
      <div className="flex items-end justify-between gap-2 h-48">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex items-end justify-center h-40">
              <div
                className="w-full bg-zinc-800 rounded-t"
                style={{ height: `${Math.random() * 60 + 40}%` }}
              ></div>
            </div>
            <div className="w-12 h-2 bg-zinc-800 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GalleryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <ArtefactCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ListItemSkeleton() {
  return (
    <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/10 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-800"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-2/3"></div>
          <div className="h-3 bg-zinc-800 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  )
}

export function MemoryTimelineNodeSkeleton() {
  return (
    <div className="flex gap-4 px-6 min-w-full animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex flex-col items-center min-w-[120px]">
          <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-zinc-700"></div>
          <div className="mt-2 w-16 h-3 bg-zinc-800 rounded"></div>
          <div className="mt-1 w-20 h-2 bg-zinc-800 rounded"></div>
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-zinc-800 rounded animate-pulse"></div>
        <div className="h-4 w-96 bg-zinc-800 rounded animate-pulse"></div>
      </div>

      {/* Key metrics skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Timeline skeleton */}
      <TimelineSkeleton />

      {/* Additional stats skeleton */}
      <div className="grid md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg bg-zinc-900/50 border border-white/10 animate-pulse">
            <div className="h-3 w-24 bg-zinc-800 rounded mb-2"></div>
            <div className="h-6 w-20 bg-zinc-800 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}
