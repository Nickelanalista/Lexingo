import React, { useState, useEffect, useRef } from 'react';
import { Book, Home, Library, BookOpen, User, Settings, LogOut } from 'lucide-react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { Link, useLocation } from 'react-router-dom';

const NavigationBar: React.FC = () => {
  const { book } = useBookContext();
  const { theme } = useThemeContext();
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    getProfile();

    // Agregar event listener para cerrar el dropdown al hacer clic fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      // If no profile exists, create one
      if (!data) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            { 
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || null
            }
          ])
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          return;
        }

        setProfile(newProfile);
      } else {
        setProfile(data);
        
        // Si hay una URL de avatar, añadir timestamp para evitar caché
        if (data.avatar_url) {
          const timestamp = new Date().getTime();
          setAvatarUrl(`${data.avatar_url}?t=${timestamp}`);
        } else {
          setAvatarUrl(null);
        }
      }
    } catch (error) {
      console.error('Error in profile management:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setProfile(null);
      setAvatarUrl(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) {
      return profile?.email?.[0]?.toUpperCase() || '?';
    }
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const isActive = (path: string) => location.pathname === path;

  // Logo según el tema
  const logoSrc = theme === 'dark' ? '/img/lexingo_white.png' : '/img/lexingo_black.png';

  // Function to handle avatar load error
  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Error loading avatar in navbar');
    setAvatarUrl(null); // Fallback to initials
  };

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Sección izquierda: logo en web y navegación */}
          <div className="flex items-center">
            {/* Logo en web */}
            <div className="hidden md:block mr-8">
              <img src={logoSrc} alt="Lexingo" className="h-11" />
            </div>
            
            {/* Navegación desktop */}
            <nav className="hidden md:flex space-x-8">
              <Link
                to="/"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/') 
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <Home size={18} />
                <span>Inicio</span>
              </Link>
              
              <Link
                to="/books"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/books')
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                    : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <Library size={18} />
                <span>Mis Libros</span>
              </Link>
              
              <Link
                to="/reader"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/reader')
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                    : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <BookOpen size={18} />
                <span>Lectura</span>
              </Link>
              
              <Link
                to="/profile"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/profile')
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                    : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <User size={18} />
                <span>Mi Cuenta</span>
              </Link>
              
              <Link
                to="/settings"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/settings')
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                    : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <Settings size={18} />
                <span>Configuración</span>
              </Link>
            </nav>
          </div>

          {/* Logo centrado solo en móvil */}
          <div className="md:hidden flex items-center justify-center">
            <img src={logoSrc} alt="Lexingo" className="h-11" />
          </div>

          {/* Perfil de usuario - siempre a la derecha */}
          <div className="flex items-center" ref={dropdownRef}>
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="focus:outline-none"
              >
                {loading ? (
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                ) : avatarUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-200 dark:border-purple-800">
                    <img
                      src={avatarUrl}
                      alt={profile?.name || 'Usuario'}
                      className="w-full h-full object-cover"
                      onError={handleAvatarError}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center text-white font-medium">
                    {getInitials(profile?.name)}
                  </div>
                )}
              </button>
              
              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
                  <Link 
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User size={16} className="mr-2" />
                    Mi Perfil
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <LogOut size={16} className="mr-2" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavigationBar;