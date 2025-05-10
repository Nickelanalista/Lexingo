import React, { useState } from 'react';
import { Settings, Moon, Sun, Volume2, Type } from 'lucide-react';
import { useThemeContext } from '../context/ThemeContext';

export default function SettingsPage() {
  const { theme, toggleTheme, fontSize, increaseFontSize, decreaseFontSize } = useThemeContext();
  const [autoplay, setAutoplay] = useState(false);

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

          {/* Audio Setting */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Volume2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Audio automático
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Reproducir audio al mostrar traducción
                </p>
              </div>
            </div>
            <button
              onClick={() => setAutoplay(!autoplay)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                autoplay ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span className="sr-only">Activar audio automático</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoplay ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}