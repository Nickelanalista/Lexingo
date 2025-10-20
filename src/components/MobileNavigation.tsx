import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Library, Plus, User, Settings } from 'lucide-react';

const MobileNavigation = () => {
  const location = useLocation();

  const navigationItems = [
    { path: '/', icon: Home, label: 'Inicio' },
    { path: '/books', icon: Library, label: 'Libros' },
    { path: '/upload', icon: Plus, label: 'Cargar', primary: true },
    { path: '/profile', icon: User, label: 'Cuenta' },
    { path: '/settings', icon: Settings, label: 'Ajustes' }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-[200]">
      <div className="bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl shadow-black/20">
        <div 
          className="flex items-center justify-around px-4 py-2 relative" 
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 8px)' }}
        >
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            if (item.primary) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center justify-center bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-500 p-4 rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-purple-500/25"
                >
                  <Icon className="h-6 w-6 text-white drop-shadow-md" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-3 px-4 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                  active 
                    ? 'text-purple-400 bg-purple-500/10 shadow-md' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-purple-400 hover:bg-white/5'
                }`}
              >
                <Icon className={`h-5 w-5 transition-all duration-300 ${active ? 'drop-shadow-md' : ''}`} />
                <span className={`text-xs mt-1 font-medium transition-all duration-300 ${active ? 'drop-shadow-sm' : ''}`}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-md" />
                )}
              </Link>
            );
          })}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-pink-600/5 to-indigo-600/5 rounded-3xl pointer-events-none" />
      </div>
    </div>
  );
};

export default MobileNavigation;