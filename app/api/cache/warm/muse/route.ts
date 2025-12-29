/**
 * POST /api/cache/warm/muse
 * Pre-fetches and caches muse-related data for instant loading
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { museCache } from '@/lib/cache-service';
import { cache } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { museType } = body;

    if (!museType) {
      return NextResponse.json(
        { error: 'Muse type is required' },
        { status: 400 }
      );
    }

    // Fetch and cache artefacts
    const { data: artefacts } = await supabase
      .from('artefacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (artefacts) {
      // Cache individual artefacts
      for (const artefact of artefacts) {
        const key = `user:${userId}:artefact:${artefact.id}`;
        await cache.set(key, artefact, 900); // 15 minutes
      }

      // Cache artefacts list
      const key = `user:${userId}:artefacts:recent`;
      await cache.set(key, artefacts, 900);
    }

    // Check for pending first scan in localStorage
    // (This would normally be fetched from your muse API)
    const firstScanKey = `user:${userId}:first_scan`;
    const existingFirstScan = await cache.get(firstScanKey);

    // If no cached first scan, fetch from API or database
    if (!existingFirstScan) {
      const { data: scanResult } = await supabase
        .from('muse_scans')
        .select('*')
        .eq('user_id', userId)
        .eq('scan_type', 'first')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (scanResult) {
        await museCache.cacheFirstScan(userId, scanResult.result);
      }
    }

    return NextResponse.json({
      success: true,
      cached: {
        artefacts: artefacts?.length || 0,
        firstScan: !!existingFirstScan,
      },
    });
  } catch (error) {
    console.error('[API] Cache warm/muse error:', error);
    return NextResponse.json(
      { error: 'Failed to warm muse cache' },
      { status: 500 }
    );
  }
}
