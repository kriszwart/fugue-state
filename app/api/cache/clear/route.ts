/**
 * API Route: Clear Cache
 * Clears all Redis cache for a specific user or all caches
 */

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Clear all user-related caches
    const cacheKeys = [
      `user:${userId}:profile`,
      `user:${userId}:init_status`,
      `user:${userId}:memories`,
      `user:${userId}:conversations`,
      `user:${userId}:data_sources`,
      `muse:${userId}:first_scan`,
      `muse:${userId}:synthesis`,
      `muse:${userId}:analyst`,
      `muse:${userId}:poet`,
      `muse:${userId}:curator`,
    ];

    // Delete all cache keys
    await Promise.all(cacheKeys.map(key => cache.delete(key)));

    console.log(`[Cache Clear] Cleared ${cacheKeys.length} cache keys for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      clearedKeys: cacheKeys.length,
    });
  } catch (error: any) {
    console.error('[Cache Clear] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
