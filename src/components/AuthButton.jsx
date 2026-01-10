// A pure display component - No internal logic
export const AuthButton = ({ language, user, onLogin, onLogout }) => {
  
  const label = language === 'en' 
    ? (user ? 'Sign Out' : 'Sign In') 
    : (user ? 'התנתק' : 'התחבר');

  if (user) {
    return (
      <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full pl-1 pr-4 py-1">
        {/* Avatar */}
        {user.user_metadata?.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt="User" className="w-8 h-8 rounded-full border border-white/50" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-xs">
            {user.email?.[0].toUpperCase()}
          </div>
        )}
        
        {/* Info Text */}
        <div className="flex flex-col text-left mr-2">
          <span className="text-[10px] text-white/60 leading-none">Logged in as</span>
          <span className="text-xs font-medium text-white leading-none truncate max-w-[100px]">
            {user.user_metadata?.full_name || user.email?.split('@')[0]}
          </span>
        </div>

        {/* Logout Icon */}
        <button 
          onClick={onLogout} 
          className="text-white/50 hover:text-white transition-colors"
          title={label}
        >
          ✕
        </button>
      </div>
    );
  }

  // Logged Out State
  return (
    <button
      onClick={onLogin}
      className="bg-white/90 hover:bg-white text-gray-900 px-4 py-2 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 text-sm"
    >
      <img src="https://www.google.com/favicon.ico" alt="G" className="w-3.5 h-3.5" />
      {label}
    </button>
  );
};
