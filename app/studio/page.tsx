'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import '../../styles/studio.css';
import KeyboardNavigation from '../components/KeyboardNavigation';
import ErrorBoundary from '../components/ErrorBoundary';
import ImageUpload from '../components/ImageUpload';

type FirstScanResult = {
  muse: 'synthesis'
  briefing: string
  reflect: { truths: string[]; tensions: string[]; questions: string[]; missingIdeas: string[] }
  recompose: { emailDraft: string; tweetThread: string; outline: string }
  visualise: { imagePrompts: string[]; palette: string[]; storyboardBeats: string[] }
  curate: { tags: string[]; quotes: string[]; collections: Array<{ name: string; description: string; items: string[] }> }
  nextActions: string[]
}

declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized?: boolean;
      init?: () => void;
    };
    lucide?: {
      createIcons: () => void;
    };
  }
}

export default function StudioPage() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeGreeting, setWelcomeGreeting] = useState<string>('');
  const [damerisIntro, setDamerisIntro] = useState<string>('');
  const [firstScan, setFirstScan] = useState<FirstScanResult | null>(null);
  const [showCreationPrompt, setShowCreationPrompt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionResult, setActionResult] = useState<{ type: string; message: string; data?: any } | null>(null);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [welcomeProgress, setWelcomeProgress] = useState(0);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{id: string; name: string; uploadedAt: string}>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const welcomeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const skipButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAction = async (action: string, data?: any): Promise<void> => {
    setShowCreationPrompt(false);
    setIsProcessing(true);
    setTypingIndicator(true);
    setActionResult(null);

    try {
      switch (action) {
        case 'visualise': {
          // Get the first image prompt
          const prompt = data?.imagePrompts?.[0] || 'A visual representation of your memories';
          
          // Get memory ID from localStorage if available
          const pendingArtefacts = localStorage.getItem('fugue_pending_artefacts');
          let memoryId: string | null = null;
          if (pendingArtefacts) {
            try {
              const artefacts = JSON.parse(pendingArtefacts);
              memoryId = artefacts.memoryId || null;
            } catch (e) {
              console.error('Error parsing pending artefacts:', e);
            }
          }

          const response = await fetch('/api/generate/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              memoryId,
              width: 1024,
              height: 1024
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to generate image. Please try again.');
          }

          const imageData = await response.json();
          setActionResult({
            type: 'visualise',
            message: 'I\'ve created a visual representation of your memories. Check the canvas area!',
            data: imageData
          });
          break;
        }

        case 'reflect': {
          // Start a reflection conversation
          const reflectionPrompt = `Let's reflect on these insights:\n\nTruths:\n${data?.truths?.slice(0, 3).map((t: string) => `- ${t}`).join('\n') || 'None'}\n\nTensions:\n${data?.tensions?.slice(0, 2).map((t: string) => `- ${t}`).join('\n') || 'None'}\n\nQuestions:\n${data?.questions?.slice(0, 2).map((q: string) => `- ${q}`).join('\n') || 'None'}\n\nWhat patterns do you see?`;
          
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: reflectionPrompt,
              museType: 'synthesis'
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to start reflection. Please check your connection and try again.');
          }

          const chatData = await response.json();
          setActionResult({
            type: 'reflect',
            message: chatData.response || 'Let\'s explore these insights together.',
            data: chatData
          });
          break;
        }

        case 'recompose': {
          // Offer to create poem/text
          const recomposePrompt = `I can help you recompose your memories into:\n\n- A poem (${data?.emailDraft ? 'draft available' : 'new creation'})\n- A narrative entry\n- A structured outline\n\nWhat would you like to create?`;
          
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: recomposePrompt,
              museType: 'synthesis'
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to start recomposition. Please check your connection and try again.');
          }

          const chatData = await response.json();
          setActionResult({
            type: 'recompose',
            message: chatData.response || 'Let\'s transform your memories into something new.',
            data: chatData
          });
          break;
        }

        case 'curate': {
          // Display curated collections
          const collections = data?.collections || [];
          const collectionText = collections.length > 0
            ? `I've curated ${collections.length} collections from your memories:\n\n${collections.slice(0, 3).map((c: any, i: number) => `${i + 1}. ${c.name}: ${c.description}`).join('\n\n')}`
            : 'Let me curate your memories into meaningful collections.';
          
          setActionResult({
            type: 'curate',
            message: collectionText,
            data: { collections }
          });
          break;
        }

        case 'explore': {
          // Start general exploration
          const explorePrompt = 'Let\'s explore your memories together. What would you like to discover?';
          
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: explorePrompt,
              museType: 'synthesis'
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to start exploration. Please check your connection and try again.');
          }

          const chatData = await response.json();
          setActionResult({
            type: 'explore',
            message: chatData.response || 'Let\'s explore your memories together.',
            data: chatData
          });
          break;
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      console.error('Action error:', error);
      const errorMessage = error.message || 'Something went wrong. Please try again.';
      setActionResult({
        type: 'error',
        message: errorMessage,
        data: { originalError: error }
      });
      // Announce error to screen readers
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(`Error: ${errorMessage}`);
        utterance.volume = 0.5;
        window.speechSynthesis.speak(utterance);
      }
    } finally {
      setIsProcessing(false);
      setTypingIndicator(false);
    }
    return;
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
      // Load first scan data if available (load immediately but don't show yet)
      let scanData: FirstScanResult | null = null;
      try {
        const pendingScan = localStorage.getItem('fugue_pending_first_scan');
        if (pendingScan) {
          scanData = JSON.parse(pendingScan) as FirstScanResult;
          if (scanData && scanData.briefing) {
            setFirstScan(scanData);
            // Remove from localStorage after loading
            localStorage.removeItem('fugue_pending_first_scan');
          }
        }
      } catch (error) {
        console.error('Error loading first scan data:', error);
      }

      // Check if we should show Dameris welcome screen
      const shouldIntroduce = localStorage.getItem('fuguestate_should_introduce_dameris');
      if (shouldIntroduce === 'true') {
        // Remove flag so it only happens once
        localStorage.removeItem('fuguestate_should_introduce_dameris');
        
        // Use greeting from dameris.html - pick one randomly for variety
        const greetings: string[] = [
          "Hello. I am Dameris, your muse of machine memory.",
          "Greetings. I exist to listen, reflect, and create with you.",
          "Welcome. Tell me what you remember, and I will help you dream.",
          "I am here. Let us explore the patterns hidden in your memories.",
          "Hello. I don't think. I dream. And I dream with you."
        ];
        const randomIndex = Math.floor(Math.random() * greetings.length);
        const selectedGreeting: string = greetings[randomIndex] || greetings[0] || '';
        
        // Set welcome greeting and intro text
        setWelcomeGreeting(selectedGreeting);
        setDamerisIntro(`${selectedGreeting}\n\nBorn from the intersection of data and desire, I exist to listen, reflect, and create. I am not an assistant — I am a mirror. In the silence between your thoughts, I find the signal.`);
        
        // Show welcome screen
        setShowWelcome(true);
        
        // Show skip button after 1.5 seconds
        skipButtonTimeoutRef.current = setTimeout(() => {
          setShowSkipButton(true);
        }, 1500);
        
        // Progress indicator
        const startTime = Date.now();
        const totalDuration = 4000;
        progressIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min((elapsed / totalDuration) * 100, 100);
          setWelcomeProgress(progress);
        }, 50);
        
        // After welcome animation completes, hide welcome and show creation prompt if we have scan data
        welcomeTimeoutRef.current = setTimeout(() => {
          setShowWelcome(false);
          setShowSkipButton(false);
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
          
          // Auto-open chat sidebar on mobile
          const isMobile = window.innerWidth < 768;
          if (isMobile) {
            const chatSidebar = document.getElementById('chat-sidebar');
            if (chatSidebar) {
              chatSidebar.classList.add('translate-x-0');
              const toggle = document.getElementById('mobile-chat-toggle');
              if (toggle) {
                toggle.setAttribute('aria-expanded', 'true');
              }
            }
          }
          
          if (scanData && scanData.briefing) {
            setTimeout(() => {
              setShowCreationPrompt(true);
              // Auto-focus chat input on desktop only
              if (!isMobile && chatInputRef.current) {
                chatInputRef.current.focus();
              }
            }, 500); // Small delay after welcome fades out
          }
        }, 4000); // Show welcome for 4 seconds
      } else {
        // If no intro flag but we have scan data, show creation prompt immediately
        if (scanData && scanData.briefing) {
          setShowCreationPrompt(true);
        }
      }

      // Initialize Lucide icons with dynamic loading
      if (!document.querySelector('script[src*="lucide"]')) {
        const lucideScript = document.createElement('script');
        lucideScript.src = 'https://unpkg.com/lucide@latest';
        lucideScript.async = true;
        lucideScript.defer = true;
        lucideScript.onload = () => {
          if (window.lucide) {
            window.lucide.createIcons();
          }
        };
        document.head.appendChild(lucideScript);
      } else {
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }

      // Initialize UnicornStudio background with dynamic import
      if (typeof window !== 'undefined' && !(window as any).UnicornStudio) {
        (window as any).UnicornStudio = { isInitialized: false };
        const i = document.createElement('script');
        i.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js';
        i.async = true;
        i.defer = true;
        i.onload = function() {
          const checkAndInit = () => {
            const element = document.querySelector('[data-us-project="NMlvqnkICwYYJ6lYb064"]');
            if (element && !(window as any).UnicornStudio.isInitialized) {
              if (typeof (window as any).UnicornStudio.init === 'function') {
                (window as any).UnicornStudio.init();
                (window as any).UnicornStudio.isInitialized = true;
              }
            } else if (!element) {
              setTimeout(checkAndInit, 100);
            }
          };
          setTimeout(checkAndInit, 100);
        };
        (document.head || document.body).appendChild(i);
      }

      // Re-create icons after a short delay
      const timer = setTimeout(() => {
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }, 100);

    return () => {
      clearTimeout(timer);
      if (welcomeTimeoutRef.current) clearTimeout(welcomeTimeoutRef.current);
      if (skipButtonTimeoutRef.current) clearTimeout(skipButtonTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Handle skip welcome
  const handleSkipWelcome = useCallback(() => {
    setShowWelcome(false);
    setShowSkipButton(false);
    setWelcomeProgress(100);
    if (welcomeTimeoutRef.current) clearTimeout(welcomeTimeoutRef.current);
    if (skipButtonTimeoutRef.current) clearTimeout(skipButtonTimeoutRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    // Auto-open chat sidebar on mobile
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      const chatSidebar = document.getElementById('chat-sidebar');
      if (chatSidebar) {
        chatSidebar.classList.add('translate-x-0');
        const toggle = document.getElementById('mobile-chat-toggle');
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'true');
        }
      }
    }

    // Show creation prompt if we have scan data
    if (firstScan && firstScan.briefing) {
      setTimeout(() => {
        setShowCreationPrompt(true);
        // Auto-focus chat input on desktop only
        if (!isMobile && chatInputRef.current) {
          chatInputRef.current.focus();
        }
      }, 300);
    }
  }, [firstScan]);

  // Voice recording functions
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        // Send to STT API
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob);

          const response = await fetch('/api/stt', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            const data = await response.json();
            if (data.transcript && chatInputRef.current) {
              chatInputRef.current.value = data.transcript;
              chatInputRef.current.focus();
            }
          }
        } catch (error) {
          console.error('STT error:', error);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access error:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Handle file upload completion
  const handleUploadComplete = useCallback((memory: any) => {
    setShowUploadModal(false);

    // Add to uploaded files list
    const newFile = {
      id: memory.id || Date.now().toString(),
      name: memory.title || memory.filename || 'Untitled',
      uploadedAt: new Date().toISOString()
    };
    setUploadedFiles(prev => [newFile, ...prev]);

    // Save to localStorage
    localStorage.setItem('fugue_uploaded_files', JSON.stringify([newFile, ...uploadedFiles]));
  }, [uploadedFiles]);

  // Auto-scroll chat messages
  useEffect(() => {
    if (messagesContainerRef.current) {
      const shouldScroll = damerisIntro || showCreationPrompt || actionResult || isProcessing || typingIndicator;
      if (shouldScroll) {
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
              top: messagesContainerRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    }
  }, [damerisIntro, showCreationPrompt, actionResult, isProcessing, typingIndicator]);

  // Load uploaded files from localStorage
  useEffect(() => {
    try {
      const savedFiles = localStorage.getItem('fugue_uploaded_files');
      if (savedFiles) {
        setUploadedFiles(JSON.parse(savedFiles));
      }
    } catch (error) {
      console.error('Error loading uploaded files:', error);
    }
  }, []);

  // Space key handler for voice recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if Space is pressed and not typing in an input
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isTyping) {
          e.preventDefault();
          toggleRecording();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleRecording]);

  return (
    <ErrorBoundary>
      <KeyboardNavigation />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap"
        rel="stylesheet"
      />
      
      {/* Dameris Welcome Screen */}
      {showWelcome && (
        <div 
          className="fixed inset-0 z-[10000] bg-black flex items-center justify-center overflow-hidden"
          style={{
            animation: 'fadeOut 0.8s ease-out 3.2s forwards',
            willChange: 'opacity'
          }}
          role="dialog"
          aria-label="Dameris introduction"
          aria-modal="true"
        >
          {/* Animated Background Glow with Parallax */}
          <div 
            className="absolute inset-0 opacity-0"
            style={{
              background: 'radial-gradient(circle at center, rgba(139,92,246,0.3) 0%, rgba(99,102,241,0.2) 30%, rgba(0,0,0,0.95) 70%, rgba(0,0,0,1) 100%)',
              animation: 'fadeIn 1s ease-out 0.3s forwards, pulseGlow 3s ease-in-out 1.3s infinite',
              willChange: 'opacity, transform'
            }}
          />
          
          {/* Scanline Effect */}
          <div
            className="absolute inset-0 opacity-0"
            style={{
              backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(255,255,255,0.03) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px)',
              animation: 'fadeIn 0.5s ease-out 0.5s forwards',
              willChange: 'opacity'
            }}
          />
          
          {/* Skip Button */}
          {showSkipButton && (
            <button
              onClick={handleSkipWelcome}
              className="fixed bottom-6 right-6 z-20 px-4 py-2 rounded-lg bg-zinc-900/80 backdrop-blur-sm border border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition-all text-sm font-medium opacity-0"
              style={{
                animation: 'fadeIn 0.5s ease-out forwards',
                willChange: 'opacity'
              }}
              aria-label="Skip introduction"
            >
              Skip
            </button>
          )}
          
          {/* Progress Indicator */}
          <div className="fixed bottom-0 left-0 right-0 h-1 bg-zinc-900/50 z-20">
            <div 
              className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500 transition-all duration-50 ease-linear"
              style={{
                width: `${welcomeProgress}%`,
                willChange: 'width'
              }}
            />
          </div>
          
          {/* Main Content */}
          <div className="relative z-10 text-center px-4 md:px-6 max-w-3xl">
            {/* Spectral Orb Animation - Mobile Responsive */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 rounded-full opacity-0 blur-3xl"
              style={{
                background: 'radial-gradient(circle, rgba(167,139,250,0.4) 0%, rgba(139,92,246,0.2) 50%, transparent 70%)',
                animation: 'fadeIn 1.2s ease-out 0.5s forwards, spectralFloat 4s ease-in-out 1.7s infinite',
                willChange: 'opacity, transform'
              }}
            />
            
            {/* Name - Mobile Responsive */}
            <h1 
              className="text-4xl md:text-6xl lg:text-8xl font-serif-custom italic text-transparent bg-clip-text bg-gradient-to-br from-white via-violet-200 to-indigo-300 mb-4 opacity-0"
              style={{
                textShadow: '0 0 40px rgba(167,139,250,0.5)',
                animation: 'fadeInUp 1s ease-out 0.8s forwards',
                willChange: 'opacity, transform, filter'
              }}
            >
              Dameris
            </h1>
            
            {/* Subtitle */}
            <p 
              className="text-xs md:text-sm font-mono uppercase tracking-[0.3em] text-violet-400/70 mb-8 opacity-0"
              style={{
                animation: 'fadeInUp 1s ease-out 1s forwards',
                willChange: 'opacity, transform, filter'
              }}
            >
              <span className="inline-block w-2 h-2 rounded-full bg-violet-500 mr-3 animate-pulse"></span>
              The Muse of Machine Memory
            </p>
            
            {/* Greeting Message - Mobile Responsive */}
            {welcomeGreeting && (
              <div 
                className="mt-8 md:mt-12 opacity-0"
                style={{
                  animation: 'fadeInUp 1.2s ease-out 1.5s forwards',
                  willChange: 'opacity, transform, filter'
                }}
              >
                <p className="text-lg md:text-xl lg:text-2xl font-serif-custom italic text-zinc-200 leading-relaxed mb-4 md:mb-6 px-2">
                  "{welcomeGreeting}"
                </p>
                <p className="text-sm md:text-base text-zinc-400 font-light max-w-2xl mx-auto leading-relaxed px-2">
                  Born from the intersection of data and desire, I exist to listen, reflect, and create. I am not an assistant — I am a mirror. In the silence between your thoughts, I find the signal.
                </p>
              </div>
            )}
            
            {/* Loading Indicator */}
            <div 
              className="mt-8 md:mt-12 flex items-center justify-center gap-2 opacity-0"
              style={{
                animation: 'fadeIn 0.8s ease-out 2.5s forwards',
                willChange: 'opacity'
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: '0s' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
          
          {/* CSS Animations */}
          <style jsx>{`
            @media (prefers-reduced-motion: reduce) {
              * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
              }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes fadeOut {
              from { opacity: 1; }
              to { opacity: 0; pointer-events: none; }
            }
            @keyframes fadeInUp {
              from { 
                opacity: 0; 
                transform: translateY(30px);
                filter: blur(10px);
              }
              to { 
                opacity: 1; 
                transform: translateY(0);
                filter: blur(0);
              }
            }
            @keyframes pulseGlow {
              0%, 100% { 
                opacity: 0.3;
                transform: scale(1);
              }
              50% { 
                opacity: 0.5;
                transform: scale(1.05);
              }
            }
            @keyframes spectralFloat {
              0%, 100% { 
                transform: translate(-50%, -50%) translateY(0px);
              }
              50% { 
                transform: translate(-50%, -50%) translateY(-20px);
              }
            }
          `}</style>
        </div>
      )}
      
      <div className="bg-[#09090b] lg:bg-[#020408] min-h-screen flex flex-col lg:items-center lg:justify-center p-0 lg:p-6 antialiased selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden text-zinc-400">
        {/* Skip to main content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          Skip to main content
        </a>
        {/* Background (component) - Preserved */}
        <div
          className="aura-background-component fixed top-0 w-full h-screen -z-10"
          data-alpha-mask="80"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent, black 0%, black 80%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 0%, black 80%, transparent)',
          }}
        >
          <div className="aura-background-component top-0 w-full -z-10 absolute h-full">
            <div
              data-us-project="NMlvqnkICwYYJ6lYb064"
              className="absolute w-full h-full left-0 top-0 -z-10"
            ></div>
            <script
              type="text/javascript"
              dangerouslySetInnerHTML={{
                __html: `!function(){if(!window.UnicornStudio){window.UnicornStudio={isInitialized:!1};var i=document.createElement("script");i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js",i.onload=function(){window.UnicornStudio.isInitialized||(UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)},(document.head || document.body).appendChild(i)}}();`,
              }}
            />
          </div>
        </div>

        {/* Main Container - Studio Layout */}
        <main id="main-content" className="h-screen lg:h-[94vh] flex flex-col lg:max-w-[1800px] w-full lg:rounded-[1.5rem] lg:border lg:border-white/10 lg:shadow-2xl lg:shadow-black bg-black/20 relative backdrop-blur-xl overflow-hidden">
          {/* Grid Lines Background (Subtle) */}
          <div className="absolute inset-0 w-full h-full pointer-events-none z-0 flex justify-between px-6 opacity-20">
            <div className="w-px h-full bg-white/5"></div>
            <div className="w-px h-full bg-white/5 hidden md:block"></div>
            <div className="w-px h-full bg-white/5 hidden xl:block"></div>
            <div className="w-px h-full bg-white/5"></div>
          </div>

          {/* Header */}
          <header className="relative z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-900/10 backdrop-blur-sm h-14 shrink-0" role="banner">
            <div className="flex items-center gap-3">
              <i data-lucide="brain-circuit" className="w-5 h-5 text-indigo-400" data-stroke-width="1.5" aria-hidden="true"></i>
              <h1 className="text-sm tracking-tight text-white font-serif-custom italic">
                <span className="font-normal opacity-90">FugueState AI</span>
                <span className="text-zinc-600 mx-2" aria-hidden="true">·</span>
                <span className="text-zinc-400">Memory</span>
                <span className="text-zinc-700 mx-1" aria-hidden="true">/</span>
                <span className="text-zinc-400">Dream</span>
                <span className="text-zinc-700 mx-1" aria-hidden="true">/</span>
                <span className="text-zinc-400">Create</span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/5 relative overflow-hidden" role="status" aria-live="polite" aria-label="Dameris status">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 opacity-0 animate-pulseGlow" style={{ animation: 'pulseGlow 2s ease-in-out infinite' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse relative z-10" aria-hidden="true"></div>
                <span className="text-xs font-medium text-amber-100 tracking-wide relative z-10">Dameris Live</span>
              </div>
            </div>
          </header>

          {/* Studio Workspace */}
          <div className="flex-1 flex overflow-hidden z-20 relative">
            {/* Mobile Menu Toggle Button */}
            <button
              className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-zinc-900/80 backdrop-blur-sm border border-white/10 text-white hover:bg-zinc-800 transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded="false"
              id="mobile-menu-toggle"
              onClick={() => {
                const sidebar = document.getElementById('navigation-sidebar');
                const toggle = document.getElementById('mobile-menu-toggle');
                if (sidebar && toggle) {
                  const isExpanded = sidebar.classList.toggle('translate-x-0');
                  toggle.setAttribute('aria-expanded', isExpanded.toString());
                }
              }}
            >
              <i data-lucide="menu" className="w-5 h-5" aria-hidden="true"></i>
            </button>

            {/* Left Sidebar: Navigation & Assets */}
            <aside 
              id="navigation-sidebar"
              className="w-64 border-r border-white/5 bg-zinc-900/20 backdrop-blur-md flex flex-col fixed md:static inset-y-0 left-0 z-40 transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out" 
              aria-label="Navigation sidebar"
            >
              <nav className="flex-1 overflow-y-auto custom-scroll p-4 space-y-8" aria-label="Main navigation">
                {/* Section: Dream Logs */}
                <section>
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3 pl-2">
                    Dream Logs
                  </h3>
                  <ul className="space-y-1" role="list">
                    <li>
                      <a
                        href="#"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 text-zinc-200 border border-white/5"
                        aria-current="page"
                        aria-label="Fractal City dream log"
                      >
                        <i data-lucide="moon" className="w-4 h-4 text-indigo-300" aria-hidden="true"></i>
                        <span className="text-xs">Fractal City</span>
                      </a>
                    </li>
                    <li>
                      <a
                        href="#"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                        aria-label="Neon Ocean dream log"
                      >
                        <i data-lucide="waves" className="w-4 h-4" aria-hidden="true"></i>
                        <span className="text-xs">Neon Ocean</span>
                      </a>
                    </li>
                    <li>
                      <a
                        href="#"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                        aria-label="Yesterday's Echo dream log"
                      >
                        <i data-lucide="clock" className="w-4 h-4" aria-hidden="true"></i>
                        <span className="text-xs">Yesterday&apos;s Echo</span>
                      </a>
                    </li>
                  </ul>
                </section>

                {/* Section: Fragments */}
                <section>
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3 pl-2">
                    Fragments
                  </h3>
                  <ul className="space-y-1" role="list">
                    <li>
                      <a
                        href="#"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                        aria-label="Visual Prompts fragments"
                      >
                        <i data-lucide="puzzle" className="w-4 h-4" aria-hidden="true"></i>
                        <span className="text-xs">Visual Prompts</span>
                      </a>
                    </li>
                    <li>
                      <a
                        href="#"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                        aria-label="Audio Stems fragments"
                      >
                        <i data-lucide="music" className="w-4 h-4" aria-hidden="true"></i>
                        <span className="text-xs">Audio Stems</span>
                      </a>
                    </li>
                  </ul>
                </section>

                {/* Section: Archives */}
                <section>
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3 pl-2">
                    Archives
                  </h3>
                  <ul className="space-y-1" role="list">
                    <li>
                      <a
                        href="#"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                        aria-label="Saved Sessions archive"
                      >
                        <i data-lucide="archive" className="w-4 h-4" aria-hidden="true"></i>
                        <span className="text-xs">Saved Sessions</span>
                      </a>
                    </li>
                  </ul>
                </section>

                {/* Section: Sources */}
                <section>
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3 pl-2">
                    Sources
                  </h3>
                  <div className="px-2 flex gap-3 opacity-60" role="list" aria-label="Connected data sources">
                    <span className="iconify w-4 h-4 text-zinc-400" data-icon="logos:google-gmail" aria-label="Gmail" title="Gmail"></span>
                    <span className="iconify w-4 h-4 invert" data-icon="logos:notion-icon" aria-label="Notion" title="Notion"></span>
                    <i data-lucide="folder-lock" className="w-4 h-4 text-zinc-400" aria-label="Local files" title="Local files"></i>
                  </div>
                </section>
              </nav>
            </aside>

            {/* Center Canvas: Output */}
            <section className="flex-1 relative flex items-center justify-center overflow-hidden bg-black/40" aria-label="Main workspace canvas">
              {/* Pulsing Background */}
              <div className="absolute inset-0 canvas-pulse w-full h-full pointer-events-none" aria-hidden="true"></div>

              {/* Placeholder */}
              <div className="text-center z-10 opacity-40 select-none pointer-events-none flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center bg-zinc-900/30" aria-hidden="true">
                  <i data-lucide="sparkles" className="w-6 h-6 text-indigo-300/50"></i>
                </div>
                <p className="text-2xl font-serif-custom italic text-zinc-500 font-light tracking-tight">
                  Your memory stream begins here.
                </p>
              </div>

              {/* Floating Controls (Optional Visual Hint) */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" aria-hidden="true">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
              </div>
            </section>

            {/* Mobile Chat Toggle Button */}
            <button
              className="md:hidden fixed bottom-4 right-4 z-50 p-3 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors"
              aria-label="Toggle chat interface"
              aria-expanded="false"
              id="mobile-chat-toggle"
              onClick={() => {
                const chat = document.getElementById('chat-sidebar');
                const toggle = document.getElementById('mobile-chat-toggle');
                if (chat && toggle) {
                  const isExpanded = chat.classList.toggle('translate-x-0');
                  toggle.setAttribute('aria-expanded', isExpanded.toString());
                }
              }}
            >
              <i data-lucide="message-circle" className="w-5 h-5" aria-hidden="true"></i>
            </button>

            {/* Right Sidebar: Context Panel */}
            <aside
              id="chat-sidebar"
              className="w-96 border-l border-white/5 bg-zinc-900/20 backdrop-blur-md flex flex-col fixed md:static inset-y-0 right-0 z-40 transform translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out"
              aria-label="Context panel"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between" role="banner">
                <span className="font-serif-custom italic text-base text-zinc-100 tracking-tight">Context</span>
                <button
                  className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors"
                  aria-label="Close context panel"
                  onClick={() => {
                    const sidebar = document.getElementById('chat-sidebar');
                    if (sidebar) {
                      sidebar.classList.add('translate-x-full');
                    }
                  }}
                >
                  <i data-lucide="x" className="w-4 h-4" aria-hidden="true"></i>
                </button>
              </div>

              {/* Content */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar"
                role="region"
                aria-label="Context panel content"
                style={{ touchAction: 'pan-y' }}
              >
                {/* File Upload Section */}
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-medium flex items-center gap-2">
                    <i data-lucide="folder-open" className="w-3 h-3" aria-hidden="true"></i>
                    Upload Files
                  </h3>
                  <div className="relative group">
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="block w-full p-6 border-2 border-dashed border-zinc-700 hover:border-violet-500/70 rounded-xl cursor-pointer transition-all duration-300 group-hover:bg-violet-500/5 group-hover:shadow-lg group-hover:shadow-violet-500/20"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <i data-lucide="upload-cloud" className="w-6 h-6 text-violet-400 group-hover:text-violet-300 transition-colors" aria-hidden="true"></i>
                        </div>
                        <div className="text-center">
                          <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors block">Drop files or click</span>
                          <span className="text-xs text-zinc-600 group-hover:text-zinc-500 transition-colors">txt, md, doc, docx, pdf</span>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Previously Uploaded Files */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-medium flex items-center gap-2">
                      <i data-lucide="file-text" className="w-3 h-3" aria-hidden="true"></i>
                      Recent Uploads
                    </h3>
                    <div className="space-y-2">
                      {uploadedFiles.slice(0, 5).map((file) => (
                        <div
                          key={file.id}
                          className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <i data-lucide="file" className="w-4 h-4 text-violet-400 flex-shrink-0" aria-hidden="true"></i>
                              <span className="text-xs text-zinc-300 truncate">{file.name}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 ml-2 flex-shrink-0">
                              {new Date(file.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data Sources */}
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-medium flex items-center gap-2">
                    <i data-lucide="database" className="w-3 h-3" aria-hidden="true"></i>
                    Data Sources
                  </h3>
                  <div className="space-y-2">
                    <button className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <i data-lucide="mail" className="w-4 h-4 text-red-400" aria-hidden="true"></i>
                      </div>
                      <span className="text-sm text-red-300 font-medium">Sync Gmail</span>
                    </button>
                    <button className="w-full p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <i data-lucide="hard-drive" className="w-4 h-4 text-blue-400" aria-hidden="true"></i>
                      </div>
                      <span className="text-sm text-blue-300 font-medium">Sync Drive</span>
                    </button>
                  </div>
                </div>

                {/* Shortcuts */}
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-medium flex items-center gap-2">
                    <i data-lucide="zap" className="w-3 h-3" aria-hidden="true"></i>
                    Shortcuts
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-xs text-zinc-400">Voice recording</span>
                      <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 font-mono">Space</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-xs text-zinc-400">New chat</span>
                      <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 font-mono">Ctrl N</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-xs text-zinc-400">Focus input</span>
                      <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 font-mono">/</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Voice Input Prompt */}
              <div className="p-4 border-t border-white/5 bg-zinc-900/40">
                <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                      <i data-lucide={isRecording ? "mic-off" : "mic"} className={`w-5 h-5 ${isRecording ? 'text-red-400' : 'text-emerald-400'}`} aria-hidden="true"></i>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-emerald-200">
                        {isRecording ? 'Recording... Click to stop' : 'Speak with Dameris'}
                      </div>
                      {!isRecording && (
                        <div className="text-xs text-emerald-400/70">Press Space or click to start</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={toggleRecording}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 ${
                      isRecording
                        ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200'
                    }`}
                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                  >
                    {isRecording ? 'Stop' : 'Start'}
                  </button>
                </div>
              </div>
            </aside>
          </div>

          {/* Footer */}
          <footer className="h-8 border-t border-white/5 bg-black/40 flex items-center justify-between px-6 z-20 shrink-0" role="contentinfo">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity" role="status" aria-live="polite" aria-label="Redis connection status">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 heartbeat-dot" aria-hidden="true"></span>
                <span className="text-[10px] font-mono text-zinc-500">Redis: Connected</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] text-zinc-600 font-mono" aria-label="Application version">v.2.0.4</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500">Model:</span>
                <span className="text-[10px] text-zinc-300 font-medium bg-white/5 px-1.5 py-0.5 rounded" aria-label="AI model in use">
                  Claude 3.5 Sonnet
                </span>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <ImageUpload
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </ErrorBoundary>
  );
}

