import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Library, BookOpen, User, Settings } from 'lucide-react';

const MobileNavigation = () => {
  const location = useLocation();

  const navigationItems = [
    { path: '/', icon: Home, label: 'Inicio' },
    { path: '/books', icon: Library, label: 'Libros' },
    { path: '/reader', icon: BookOpen, label: 'Lectura' },
    { path: '/profile', icon: User, label: 'Perfil' },
    { path: '/settings', icon: Settings, label: 'Ajustes' }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-t border-gray-800 z-50">
      <div 
        className="flex items-center justify-around px-2" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-2 px-3 ${
                active 
                  ? 'text-purple-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
              {active && (
                <span className="absolute top-0 h-0.5 left-0 right-0 bg-purple-500" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNavigation;