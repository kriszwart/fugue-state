import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get storage statistics from the artefacts bucket
    const { data: files, error: storageError } = await supabase
      .storage
      .from('artefacts')
      .list(`vault/${user.id}`, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (storageError) {
      console.error('Storage stats error:', storageError);
      return NextResponse.json({
        count: 0,
        size: 0,
        files: []
      });
    }

    // Calculate total size
    const totalSize = (files || []).reduce((acc, file) => acc + (file.metadata?.size || 0), 0);
    const count = files?.length || 0;

    return NextResponse.json({
      count,
      size: totalSize,
      files: (files || []).map(f => ({
        name: f.name,
        size: f.metadata?.size || 0,
        created_at: f.created_at
      }))
    });

  } catch (error: any) {
    console.error('Storage stats error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to get storage stats',
        count: 0,
        size: 0
      },
      { status: 500 }
    );
  }
}










