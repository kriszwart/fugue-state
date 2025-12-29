/**
 * POST /api/cache/set
 * Stores data in Redis cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, ttl = 300 } = body;

    if (!key) {
      return NextResponse.json(
        { error: 'Cache key is required' },
        { status: 400 }
      );
    }

    if (value === undefined) {
      return NextResponse.json(
        { error: 'Cache value is required' },
        { status: 400 }
      );
    }

    // Set in Redis cache
    await cache.set(key, value, ttl);

    return NextResponse.json({
      success: true,
      key,
      ttl,
    });
  } catch (error) {
    console.error('[API] Cache set error:', error);
    return NextResponse.json(
      { error: 'Failed to set cached data' },
      { status: 500 }
    );
  }
}
