import React from 'react';
import { Moon, Sun, Type, LogOut } from 'lucide-react';
import { useThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { theme, toggleTheme, fontSize, increaseFontSize, decreaseFontSize } = useThemeContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Configuración
      </h1>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Theme Setting */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Sun className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Tema
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Cambia entre modo claro y oscuro
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 bg-gray-200 dark:bg-purple-600"
            >
              <span className="sr-only">Cambiar tema</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Font Size Setting */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Type className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Tamaño de letra
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ajusta el tamaño del texto
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={decreaseFontSize}
                disabled={fontSize <= 12}
                className="p-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                -
              </button>
              <span className="w-8 text-center text-gray-900 dark:text-white">
                {fontSize}
              </span>
              <button
                onClick={increaseFontSize}
                disabled={fontSize >= 24}
                className="p-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Cerrar sesión */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}