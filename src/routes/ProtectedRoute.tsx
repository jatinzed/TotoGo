import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../features/common/stores/authStore';
import { Logo } from '../components/common/Logo';

export const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, profile, loading, initialized } = useAuthStore();
  
  if (!initialized || loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black transition-all">
        <Logo className="w-48 text-white animate-pulse" />
        <div className="mt-8 flex flex-col items-center space-y-4">
           <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="w-1/2 h-full bg-white animate-[loading_1.5s_infinite]" />
           </div>
           <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Igniting Engines</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }
  
  if (roles && profile && !roles.includes(profile.role)) {
    if (profile.role === 'driver') return <Navigate to="/driver" replace />;
    if (profile.role === 'rider') return <Navigate to="/" replace />;
    return <Navigate to="/welcome" replace />;
  }
  
  return <>{children}</>;
};
