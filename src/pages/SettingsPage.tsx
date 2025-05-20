import React, { useState, useEffect } from 'react';
import { Moon, Sun, Type, LogOut, Languages, ChevronDown } from 'lucide-react';
import { useThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Flag from 'react-world-flags';
import { getLanguageName } from '../services/openai';

// Mapeo de códigos de idioma a códigos de país para las banderas (igual que en Reader.tsx)
const languageToCountryCode: {[key: string]: string} = {
  en: 'US',  // Inglés -> Estados Unidos
  it: 'IT',  // Italiano -> Italia
  fr: 'FR',  // Francés -> Francia
  ja: 'JP',  // Japonés -> Japón
  de: 'DE',  // Alemán -> Alemania
  pt: 'PT',  // Portugués -> Portugal
  ru: 'RU',  // Ruso -> Rusia
  zh: 'CN',  // Chino -> China
  ar: 'SA',  // Árabe -> Arabia Saudita
  hi: 'IN',  // Hindi -> India
  ko: 'KR',  // Coreano -> Corea del Sur
  nl: 'NL',  // Holandés -> Países Bajos
  sv: 'SE',  // Sueco -> Suecia
  tr: 'TR',  // Turco -> Turquía
};

// Lista de idiomas disponibles (igual que en Reader.tsx pero sin español)
const languageOptions = [
  { code: "en", name: "Inglés" },
  { code: "it", name: "Italiano" },
  { code: "fr", name: "Francés" },
  { code: "ja", name: "Japonés" },
  { code: "de", name: "Alemán" },
  { code: "pt", name: "Portugués" },
  { code: "ru", name: "Ruso" },
  { code: "zh", name: "Chino" },
  { code: "ar", name: "Árabe" },
  { code: "hi", name: "Hindi" },
  { code: "ko", name: "Coreano" },
  { code: "nl", name: "Holandés" },
  { code: "sv", name: "Sueco" },
  { code: "tr", name: "Turco" },
];

export default function SettingsPage() {
  const { theme, toggleTheme, fontSize, increaseFontSize, decreaseFontSize } = useThemeContext();
  const navigate = useNavigate();
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  // Cargar el idioma preferido al iniciar
  useEffect(() => {
    const loadPreferredLanguage = async () => {
      // Primero intentamos cargar desde localStorage como método rápido
      const savedLanguage = localStorage.getItem('preferred_language');
      
      try {
        // Luego verificamos si hay una preferencia guardada en Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Consultar el perfil del usuario para buscar preferencia de idioma
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (!error && data) {
            // Si el perfil tiene la propiedad, usarla
            if (data.preferred_language) {
              console.log('Idioma cargado desde Supabase:', data.preferred_language);
              setPreferredLanguage(data.preferred_language);
              return; // Terminamos si encontramos la preferencia en Supabase
            }
          }
        }
        
        // Si llegamos aquí, no encontramos la preferencia en Supabase o hubo un error
        // Usamos el valor de localStorage como respaldo
        if (savedLanguage) {
          console.log('Idioma cargado desde localStorage:', savedLanguage);
          setPreferredLanguage(savedLanguage);
        }
      } catch (error) {
        console.error('Error al cargar la preferencia de idioma:', error);
        // En caso de error, usar localStorage como respaldo
        if (savedLanguage) {
          setPreferredLanguage(savedLanguage);
        }
      }
    };
    
    loadPreferredLanguage();
  }, []);

  // Función para guardar el idioma preferido
  const savePreferredLanguage = async (languageCode: string) => {
    setPreferredLanguage(languageCode);
    
    // Guardar en localStorage
    localStorage.setItem('preferred_language', languageCode);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Intentar actualizar la preferencia en Supabase
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_language: languageCode })
          .eq('id', user.id);
          
        if (error) {
          console.error('Error al guardar idioma en Supabase:', error);
        } else {
          console.log('Idioma guardado en Supabase:', languageCode);
        }
      }
    } catch (error) {
      console.error('Error al acceder a Supabase:', error);
    }
  };

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
    <div className="max-w-2xl mx-auto px-5 pb-24">
      <div className="text-center pt-6 pb-6 md:pb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
            Configuración
          </span>
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Personaliza tu experiencia en Lexingo.
        </p>
      </div>

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

          {/* Language Setting - NUEVA SECCIÓN */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Languages className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Idioma a aprender
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selecciona el idioma que quieres practicar
                </p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 py-1 px-2 rounded-md text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Flag code={languageToCountryCode[preferredLanguage] || 'US'} className="w-5 h-4" />
                <span>{languageOptions.find(lang => lang.code === preferredLanguage)?.name || 'Inglés'}</span>
                <ChevronDown size={16} className="opacity-70" />
              </button>

              {isLanguageDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 py-1 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700">
                  {languageOptions.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        savePreferredLanguage(lang.code);
                        setIsLanguageDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium flex items-center space-x-2
                        ${preferredLanguage === lang.code 
                          ? 'bg-purple-100 dark:bg-purple-700 text-purple-700 dark:text-purple-100' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                      `}
                    >
                      <Flag code={languageToCountryCode[lang.code] || 'US'} className="w-5 h-4" />
                      <span>{lang.name}</span>
                      {preferredLanguage === lang.code && (
                        <span className="ml-auto">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
            className="flex items-center w-full justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}