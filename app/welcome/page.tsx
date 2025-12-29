'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SmartLoader from '../components/SmartLoader';

const quotes = [
  {
    text: 'We are such stuff as dreams are made on, and our little life is rounded with a sleep.',
    author: 'William Shakespeare',
    highlight: ['dreams', 'sleep']
  },
  {
    text: 'Reality is that which, when you stop believing in it, doesn\'t go away.',
    author: 'Philip K. Dick',
    highlight: ['Reality']
  },
  {
    text: 'The only way of discovering the limits of the possible is to venture a little way past them into the impossible.',
    author: 'Arthur C. Clarke',
    highlight: ['impossible']
  },
  {
    text: 'What is a dream, if not memory reimagined?',
    author: 'Dameris',
    highlight: ['memory']
  },
  {
    text: 'We are not going in circles, we are going upwards. The path is a spiral.',
    author: 'Hermann Hesse',
    highlight: ['spiral']
  },
  {
    text: 'The cosmos is within us. We are made of star-stuff. We are a way for the universe to know itself.',
    author: 'Carl Sagan',
    highlight: ['star-stuff']
  },
  {
    text: 'In the province of the mind, what one believes to be true either is true or becomes true.',
    author: 'John C. Lilly',
    highlight: ['mind']
  },
  {
    text: 'The future is already here – it\'s just not evenly distributed.',
    author: 'William Gibson',
    highlight: ['distributed']
  }
];

export default function WelcomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [isEntering, setIsEntering] = useState(false);
  const [error, setError] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [showLoader, setShowLoader] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      // Get user ID
      const { createSupabaseClient } = await import('@/lib/supabase');
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
      }

      // Check if user already has a name
      const existingName = localStorage.getItem('fuguestate_username');
      if (existingName) {
        // Already has name, redirect to initialization
        router.push('/initialization');
        return;
      }

      // Auto-focus input
      inputRef.current?.focus();

      // Initialize lucide icons
      const initIcons = () => {
        if (typeof window !== 'undefined' && (window as any).lucide) {
          (window as any).lucide.createIcons();
        }
      };

      // Try immediately and on a delay for the script to load
      initIcons();
      const iconTimer = setInterval(initIcons, 100);
      setTimeout(() => clearInterval(iconTimer), 2000);

      // Quote rotation
      const interval = setInterval(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
      }, 4000);

      return () => {
        clearInterval(interval);
        clearInterval(iconTimer);
      };
    };

    init();
  }, [router]);

  const handleEnterStudio = async () => {
    const trimmedName = userName.trim();

    if (!trimmedName) {
      setError(true);
      inputRef.current?.focus();
      setTimeout(() => setError(false), 1000);
      return;
    }

    setIsEntering(true);

    // Store the name in localStorage
    localStorage.setItem('fuguestate_username', trimmedName);

    // Optionally save to database
    try {
      await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: trimmedName }),
      });
    } catch (err) {
      console.log('Could not save to database, continuing with localStorage');
    }

    // Show loader with cache warming
    setShowLoader(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEnterStudio();
    }
  };

  const renderQuoteText = (text: string, highlights: string[]) => {
    let renderedText = text;
    highlights.forEach((word) => {
      const regex = new RegExp(`(${word})`, 'gi');
      renderedText = renderedText.replace(
        regex,
        '<span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">$1</span>'
      );
    });
    return renderedText;
  };

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap"
        rel="stylesheet"
      />
      <script src="https://unpkg.com/lucide@latest" async></script>
      <div className="bg-[#09090b] min-h-screen flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden">
        {/* Animated Background */}
        <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden">
          <div
            className="absolute inset-0 w-full h-full opacity-60"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.3), transparent)',
            }}
          />
          <div
            data-us-project="NMlvqnkICwYYJ6lYb064"
            className="absolute w-full h-full left-0 top-0"
          />
          <script
            type="text/javascript"
            dangerouslySetInnerHTML={{
              __html: `!function(){if(!window.UnicornStudio){window.UnicornStudio={isInitialized:!1};var i=document.createElement("script");i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js",i.onload=function(){window.UnicornStudio.isInitialized||(UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)},(document.head || document.body).appendChild(i)}}();`
            }}
          />
          {/* Dotted overlay */}
          <div
            className="absolute inset-0 w-full h-full animate-pulse"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(167, 139, 250, 0.6) 1.5px, transparent 1.5px), radial-gradient(circle, rgba(217, 70, 239, 0.3) 1px, transparent 1px)',
              backgroundSize: '12px 12px, 6px 6px',
              backgroundPosition: '0 0, 6px 6px',
            }}
          />
        </div>

        {/* Navigation */}
        <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 md:py-8">
          <div className="flex items-center gap-3 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <i data-lucide="brain-circuit" className="w-5 h-5 text-indigo-400" data-stroke-width="1.5"></i>
            <span className="text-sm font-medium tracking-tight text-white font-serif-custom italic">
              FugueState.ai
            </span>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-2xl w-full animate-fadeInUp">
            {/* Welcome Section */}
            <div className="text-center mb-6">
              <div className="mb-8">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/20 via-purple-500/10 to-amber-500/20 blur-2xl animate-pulse"></div>
                  <div className="relative w-24 h-24 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                    <i data-lucide="sparkles" className="w-10 h-10 text-indigo-400 animate-pulse" data-stroke-width="1.5"></i>
                  </div>
                </div>
              </div>

              <h1 className="text-4xl md:text-6xl font-light text-white tracking-tight font-serif-custom mb-6 leading-tight">
                Welcome to your{' '}
                <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">
                  Dream Studio
                </span>
              </h1>

              {/* Rotating Quotes */}
              <div className="relative min-h-[120px] mb-8">
                {quotes.map((quote, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-1000 ${
                      index === currentQuoteIndex
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
                  >
                    <p
                      className="text-lg text-zinc-200 mb-2 font-light italic font-serif-custom px-4"
                      dangerouslySetInnerHTML={{
                        __html: `"${renderQuoteText(quote.text, quote.highlight)}"`,
                      }}
                    />
                    <p className="text-sm text-zinc-400">— {quote.author}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Name Input Section */}
            <div className="max-w-md mx-auto space-y-6">
              <div>
                <label htmlFor="userName" className="block text-sm text-zinc-200 mb-3 text-center">
                  What shall{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">
                    Dameris
                  </span>{' '}
                  call you?
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your name..."
                  className={`w-full bg-zinc-950/50 border ${
                    error ? 'border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : 'border-white/10'
                  } rounded-xl px-6 py-4 text-base text-zinc-200 text-center focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder-zinc-600 transition-all ${
                    error ? 'animate-pulse' : ''
                  }`}
                  autoComplete="off"
                  disabled={isEntering}
                />
              </div>

              <button
                onClick={handleEnterStudio}
                disabled={isEntering || !userName.trim()}
                className="group w-full relative inline-flex items-center justify-center px-8 py-4 overflow-hidden font-medium text-white transition duration-300 ease-out bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEntering ? (
                  <>
                    <span className="mr-2">Entering...</span>
                    <i data-lucide="loader" className="w-4 h-4 animate-spin"></i>
                  </>
                ) : (
                  <>
                    <span className="mr-2">Enter Studio</span>
                    <i
                      data-lucide="arrow-right"
                      className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    ></i>
                  </>
                )}
              </button>

              <p className="text-xs text-zinc-300 text-center">
                Your memories are indexed. Your dreams await.
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 text-center">
          <p className="text-xs text-zinc-300">FugueState Studio • Where memories become dreams</p>
        </footer>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            if (typeof window !== 'undefined' && window.lucide) {
              window.lucide.createIcons();
            }
          `,
        }}
      />

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .font-serif-custom {
          font-family: 'Newsreader', serif;
        }
      `}</style>

      {/* Smart Loader with cache warming */}
      {showLoader && userId && (
        <SmartLoader
          userId={userId}
          warmData="user"
          onCacheWarmed={() => router.push('/initialization')}
          message="Preparing your studio..."
          size="lg"
          minimumDuration={1500}
        />
      )}
    </>
  );
}
