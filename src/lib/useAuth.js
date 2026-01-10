import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function handleSession() {
      // 1. Check for existing session
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (mounted && existingSession) {
        console.log("✅ Found existing session");
        setUser(existingSession.user);
        setLoading(false);
        return;
      }

      // 2. If no session, check URL for OAuth token (Manual Override)
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        console.log("🔄 Detected OAuth token in URL, forcing session...");
        
        try {
          // Parse hash manually
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (error) throw error;

            if (mounted && data.session) {
              console.log("✅ Manual session set successfully");
              setUser(data.session.user);
              // Clean URL only after success
              window.history.replaceState(null, '', window.location.pathname);
            }
          }
        } catch (e) {
          console.error("❌ Manual token parse failed:", e);
        }
      }
      
      if (mounted) setLoading(false);
    }

    handleSession();

    // 3. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔔 Auth Event: ${event}`);
      if (mounted) {
        if (session) {
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
