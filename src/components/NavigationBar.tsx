import React, { useState, useEffect, useRef } from 'react';
import { Book, Home, Library, BookOpen, User, Settings, LogOut } from 'lucide-react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { Link, useLocation } from 'react-router-dom';
import { AVATAR_UPDATED_EVENT } from '../pages/ProfilePage';

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

    // Listener para actualización de avatar
    const handleAvatarUpdate = (event: CustomEvent) => {
      console.log('Evento de actualización de avatar recibido en NavigationBar', event.detail);
      if (event.detail && event.detail.avatarUrl) {
        setAvatarUrl(event.detail.avatarUrl);
        // Actualizar el perfil después de un breve retraso
        setTimeout(() => getProfile(), 500);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener(AVATAR_UPDATED_EVENT, handleAvatarUpdate as EventListener);
    
    // Configurar un intervalo para refrescar el avatar periódicamente
    const refreshInterval = setInterval(() => {
      if (location.pathname !== '/profile') {  // No refrescar en la página de perfil
        getProfile();
      }
    }, 30000); // Cada 30 segundos
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener(AVATAR_UPDATED_EVENT, handleAvatarUpdate as EventListener);
      clearInterval(refreshInterval);
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

      console.log('Obteniendo perfil del usuario en NavigationBar');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      console.log('Datos del perfil obtenidos:', data);

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
          const cachedUrl = `${data.avatar_url}?t=${timestamp}`;
          console.log('URL de avatar con prevención de caché:', cachedUrl);
          setAvatarUrl(cachedUrl);
        } else {
          console.log('No hay URL de avatar disponible');
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
    console.log('URL que causó el error:', e.currentTarget.src);
    
    // Intentar recargar la imagen con un nuevo timestamp
    if (profile?.avatar_url) {
      const newTimestamp = new Date().getTime();
      const newUrl = `${profile.avatar_url}?t=${newTimestamp}`;
      console.log('Intentando recargar con nueva URL:', newUrl);
      setAvatarUrl(newUrl);
    } else {
      // Si no hay avatar, mostrar iniciales
      setAvatarUrl(null);
    }
  };

  const getAvatarFallback = () => {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center text-white font-medium">
        {getInitials(profile?.name)}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center h-16 items-center">
          {/* Contenedor principal con flex centrado */}
          <div className="flex-1 flex items-center justify-between max-w-5xl">
            {/* Logo en web */}
            <div className="hidden md:flex items-center">
              <img src={logoSrc} alt="Lexingo" className="h-11" />
            </div>

            {/* Navegación desktop - centrada */}
            <nav className="hidden md:flex items-center space-x-4">
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

            {/* Logo centrado solo en móvil */}
            <div className="md:hidden flex items-center justify-center">
              <img src={logoSrc} alt="Lexingo" className="h-11" />
            </div>

            {/* Perfil de usuario */}
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
                    getAvatarFallback()
                  )}
                </button>
                
                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
                    <Link 
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                      onClick={() => {
                        setDropdownOpen(false);
                        // Forzar actualización del perfil al ir a la página de perfil
                        setTimeout(() => getProfile(), 500);
                      }}
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
      </div>
    </header>
  );
};

export default NavigationBar;