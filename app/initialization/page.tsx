'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import '../../styles/initialization.css';
import AuthGuard from '../components/AuthGuard';
import NotesUpload from '../components/NotesUpload';

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

export default function InitializationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSources, setSelectedSources] = useState<Record<string, boolean>>({
    gmail: false,
    drive: false,
    notion: false,
    local: false,
  });
  const [selectedMuse, setSelectedMuse] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [connectedSources, setConnectedSources] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'syncing' | 'scanning' | 'creating_poem' | 'creating_collection' | 'creating_image' | 'complete' | 'error'>('idle');
  const initializeRef = useRef<HTMLDivElement | null>(null);
  const [highlightInitialize, setHighlightInitialize] = useState(false);
  const [lastUploadedMemoryId, setLastUploadedMemoryId] = useState<string | null>(null);

  useEffect(() => {
    // Re-create lucide icons after component mounts
    const timer = setTimeout(() => {
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }, 100);

    // Load already connected sources and saved muse type
    const loadUserData = async () => {
      try {
        // Try initialization status first (includes connected sources and muse type)
        const statusResponse = await fetch('/api/initialization/status');
        const statusData = await statusResponse.json();
        
        // Load saved muse type if it exists
        if (statusData.museType) {
          setSelectedMuse(statusData.museType);
        }
        
        if (statusData.connectedSources) {
          const connected = new Set<string>(statusData.connectedSources);
          setConnectedSources(connected);
          
          // Only pre-select sources that are actually connected
          // Reset all to false first, then set connected ones to true
          setSelectedSources({
            gmail: connected.has('gmail'),
            drive: connected.has('drive'),
            notion: connected.has('notion'),
            local: connected.has('local'),
          });
        } else {
          // Fallback to privacy endpoint
          const response = await fetch('/api/privacy/data-sources');
          const data = await response.json();
          
          if (data.dataSources) {
            const connected = new Set<string>(
              data.dataSources
                .filter((ds: any) => ds.is_active)
                .map((ds: any) => ds.source_type)
            );
            setConnectedSources(connected);
            
            // Only pre-select sources that are actually connected
            setSelectedSources({
              gmail: connected.has('gmail'),
              drive: connected.has('drive'),
              notion: connected.has('notion'),
              local: connected.has('local'),
            });
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();

    // Check if returning from OAuth connection
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connected')) {
      // Move to step 2 (muse selection) after OAuth
      setCurrentStep(2);
      // Clean up URL
      window.history.replaceState({}, '', '/initialization');
      // Reload user data
      loadUserData();
    }

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleSourceToggle = (source: string) => {
    setSelectedSources(prev => ({
      ...prev,
      [source]: !prev[source]
    }));
  };

  const handleInitializeConnection = async () => {
    setIsConnecting(true);
    setError(null);
    
    // Trigger OAuth flows for selected sources (excluding already connected ones)
    const sourcesToConnect = Object.entries(selectedSources)
      .filter(([source, selected]) => selected && !connectedSources.has(source))
      .map(([source, _]) => source);

    // If no new sources to connect, just proceed
    if (sourcesToConnect.length === 0) {
      setCurrentStep(2);
      setIsConnecting(false);
      return;
    }

    try {
      // Check if we need OAuth (exclude local)
      const needsOAuth = sourcesToConnect.some(source => source !== 'local');
      
      if (needsOAuth) {
        // Find first source that needs OAuth
        const oauthSource = sourcesToConnect.find(source => source !== 'local');
        
        if (oauthSource === 'gmail' || oauthSource === 'drive') {
          // Google OAuth (handles both Gmail and Drive)
          const response = await fetch(`/api/oauth/connect?provider=google`);
          const data = await response.json();
          
          if (data.authUrl) {
            // Redirect to OAuth
            window.location.href = data.authUrl;
            return; // Will redirect, so exit
          } else {
            throw new Error(data.error || 'Failed to get OAuth URL');
          }
        } else if (oauthSource === 'notion') {
          const response = await fetch(`/api/oauth/connect?provider=notion`);
          const data = await response.json();
          
          if (data.authUrl) {
            window.location.href = data.authUrl;
            return;
          } else {
            throw new Error(data.error || 'Failed to get OAuth URL');
          }
        }
      }

      // If no OAuth needed (only local selected), proceed to next step
      setCurrentStep(2);
    } catch (error: any) {
      console.error('Error connecting sources:', error);
      setError(error.message || 'Failed to connect sources. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLoadDemoData = async () => {
    setIsLoadingDemo(true);
    setError(null);

    try {
      const response = await fetch('/api/demo/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: 'v1' }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load demo dataset');
      }

      // Track for UI (e.g. /voice banner)
      try {
        localStorage.setItem('fugue_demo_loaded', data.version || 'v1');
      } catch {
        // ignore (private mode / storage disabled)
      }

      setCurrentStep(2);
    } catch (error: any) {
      console.error('Error loading demo data:', error);
      setError(error.message || 'Failed to load demo dataset. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleAwakenMuse = async () => {
    if (!selectedMuse) {
      setError('Please select a muse to continue');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsCompleting(true);
    setError(null);

    try {
      const response = await fetch('/api/initialization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          museType: selectedMuse,
          dataSources: Object.keys(selectedSources).filter(key => selectedSources[key])
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete initialization');
      }

      // Move to step 3
      setCurrentStep(3);
      setPipelineStatus('syncing');

      // Simulate sync progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 95) progress = 95;
        setSyncProgress(Math.min(progress, 95));
      }, 200);

      // Trigger initial sync if sources are connected
      const sourcesToSync = Object.keys(selectedSources).filter(key => selectedSources[key]);
      if (sourcesToSync.length > 0) {
        try {
          // Sync each connected source (non-blocking)
          const syncPromises = sourcesToSync
            .filter(source => source !== 'local') // Local doesn't need API sync
            .map(source =>
              fetch('/api/data-sources/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceType: source })
              }).catch(err => {
                console.error(`Sync error for ${source} (non-blocking):`, err);
                return null;
              })
            );

          // Don't await - let it run in background
          Promise.all(syncPromises);
        } catch (syncError) {
          console.error('Sync error (non-blocking):', syncError);
        }
      }

      // Complete progress and redirect (Muse-first: Brief -> Create -> Voice)
      setTimeout(async () => {
        clearInterval(progressInterval);
        setSyncProgress(100);

        try {
          // 1) First scan (muse-toned). Prefer the uploaded memory; fallback to recent.
          setPipelineStatus('scanning');
          const scanRes = await fetch('/api/muse/first-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              museType: selectedMuse,
              memoryId: lastUploadedMemoryId || undefined,
              limit: 8
            })
          });
          const scanData = await scanRes.json().catch(() => null);

          if (!scanRes.ok || !scanData?.result?.briefing) {
            throw new Error(scanData?.error || 'First scan failed');
          }

          try {
            localStorage.setItem('fugue_pending_first_scan', JSON.stringify(scanData.result));
          } catch {
            // ignore localStorage errors
          }

          // Anchor memory for artefacts: use uploaded memory if present, else first scanned id.
          const anchorMemoryId =
            lastUploadedMemoryId ||
            (Array.isArray(scanData?.memoryIds) ? scanData.memoryIds[0] : null);

          if (anchorMemoryId) {
            // 2) Auto-create starter set (poem + image + curated collection)
            setPipelineStatus('creating_poem');
            const createRes = await fetch('/api/muse/auto-create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                museType: selectedMuse,
                memoryId: anchorMemoryId,
                firstScan: scanData.result
              })
            });
            const createData = await createRes.json().catch(() => null);

            if (!createRes.ok || !createData?.success) {
              throw new Error(createData?.error || 'Auto-create failed');
            }

            try {
              localStorage.setItem('fugue_pending_artefacts', JSON.stringify({
                museType: selectedMuse,
                memoryId: anchorMemoryId,
                poem: { id: createData?.poemArtefact?.id, text: createData?.poemText || '' },
                image: { id: createData?.imageArtefact?.id, url: createData?.imageArtefact?.file_url || createData?.image || '' },
                collection: { id: createData?.collectionArtefact?.id, data: createData?.collection || null }
              }));
            } catch {
              // ignore localStorage errors
            }
          }

          setPipelineStatus('complete');
          // Set flag to trigger Dameris introduction
          try {
            localStorage.setItem('fuguestate_should_introduce_dameris', 'true');
            localStorage.setItem('fuguestate_init_completed', new Date().toISOString());
          } catch {
            // ignore localStorage errors
          }
          router.push('/voice');
        } catch (e: any) {
          console.error('Muse pipeline error:', e);
          setPipelineStatus('error');

          // Store error for /voice page to display
          try {
            localStorage.setItem('fugue_pipeline_error', JSON.stringify({
              error: e?.message || 'Auto-create failed',
              timestamp: Date.now(),
              selectedMuse
            }));
          } catch {
            // ignore localStorage errors
          }

          // Still route to /voice so user can interact with Dameris
          setTimeout(() => router.push('/voice'), 1500);
        }
      }, 2500);
    } catch (error: any) {
      console.error('Error completing initialization:', error);
      setError(error.message || 'Failed to complete initialization');
      setTimeout(() => setError(null), 5000);
      setIsCompleting(false);
    }
  };

  return (
    <AuthGuard requireInitialization={false}>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap"
        rel="stylesheet"
      />
      <div className="bg-[#09090b] lg:bg-[#020408] min-h-screen flex flex-col lg:items-center lg:justify-center p-0 lg:p-8 antialiased selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden text-zinc-400">
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
                __html: `!function(){if(!window.UnicornStudio){window.UnicornStudio={isInitialized:!1};var i=document.createElement("script");i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js",i.onload=function(){window.UnicornStudio.isInitialized||(UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)},(document.head || document.body).appendChild(i)}}();`
              }}
            />
          </div>
        </div>

        {/* Main Container */}
        <main className="min-h-screen lg:h-[90vh] flex flex-col lg:max-w-[1400px] lg:rounded-[2.5rem] lg:border lg:border-white/10 lg:shadow-2xl lg:shadow-black bg-black/20 w-full relative backdrop-blur-xl overflow-hidden">
          {/* Grid Lines Background */}
          <div className="absolute inset-0 w-full h-full pointer-events-none z-0 flex justify-between px-6 md:px-12 opacity-30 md:opacity-50">
            <div className="w-px h-full bg-white/5"></div>
            <div className="w-px h-full bg-white/5 hidden sm:block"></div>
            <div className="w-px h-full bg-white/5 hidden md:block"></div>
            <div className="w-px h-full bg-white/5 hidden lg:block"></div>
            <div className="w-px h-full bg-white/5 hidden xl:block"></div>
            <div className="w-px h-full bg-white/5"></div>
          </div>

          {/* Navigation */}
          <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 md:py-8">
            <div className="flex items-center gap-3 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-pointer">
              <i data-lucide="brain-circuit" className="w-5 h-5 text-indigo-400" data-stroke-width="1.5"></i>
              <span className="text-sm font-medium tracking-tight text-white font-serif-custom italic">
                FugueState.ai
              </span>
            </div>
            <div className="flex gap-2">
              <span id="step-dots" className="flex gap-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-all ${currentStep === 1 ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-zinc-800'}`}
                  id="dot-1"
                ></div>
                <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentStep === 2 ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-zinc-800'}`} id="dot-2"></div>
                <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentStep === 3 ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-zinc-800'}`} id="dot-3"></div>
              </span>
            </div>
          </nav>

          {/* Wizard Container */}
          <div className="flex-1 z-20 flex flex-col items-center justify-center w-full px-6 relative">
            <div className="w-full max-w-xl relative min-h-[480px]">
              {/* Step 1: Connect Sources */}
              <div id="step-1" className={`step-content ${currentStep === 1 ? 'active' : ''} flex flex-col items-center text-center`}>
                <h2 className="text-3xl md:text-4xl text-white font-serif-custom italic font-light tracking-tight mb-3">
                  Connect your{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">
                    memories.
                  </span>
                </h2>
                <p className="text-sm text-zinc-500 mb-10 font-light max-w-sm">
                  Dameris can listen to your digital memories. Choose what she may hear.
                </p>

                {error && (
                  <div className="w-full mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Quick Start: Demo Data */}
                <div className="w-full mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-white/5"></div>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600">Quick Start</span>
                    <div className="h-px flex-1 bg-white/5"></div>
                  </div>
                  <button
                    onClick={handleLoadDemoData}
                    disabled={isConnecting || isLoadingDemo}
                    className="w-full rounded-xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/50 to-zinc-900/50 hover:from-indigo-950/70 hover:to-zinc-900/70 hover:border-indigo-500/50 transition-all px-5 py-4 text-left disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-indigo-500/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base text-zinc-100 font-medium mb-1 flex items-center gap-2">
                          <i data-lucide="zap" className="w-4 h-4 text-indigo-400"></i>
                          Try Demo Memories
                        </p>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Start immediately with sample data. Skip integrations and experience all modes in seconds.
                        </p>
                      </div>
                      <div className="text-sm text-indigo-300 whitespace-nowrap font-medium group-hover:translate-x-1 transition-transform">
                        {isLoadingDemo ? 'Loading…' : 'Start →'}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Or Connect Your Data */}
                <div className="w-full mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-white/5"></div>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600">Or Connect Your Data</span>
                    <div className="h-px flex-1 bg-white/5"></div>
                  </div>
                </div>

                <div className="w-full space-y-3 mb-10">
                  {/* Integration Item: Google */}
                  <div className="group flex items-center justify-between p-4 rounded-xl border border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-white/10 transition-all duration-300 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5 text-zinc-400 group-hover:text-white transition-colors">
                        <span className="iconify w-5 h-5" data-icon="logos:google-gmail"></span>
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-medium text-zinc-200">
                          Gmail
                          {connectedSources.has('gmail') && (
                            <span className="ml-2 text-xs text-emerald-400">✓ Connected</span>
                          )}
                        </h3>
                        <p className="text-xs text-zinc-600">Correspondence & Drafts</p>
                      </div>
                    </div>
                    {/* Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedSources.gmail}
                        onChange={() => handleSourceToggle('gmail')}
                        disabled={connectedSources.has('gmail')}
                        className="sr-only peer" 
                      />
                      <div className={`w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] ${connectedSources.has('gmail') ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                    </label>
                  </div>

                  {/* Integration Item: Drive */}
                  <div className="group flex items-center justify-between p-4 rounded-xl border border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-white/10 transition-all duration-300 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5 text-zinc-400 group-hover:text-white transition-colors">
                        <span className="iconify w-5 h-5" data-icon="logos:google-drive"></span>
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-medium text-zinc-200">
                          Google Drive
                          {connectedSources.has('drive') && (
                            <span className="ml-2 text-xs text-emerald-400">✓ Connected</span>
                          )}
                        </h3>
                        <p className="text-xs text-zinc-600">Documents & Archives</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedSources.drive}
                        onChange={() => handleSourceToggle('drive')}
                        disabled={connectedSources.has('drive')}
                        className="sr-only peer" 
                      />
                      <div className={`w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] ${connectedSources.has('drive') ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                    </label>
                  </div>

                  {/* Integration Item: Local */}
                  <div className="group flex items-center justify-between p-4 rounded-xl border border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-white/10 transition-all duration-300 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5 text-zinc-400 group-hover:text-white transition-colors">
                        <i data-lucide="folder-lock" className="w-5 h-5 text-amber-200/70" data-stroke-width="1.5"></i>
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-medium text-zinc-200">File Vault</h3>
                        <p className="text-xs text-zinc-600">Upload files (up to 1GB) for Dameris to reference</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedSources.local}
                        onChange={() => handleSourceToggle('local')}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]"></div>
                    </label>
                  </div>

                  {/* File Vault upload (shown when enabled) */}
                  {selectedSources.local && (
                    <div className="w-full mt-4 mb-4 px-2">
                      <div className="mb-3 text-left">
                        <h4 className="text-sm font-medium text-zinc-200">Upload a document</h4>
                        <p className="text-xs text-zinc-400">
                          Add a note now so Dameris has something to work with immediately.
                        </p>
                      </div>
                      <NotesUpload
                        onUploaded={(payload) => {
                          // Do not auto-advance; we guide user to “Initialize Connection”.
                          if (payload?.memoryId) setLastUploadedMemoryId(payload.memoryId);
                        }}
                        onUploadCompleteUI={() => {
                          // Smooth scroll + highlight Initialize Connection
                          initializeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setHighlightInitialize(true);
                          window.setTimeout(() => setHighlightInitialize(false), 2500);
                        }}
                      />
                    </div>
                  )}

                  {/* Integration Item: Notion (Extra) */}
                  <div className="group flex items-center justify-between p-4 rounded-xl border border-white/5 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-white/10 transition-all duration-300 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800/40 flex items-center justify-center border border-white/5 text-zinc-400 group-hover:text-white transition-colors">
                        <span className="iconify w-5 h-5 invert opacity-70" data-icon="logos:notion-icon"></span>
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-medium text-zinc-200">
                          Notion <span className="ml-2 text-[10px] uppercase tracking-widest text-zinc-500">Extra</span>
                          {connectedSources.has('notion') && (
                            <span className="ml-2 text-xs text-emerald-400">✓ Connected</span>
                          )}
                        </h3>
                        <p className="text-xs text-zinc-600">Notes & Wikis (optional)</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedSources.notion}
                        onChange={() => handleSourceToggle('notion')}
                        disabled={connectedSources.has('notion')}
                        className="sr-only peer" 
                      />
                      <div className={`w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] ${connectedSources.has('notion') ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                    </label>
                  </div>
                </div>

                <div
                  ref={initializeRef}
                  className={`flex flex-col sm:flex-row gap-3 items-center justify-center transition-all ${
                    highlightInitialize ? 'ring-2 ring-indigo-500/60 ring-offset-4 ring-offset-black/0 rounded-full animate-pulse' : ''
                  }`}
                >
                  <button
                    onClick={handleInitializeConnection}
                    disabled={isConnecting}
                    className="group w-full sm:w-auto relative inline-flex items-center justify-center px-8 py-3 overflow-hidden font-medium text-indigo-100 transition duration-300 ease-out border border-indigo-500/30 rounded-full shadow-md group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-indigo-600 group-hover:translate-x-0 ease">
                      <i data-lucide="arrow-right" className="w-5 h-5"></i>
                    </span>
                    <span className="absolute flex items-center justify-center w-full h-full text-indigo-100 transition-all duration-300 transform group-hover:translate-x-full ease">
                      {isConnecting ? 'Connecting...' : 'Initialize Connection'}
                    </span>
                    <span className="relative invisible">Initialize Connection</span>
                  </button>
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={isConnecting}
                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                  >
                    Skip for now
                  </button>
                </div>
              </div>

              {/* Step 2: Choose Muse */}
              <div id="step-2" className={`step-content ${currentStep === 2 ? 'active' : ''} flex flex-col items-center text-center`}>
                <h2 className="text-3xl md:text-4xl text-white font-serif-custom italic font-light tracking-tight mb-3">
                  Choose your{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-amber-200">
                    Muse.
                  </span>
                </h2>
                <p className="text-sm text-zinc-500 mb-10 font-light">Who shall interpret your digital dreams?</p>

                {error && (
                  <div className="w-full mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-12">
                  {/* Card 1 */}
                  <div 
                    onClick={() => setSelectedMuse('analyst')}
                    className={`group cursor-pointer relative p-4 rounded-xl border ${selectedMuse === 'analyst' ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/10 bg-zinc-900/40'} hover:bg-zinc-900/80 hover:border-indigo-500/50 transition-all duration-300 flex flex-col items-center gap-3`}
                  >
                    <div className="absolute inset-0 bg-indigo-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <i data-lucide="bar-chart-2" className="w-5 h-5 text-indigo-300" data-stroke-width="1.5"></i>
                    </div>
                    <div className="text-center relative z-10">
                      <h3 className="text-sm font-semibold text-zinc-200 mb-1">Analyst</h3>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500">Logic & Pattern</p>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div 
                    onClick={() => setSelectedMuse('poet')}
                    className={`group cursor-pointer relative p-4 rounded-xl border ${selectedMuse === 'poet' ? 'border-violet-500/50 bg-violet-500/10' : 'border-white/10 bg-zinc-900/40'} hover:bg-zinc-900/80 hover:border-violet-500/50 transition-all duration-300 flex flex-col items-center gap-3`}
                  >
                    <div className="absolute inset-0 bg-violet-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <i data-lucide="feather" className="w-5 h-5 text-violet-300" data-stroke-width="1.5"></i>
                    </div>
                    <div className="text-center relative z-10">
                      <h3 className="text-sm font-semibold text-zinc-200 mb-1">Poet</h3>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500">Verse & Metaphor</p>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div 
                    onClick={() => setSelectedMuse('visualist')}
                    className={`group cursor-pointer relative p-4 rounded-xl border ${selectedMuse === 'visualist' ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/10 bg-zinc-900/40'} hover:bg-zinc-900/80 hover:border-amber-500/50 transition-all duration-300 flex flex-col items-center gap-3`}
                  >
                    <div className="absolute inset-0 bg-amber-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <i data-lucide="eye" className="w-5 h-5 text-amber-300" data-stroke-width="1.5"></i>
                    </div>
                    <div className="text-center relative z-10">
                      <h3 className="text-sm font-semibold text-zinc-200 mb-1">Visualist</h3>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500">Image & Color</p>
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div 
                    onClick={() => setSelectedMuse('narrator')}
                    className={`group cursor-pointer relative p-4 rounded-xl border ${selectedMuse === 'narrator' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-zinc-900/40'} hover:bg-zinc-900/80 hover:border-emerald-500/50 transition-all duration-300 flex flex-col items-center gap-3`}
                  >
                    <div className="absolute inset-0 bg-emerald-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <i data-lucide="mic-2" className="w-5 h-5 text-emerald-300" data-stroke-width="1.5"></i>
                    </div>
                    <div className="text-center relative z-10">
                      <h3 className="text-sm font-semibold text-zinc-200 mb-1">Narrator</h3>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500">Voice & Saga</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleAwakenMuse}
                    disabled={!selectedMuse || isCompleting}
                    className="group relative inline-flex items-center justify-center px-8 py-3 overflow-hidden font-medium text-white transition duration-300 ease-out bg-zinc-800 rounded-full hover:bg-zinc-700 shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="mr-2">{isCompleting ? 'Completing...' : 'Awaken Muse'}</span>
                    <i data-lucide="sparkles" className="w-4 h-4 text-amber-200"></i>
                  </button>
                </div>
              </div>

              {/* Step 3: First Scan */}
              <div id="step-3" className={`step-content ${currentStep === 3 ? 'active' : ''} flex flex-col items-center text-center justify-center h-full pt-10`}>
                {/* Ritual Animation */}
                <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
                  {/* Outer Glow */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/20 via-purple-500/10 to-amber-500/20 blur-2xl animate-pulse"></div>

                  {/* Pulsing Rings */}
                  <div className="absolute inset-0 rounded-full border border-indigo-500/20 halo-ring"></div>
                  <div
                    className="absolute inset-4 rounded-full border border-purple-500/20 halo-ring"
                    style={{ animationDelay: '0.5s' }}
                  ></div>
                  <div
                    className="absolute inset-8 rounded-full border border-amber-500/20 halo-ring"
                    style={{ animationDelay: '1s' }}
                  ></div>

                  {/* Core */}
                  <div className="w-24 h-24 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.15)] relative z-10">
                    <i data-lucide="fingerprint" className="w-8 h-8 text-white/80 animate-pulse" data-stroke-width="1"></i>
                  </div>
                </div>

                <h2 className="text-2xl md:text-3xl text-white font-serif-custom italic font-light tracking-tight mb-2 animate-pulse">
                  Listening... Reflecting... <span className="text-indigo-300">Dreaming...</span>
                </h2>
                <p className="text-sm text-zinc-500 font-mono tracking-wider uppercase text-[10px] opacity-70 mb-4">
                  {pipelineStatus === 'syncing' && syncProgress > 0 && `Syncing memories · ${Math.round(syncProgress)}%`}
                  {pipelineStatus === 'scanning' && 'Running first scan...'}
                  {pipelineStatus === 'creating_poem' && 'Creating your artefacts...'}
                  {pipelineStatus === 'complete' && 'Complete! Preparing voice session...'}
                  {pipelineStatus === 'error' && 'Something went wrong...'}
                  {pipelineStatus === 'idle' && 'Preparing your memory stream...'}
                </p>
                
                {/* Progress Bar */}
                {syncProgress > 0 && (
                  <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    ></div>
                  </div>
                )}

                <div className="mt-12">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors border-b border-transparent hover:border-zinc-600 pb-0.5"
                  >
                    Reset Ritual
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="w-full py-6 md:px-12 px-6 z-20 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <i data-lucide="shield-check" className="w-3 h-3 text-zinc-600"></i>
              <p className="text-xs text-zinc-500 font-normal">
                Your data never leaves your device unless you choose to sync.
              </p>
            </div>
          </footer>
        </main>
      </div>
    </AuthGuard>
  );
}

