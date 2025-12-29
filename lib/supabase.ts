import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Client-side Supabase client
export function createSupabaseClient() {
  return createClientComponentClient()
}

// Server-side Supabase client (for API routes with cookie support)
export function createServerSupabaseClient() {
  // Dynamic import to avoid importing next/headers in client components
  const { cookies } = require('next/headers')
  
  // Handle both sync and async cookies() (Next.js 13 vs 15+)
  let cookieStore: any
  try {
    const cookiesResult = cookies()
    // If cookies() returns a promise, we can't use it synchronously
    // In API routes, cookies() should be synchronous
    cookieStore = cookiesResult
  } catch (error) {
    throw new Error('Failed to get cookies store. Make sure this is called from a server context.')
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value
          } catch (error) {
            // Cookie store might not be available in all contexts
            return undefined
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Service role client (for admin operations)
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role key')
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}






















