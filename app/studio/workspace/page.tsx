'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SmartLoader from '@/app/components/SmartLoader';

export default function WorkspaceRedirect() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [museType, setMuseType] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // Get user ID and muse type
      const { createSupabaseClient } = await import('@/lib/supabase');
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setUserId(session.user.id);

        // Get muse type from profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('muse_type')
          .eq('id', session.user.id)
          .single();

        if (profile?.muse_type) {
          setMuseType(profile.muse_type);
        }
      }
    };

    init();
  }, []);

  return (
    <SmartLoader
      fullScreen={true}
      userId={userId || undefined}
      warmData={userId ? 'all' : undefined}
      museType={museType || undefined}
      onCacheWarmed={() => router.replace('/studio')}
      message="Loading your workspace..."
      size="lg"
      minimumDuration={1500}
    />
  );
}
