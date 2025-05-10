import React, { useState } from 'react';
import { Book } from 'lucide-react';
import AuthModal from './AuthModal';

export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<'login' | 'register'>('login');

  const openAuthModal = (view: 'login' | 'register') => {
    setAuthModalView(view);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Book className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">Lexingo</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => openAuthModal('login')}
                className="px-4 py-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:from-purple-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                Acceder
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white">
              <span className="block">Tu asistente de lectura</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500">
                con traducción instantánea
              </span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Mejora tu comprensión lectora en inglés con traducción en tiempo real. 
              Sube tus documentos y comienza a leer de forma interactiva.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <button
                onClick={() => openAuthModal('register')}
                className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 md:py-4 md:text-lg md:px-10"
              >
                Comenzar gratis
              </button>
              <button
                onClick={() => openAuthModal('login')}
                className="px-8 py-3 border border-gray-300 dark:border-gray-700 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 md:py-4 md:text-lg md:px-10"
              >
                Ya tengo cuenta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
              Características principales
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400">
              Todo lo que necesitas para mejorar tu lectura en inglés
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="pt-6">
                <div className="flow-root bg-white dark:bg-gray-900 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-purple-600 to-blue-500 rounded-md shadow-lg">
                        <Book className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">
                      Traducción instantánea
                    </h3>
                    <p className="mt-5 text-base text-gray-500 dark:text-gray-400">
                      Traduce palabras y frases con un solo clic mientras lees
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="pt-6">
                <div className="flow-root bg-white dark:bg-gray-900 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-purple-600 to-blue-500 rounded-md shadow-lg">
                        <Book className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">
                      Múltiples formatos
                    </h3>
                    <p className="mt-5 text-base text-gray-500 dark:text-gray-400">
                      Soporta PDF, TXT, DOCX y más formatos de documentos
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="pt-6">
                <div className="flow-root bg-white dark:bg-gray-900 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-purple-600 to-blue-500 rounded-md shadow-lg">
                        <Book className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">
                      Modo lectura
                    </h3>
                    <p className="mt-5 text-base text-gray-500 dark:text-gray-400">
                      Interfaz optimizada para una lectura cómoda y sin distracciones
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultView={authModalView}
      />
    </div>
  );
}