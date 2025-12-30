/**
 * Auth Check Utility for Static HTML Pages
 * Checks authentication and initialization status before allowing access
 */

(async function() {
  // Only run on studio pages
  if (!window.location.pathname.startsWith('/studio')) {
    return;
  }

  try {
    // Check authentication
    const authResponse = await fetch('/api/auth');
    const authData = await authResponse.json();

    if (!authData.user) {
      // Not authenticated, redirect to login
      window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    // Check initialization status
    const initResponse = await fetch('/api/initialization/status');
    const initData = await initResponse.json();

    if (initData.needsInitialization) {
      // Not initialized, redirect to initialization
      window.location.href = '/initialization';
      return;
    }

    // User is authenticated and initialized, allow page to load
  } catch (error) {
    console.error('Auth check error:', error);
    // On error, redirect to login for safety
    window.location.href = '/auth/login';
  }
})();


























