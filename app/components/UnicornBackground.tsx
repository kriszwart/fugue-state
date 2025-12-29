'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized?: boolean;
      init?: () => void;
    };
  }
}

export default function UnicornBackground() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadScript = () => {
      if (window.UnicornStudio?.isInitialized) return;

      const script = document.createElement('script');
      script.src =
        'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js';
      script.onload = () => {
        if (window.UnicornStudio?.init) {
          window.UnicornStudio.init();
          if (window.UnicornStudio) {
            window.UnicornStudio.isInitialized = true;
          }
        }
      };
      document.body.appendChild(script);
    };

    loadScript();
  }, []);

  return (
    <div
      data-us-project="NMlvqnkICwYYJ6lYb064"
      className="absolute w-full h-full left-0 top-0 -z-10"
      data-us-production="true"
    />
  );
}
