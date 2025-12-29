'use client';

import { useEffect } from 'react';

export default function LandingPage() {
  useEffect(() => {
    // Redirect to static HTML version
    window.location.href = '/index.html';
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#09090b',
      color: '#fff',
      fontFamily: 'sans-serif'
    }}>
      <p>Redirecting to FugueState.ai...</p>
    </div>
  );
}
