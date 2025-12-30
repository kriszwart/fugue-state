/**
 * Redis Status API
 * Check if Redis is connected and available
 */

import { NextResponse } from 'next/server'
import { isRedisAvailable } from '@/lib/redis'

export async function GET() {
  try {
    const available = await isRedisAvailable()
    
    return NextResponse.json({
      connected: available,
      status: available ? 'connected' : 'disconnected'
    })
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      status: 'error',
      error: error.message
    })
  }
}
























