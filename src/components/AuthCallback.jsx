import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const extractHashParams = (hash) => {
  if (!hash) return {};
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
  };
};

export const AuthCallback = () => {
  useEffect(() => {
    const handleAuthCallback = async () => {
      const { search, hash, pathname } = window.location;
      const params = new URLSearchParams(search);
      const code = params.get('code');
      const error = params.get('error') || params.get('error_description');
      const { accessToken, refreshToken } = extractHashParams(hash);

      if (error) {
        console.error('OAuth error:', error);
      }

      try {
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else if (accessToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
        }
      } catch (err) {
        console.error('OAuth callback failed', err);
      } finally {
        if (code || accessToken) {
          const nextPath = pathname === '/auth/callback' ? '/' : pathname;
          window.history.replaceState(null, '', nextPath);
        }
      }
    };

    handleAuthCallback();
  }, []);

  return null;
};
