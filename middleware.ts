import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Handle .html extension redirects first
  const { pathname } = request.nextUrl;

  // List of paths that should have .html appended
  const htmlPaths = [
    '/studio/workspace',
    '/studio/chat',
    '/studio/calendar',
    '/studio/archive',
    '/studio/gallery',
    '/studio/privacy',
    '/about',
    '/guide',
    '/dameris',
    '/architecture',
  ];

  // If the path matches and doesn't have .html, redirect
  if (htmlPaths.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname + '.html';
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // Require authentication for /voice (but do NOT force initialization)
  if (pathname.startsWith('/voice')) {
    if (authError || !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('redirect', pathname || '/voice')
      return NextResponse.redirect(url)
    }
  }

  // Check initialization status for both studio routes and initialization page
  if (user && !authError) {
    try {
      // Check if user has completed initialization
      const { data: userProfile } = await supabase
        .from('users')
        .select('initialization_completed_at')
        .eq('id', user.id)
        .single()

      const isInitialized = userProfile?.initialization_completed_at !== null
      const needsInitialization = !isInitialized

      // Check if user skipped initialization (check cookie/localStorage equivalent)
      // Note: localStorage is client-side only, so we check via cookie or allow through
      // The client-side code will handle redirect to empty-state if needed
      const skippedInit = request.cookies.get('fuguestate_skipped_init')?.value === 'true'
      
      // If trying to access studio routes but not initialized, redirect to initialization
      // UNLESS they skipped initialization (allow through, client will handle empty state)
      if (pathname.startsWith('/studio') && needsInitialization && !skippedInit) {
        const url = request.nextUrl.clone()
        url.pathname = '/initialization'
        return NextResponse.redirect(url)
      }

      // If trying to access initialization but already initialized, redirect to workspace
      if (pathname === '/initialization' && !needsInitialization) {
        const url = request.nextUrl.clone()
        url.pathname = '/studio/workspace'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      // If error checking initialization, allow through (fail open)
      console.error('Error checking initialization in middleware:', error)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

