'use client';

import MemoryMorphLoader from '../components/MemoryMorphLoader';

export default function LoaderDemo() {
  return (
    <div className="min-h-screen bg-[#09090b] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Memory Morph Loader Demo</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Small */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
            <h2 className="text-white text-xl mb-6">Small</h2>
            <MemoryMorphLoader size="sm" />
          </div>

          {/* Medium */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
            <h2 className="text-white text-xl mb-6">Medium</h2>
            <MemoryMorphLoader size="md" />
          </div>

          {/* Large */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
            <h2 className="text-white text-xl mb-6">Large</h2>
            <MemoryMorphLoader size="lg" />
          </div>

          {/* Extra Large */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
            <h2 className="text-white text-xl mb-6">Extra Large</h2>
            <MemoryMorphLoader size="xl" />
          </div>
        </div>

        {/* With custom message */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12">
          <h2 className="text-white text-xl mb-8 text-center">With Custom Message</h2>
          <MemoryMorphLoader size="lg" message="Transmuting your memories..." />
        </div>

        {/* Full screen option */}
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-lg p-8">
          <h2 className="text-white text-xl mb-4">Usage</h2>
          <pre className="bg-black p-4 rounded text-sm text-zinc-300 overflow-x-auto">
{`import MemoryMorphLoader from '@/app/components/MemoryMorphLoader';

// Basic usage
<MemoryMorphLoader />

// With size
<MemoryMorphLoader size="lg" />

// With custom message
<MemoryMorphLoader
  size="md"
  message="Loading your data..."
/>

// Full screen
<MemoryMorphLoader
  fullScreen
  size="xl"
  message="Initializing..."
/>`}
          </pre>
        </div>

        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-lg p-8">
          <h2 className="text-white text-xl mb-4">Animation Stages</h2>
          <div className="text-zinc-300 space-y-2">
            <p><span className="text-violet-400 font-semibold">Stage 1:</span> Seed - Representing the beginning of an idea</p>
            <p><span className="text-indigo-400 font-semibold">Stage 2:</span> Brain - Processing and understanding</p>
            <p><span className="text-blue-400 font-semibold">Stage 3:</span> Memory Chip - Encoding into digital memory</p>
            <p><span className="text-sky-400 font-semibold">Stage 4:</span> Data Centre - Synchronized and stored</p>
          </div>
        </div>
      </div>
    </div>
  );
}
