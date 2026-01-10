import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const AuthButton = ({ language }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (user) {
    return (
      <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full pl-1 pr-4 py-1">
        {/* Avatar */}
        {user.user_metadata?.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt="User" className="w-8 h-8 rounded-full border border-white/50" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
            {user.email[0].toUpperCase()}
          </div>
        )}
        
        {/* Info Text */}
        <div className="flex flex-col text-left mr-2">
          <span className="text-xs text-white/60 leading-none">Logged in as</span>
          <span className="text-sm font-medium text-white leading-none truncate max-w-[100px]">
            {user.user_metadata?.full_name || user.email.split('@')[0]}
          </span>
        </div>

        {/* Logout Icon */}
        <button 
          onClick={handleLogout} 
          className="text-white/50 hover:text-white transition-colors"
          title="Sign Out"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="bg-white/90 hover:bg-white text-gray-900 px-4 py-2 rounded-full font-bold shadow-lg transition-all flex items-center gap-2"
    >
      <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4" />
      {language === 'en' ? 'Sign In' : 'התחבר'}
    </button>
  );
};
