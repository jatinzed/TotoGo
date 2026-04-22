import React from 'react';
import { Home, History, Wallet, User, Trophy, LayoutDashboard } from 'lucide-react';
import { cn } from '../../utils/format';
import { NavLink } from 'react-router-dom';

export function Layout({ children, showNav = true, isDriver = false }: { children: React.ReactNode, showNav?: boolean, isDriver?: boolean }) {
  const navItems = isDriver 
    ? [
        { to: '/driver', icon: Home, label: 'Home' },
        { to: '/driver/earnings', icon: History, label: 'Earnings' },
        { to: '/driver/documents', icon: User, label: 'Docs' },
      ]
    : [
        { to: '/', icon: Home, label: 'Home' },
        { to: '/history', icon: History, label: 'Rides' },
        { to: '/wallet', icon: Wallet, label: 'Wallet' },
        { to: '/rewards', icon: Trophy, label: 'Rewards' },
        { to: '/profile', icon: User, label: 'Profile' },
      ];

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        <main className="flex-grow">
          {children}
        </main>
        
        {showNav && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 z-50">
            <div className="max-w-md mx-auto flex justify-between items-center">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cn(
                    "flex flex-col items-center space-y-1 transition-colors",
                    isActive ? "text-black" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <item.icon size={22} strokeWidth={2} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
