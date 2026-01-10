import { useAuth } from '../lib/useAuth';

export const AuthButton = ({ language }) => {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  const translations = {
    en: { signIn: 'Sign In', signOut: 'Sign Out' },
    he: { signIn: 'התחבר', signOut: 'התנתק' }
  };

  const t = translations[language];

  if (loading) return null;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
          <img 
            src={user.user_metadata?.avatar_url} 
            alt={user.user_metadata?.name}
            className="w-6 h-6 rounded-full"
          />
          <span className="text-white text-sm">{user.user_metadata?.name?.split(' ')[0]}</span>
        </div>
        <button
          onClick={signOut}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white py-2 px-3 rounded-lg border border-white/20 transition-all"
        >
          {t.signOut}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="bg-white hover:bg-gray-50 text-gray-800 py-2 px-4 rounded-lg shadow-lg font-medium flex items-center gap-2 transition-all"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span className="hidden md:inline">{t.signIn}</span>
    </button>
  );
};
