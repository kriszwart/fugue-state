import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(_request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return NextResponse.json(
        { error: 'Failed to load profile' },
        { status: 500 }
      );
    }

    // Get additional stats
    const { count: memoryCount } = await supabase
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: conversationCount } = await supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      profile: {
        id: profile.id,
        email: user.email,
        muse_type: profile.muse_type,
        initialization_completed_at: profile.initialization_completed_at,
        created_at: profile.created_at,
        user_role: profile.user_role || 'user',
        is_judge: profile.user_role === 'judge',
        stats: {
          memories: memoryCount || 0,
          conversations: conversationCount || 0
        }
      }
    });

  } catch (error: any) {
    console.error('User profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get user profile' },
      { status: 500 }
    );
  }
}











