import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. Setup Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // 2. Initial Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        if (session) {
          setUser(session.user);
        }
        setLoading(false);
      }
    });

    // 3. FORCE FIX: Manually parse URL if Supabase missed it
    const handleHash = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        try {
          // Extract tokens manually
          const params = new URLSearchParams(hash.substring(1)); // remove #
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (data?.session?.user) {
              setUser(data.session.user);
              // Clean URL
              window.history.replaceState(null, '', window.location.pathname);
            }
          }
        } catch (e) {
          console.error("Manual token parse failed", e);
        }
      }
    };

    handleHash();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
