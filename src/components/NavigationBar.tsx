import React, { useState, useEffect, useRef } from 'react';
import { Book, Home, Library, BookOpen, User, Settings, LogOut, Plus } from 'lucide-react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { Link, useLocation } from 'react-router-dom';
import { AVATAR_UPDATED_EVENT } from '../pages/ProfilePage';

// Cache para el avatar del usuario
const AVATAR_CACHE_KEY = 'user_avatar_cache';
const AVATAR_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

interface AvatarCache {
  url: string;
  timestamp: number;
  userId: string;
}

// Funciones para manejar el caché del avatar
const saveAvatarToCache = (url: string, userId: string) => {
  try {
    const cacheData: AvatarCache = {
      url,
      timestamp: Date.now(),
      userId
    };
    localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Error guardando avatar en caché:', error);
  }
};

const getAvatarFromCache = (userId: string): string | null => {
  try {
    const cached = localStorage.getItem(AVATAR_CACHE_KEY);
    if (!cached) return null;
    
    const cacheData: AvatarCache = JSON.parse(cached);
    const now = Date.now();
    
    // Verificar si es del mismo usuario y no ha expirado
    if (cacheData.userId === userId && (now - cacheData.timestamp) < AVATAR_CACHE_DURATION) {
      return cacheData.url;
    }
    
    // Cache expirado o de otro usuario
    localStorage.removeItem(AVATAR_CACHE_KEY);
    return null;
  } catch (error) {
    console.warn('Error leyendo avatar del caché:', error);
    return null;
  }
};

const clearAvatarCache = () => {
  try {
    localStorage.removeItem(AVATAR_CACHE_KEY);
  } catch (error) {
    console.warn('Error limpiando caché de avatar:', error);
  }
};

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

    // Listener para actualización de avatar - limpiar caché y recargar
    const handleAvatarUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.avatarUrl) {
        // Limpiar caché y establecer nuevo avatar
        clearAvatarCache();
        setAvatarUrl(event.detail.avatarUrl);
        // Actualizar el perfil después de un breve retraso
        setTimeout(() => getProfile(), 500);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener(AVATAR_UPDATED_EVENT, handleAvatarUpdate as EventListener);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener(AVATAR_UPDATED_EVENT, handleAvatarUpdate as EventListener);
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

      // Verificar caché primero
      const cachedAvatar = getAvatarFromCache(user.id);
      if (cachedAvatar) {
        setAvatarUrl(cachedAvatar);
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

      // Datos del perfil obtenidos

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
        
        // Manejar avatar con caché inteligente
        if (data.avatar_url) {
          // Solo recargar avatar si no está en caché o si ha cambiado
          if (!cachedAvatar || !cachedAvatar.includes(data.avatar_url.split('?')[0])) {
            const timestamp = new Date().getTime();
            const newAvatarUrl = `${data.avatar_url}?t=${timestamp}`;
            setAvatarUrl(newAvatarUrl);
            // Guardar en caché
            saveAvatarToCache(newAvatarUrl, user.id);
          }
        } else {
          // No hay avatar disponible
          setAvatarUrl(null);
          // Limpiar caché si no hay avatar
          clearAvatarCache();
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
      // Limpiar caché de avatar al cerrar sesión
      clearAvatarCache();
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
    // Limpiar caché de avatar problemático
    clearAvatarCache();
    
    // Intentar recargar la imagen con un nuevo timestamp una vez
    if (profile?.avatar_url && !e.currentTarget.src.includes('retry=1')) {
      const newTimestamp = new Date().getTime();
      const newUrl = `${profile.avatar_url}?t=${newTimestamp}&retry=1`;
      setAvatarUrl(newUrl);
    } else {
      // Si falla después del retry, mostrar iniciales
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

  // Agregar estilos para la línea brillante
  React.useEffect(() => {
    const styleId = 'header-divider-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes shimmerLine {
          0% {
            background-position: -300% 50%;
          }
          100% {
            background-position: 300% 50%;
          }
        }
        
        .header-divider {
          background: linear-gradient(
            90deg,
            transparent 0%,
            transparent 30%,
            rgba(147, 51, 234, 0.1) 40%,
            rgba(147, 51, 234, 0.3) 45%,
            rgba(147, 51, 234, 0.6) 48%,
            rgba(147, 51, 234, 0.8) 50%,
            rgba(147, 51, 234, 0.6) 52%,
            rgba(147, 51, 234, 0.3) 55%,
            rgba(147, 51, 234, 0.1) 60%,
            transparent 70%,
            transparent 100%
          );
          background-size: 600% 100%;
          animation: shimmerLine 20s linear infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <>
      {/* Header simple con logo y perfil para desktop y móvil */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Logo - centrado */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
              <Link to="/" className="flex items-center">
                <img src={logoSrc} alt="Lexingo" className="h-11 hover:opacity-80 transition-opacity" />
              </Link>
            </div>

            {/* Perfil de usuario - siempre a la derecha */}
            <div className="ml-auto flex items-center relative z-[999999]" ref={dropdownRef}>
              <div className="relative z-50">
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
                  <div className="absolute right-0 mt-2 w-48 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl py-2 z-[99999] border border-white/20 dark:border-gray-700/30" style={{ zIndex: 99999 }}>
                    <Link 
                      to="/profile"
                      className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-xl mx-2 flex items-center transition-all duration-200"
                      onClick={() => {
                        setDropdownOpen(false);
                        if (!getAvatarFromCache(profile?.id)) {
                          setTimeout(() => getProfile(), 500);
                        }
                      }}
                    >
                      <User size={16} className="mr-3" />
                      Mi Perfil
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-3 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-xl mx-2 flex items-center transition-all duration-200"
                    >
                      <LogOut size={16} className="mr-3" />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Línea divisoria morada con efecto brillante */}
          <div className="header-divider h-0.5 w-full"></div>
      </header>

      {/* Navegación glassmorphism flotante para desktop */}
      <div className="hidden md:block fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[200]">
        <div className="bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl shadow-black/20">
          <nav className="flex items-center px-6 py-3 space-x-2">
            <Link
              to="/"
              className={`flex flex-col items-center py-3 px-5 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                isActive('/') 
                  ? 'text-purple-400 bg-purple-500/10 shadow-md' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-purple-400 hover:bg-white/5'
              }`}
            >
              <Home className={`h-5 w-5 transition-all duration-300 ${isActive('/') ? 'drop-shadow-md' : ''}`} />
              <span className={`text-xs mt-1 font-medium transition-all duration-300 ${isActive('/') ? 'drop-shadow-sm' : ''}`}>
                Inicio
              </span>
              {isActive('/') && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-md" />
              )}
            </Link>
            
            <Link
              to="/books"
              className={`flex flex-col items-center py-3 px-5 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                isActive('/books')
                  ? 'text-purple-400 bg-purple-500/10 shadow-md'
                  : 'text-gray-500 dark:text-gray-400 hover:text-purple-400 hover:bg-white/5'
              }`}
            >
              <Library className={`h-5 w-5 transition-all duration-300 ${isActive('/books') ? 'drop-shadow-md' : ''}`} />
              <span className={`text-xs mt-1 font-medium transition-all duration-300 ${isActive('/books') ? 'drop-shadow-sm' : ''}`}>
                Libros
              </span>
              {isActive('/books') && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-md" />
              )}
            </Link>

            <Link
              to="/upload"
              className="flex flex-col items-center justify-center bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-500 p-4 rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-purple-500/25 mx-2"
            >
              <Plus className="h-6 w-6 text-white drop-shadow-md" />
              <span className="sr-only">Cargar</span>
            </Link>
            
            <Link
              to="/profile"
              className={`flex flex-col items-center py-3 px-5 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                isActive('/profile')
                  ? 'text-purple-400 bg-purple-500/10 shadow-md'
                  : 'text-gray-500 dark:text-gray-400 hover:text-purple-400 hover:bg-white/5'
              }`}
            >
              <User className={`h-5 w-5 transition-all duration-300 ${isActive('/profile') ? 'drop-shadow-md' : ''}`} />
              <span className={`text-xs mt-1 font-medium transition-all duration-300 ${isActive('/profile') ? 'drop-shadow-sm' : ''}`}>
                Cuenta
              </span>
              {isActive('/profile') && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-md" />
              )}
            </Link>
            
            <Link
              to="/settings"
              className={`flex flex-col items-center py-3 px-5 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                isActive('/settings')
                  ? 'text-purple-400 bg-purple-500/10 shadow-md'
                  : 'text-gray-500 dark:text-gray-400 hover:text-purple-400 hover:bg-white/5'
              }`}
            >
              <Settings className={`h-5 w-5 transition-all duration-300 ${isActive('/settings') ? 'drop-shadow-md' : ''}`} />
              <span className={`text-xs mt-1 font-medium transition-all duration-300 ${isActive('/settings') ? 'drop-shadow-sm' : ''}`}>
                Ajustes
              </span>
              {isActive('/settings') && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-md" />
              )}
            </Link>
          </nav>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-pink-600/5 to-indigo-600/5 rounded-3xl pointer-events-none" />
        </div>
      </div>
    </>
  );
};

export default NavigationBar;