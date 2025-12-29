/**
 * POST /api/cache/warm/user
 * Pre-fetches and caches all user data for instant loading
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { userCache, dataSourceCache, memoryCache, conversationCache } from '@/lib/cache-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch and cache user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      await userCache.cacheProfile(userId, {
        id: profile.id,
        email: profile.email || session.user.email || '',
        userName: profile.user_name || '',
        createdAt: profile.created_at,
        preferences: profile.preferences,
      });
    }

    // Fetch and cache initialization status
    const initCompleted = localStorage?.getItem?.('fuguestate_init_completed');
    const userName = localStorage?.getItem?.('fuguestate_username');

    // Fetch connected data sources
    const { data: dataSources } = await supabase
      .from('user_data_sources')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (dataSources) {
      await dataSourceCache.cacheDataSources(userId, dataSources);

      await userCache.cacheInitStatus(userId, {
        hasName: !!userName,
        userName: userName || undefined,
        hasConnectedSources: dataSources.length > 0,
        connectedSources: dataSources.map(ds => ds.source_type),
        selectedMuse: profile?.muse_type,
        initCompleted: !!initCompleted,
        firstScanDone: !!profile?.first_scan_completed,
      });
    }

    // Fetch and cache recent memories
    const { data: memories } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (memories) {
      await memoryCache.cacheMemoriesList(userId, 1, memories);

      // Cache individual memories
      for (const memory of memories) {
        await memoryCache.cacheMemory(userId, memory.id, memory);
      }
    }

    // Fetch and cache conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (conversations) {
      await conversationCache.cacheConversations(userId, conversations);
    }

    return NextResponse.json({
      success: true,
      cached: {
        profile: !!profile,
        dataSources: dataSources?.length || 0,
        memories: memories?.length || 0,
        conversations: conversations?.length || 0,
      },
    });
  } catch (error) {
    console.error('[API] Cache warm/user error:', error);
    return NextResponse.json(
      { error: 'Failed to warm user cache' },
      { status: 500 }
    );
  }
}
