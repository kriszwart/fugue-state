/**
 * GET /api/cache/get
 * Retrieves cached data with key
 */

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Cache key is required' },
        { status: 400 }
      );
    }

    // Get from Redis cache
    const cachedData = await cache.get(key);

    if (cachedData) {
      return NextResponse.json({
        data: cachedData,
        fromCache: true,
      });
    }

    return NextResponse.json({
      data: null,
      fromCache: false,
    });
  } catch (error) {
    console.error('[API] Cache get error:', error);
    return NextResponse.json(
      { error: 'Failed to get cached data' },
      { status: 500 }
    );
  }
}
