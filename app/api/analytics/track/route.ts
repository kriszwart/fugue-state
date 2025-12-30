import { NextRequest, NextResponse } from 'next/server'

/**
 * Analytics tracking endpoint
 * Silently accepts and logs analytics events
 * Can be extended to send to external analytics services
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { event, data, timestamp, url, userAgent } = body

    // Log analytics event (can be extended to send to external services)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', {
        event,
        data,
        timestamp,
        url,
        userAgent: userAgent?.substring(0, 100), // Truncate for logging
      })
    }

    // In production, you could send to:
    // - PostHog
    // - Mixpanel
    // - Google Analytics
    // - Custom analytics service

    return NextResponse.json({ success: true })
  } catch (error: any) {
    // Silently fail - analytics should never break the app
    console.error('[Analytics] Error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}





