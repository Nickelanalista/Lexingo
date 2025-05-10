import React, { useState } from 'react';
import { Book, Sparkles, Brain, Zap, Languages, BookOpen, ChevronDown } from 'lucide-react';
import AuthModal from './AuthModal';

export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<'login' | 'register'>('login');

  const openAuthModal = (view: 'login' | 'register') => {
    setAuthModalView(view);
    setIsAuthModalOpen(true);
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Book className="h-8 w-8 text-purple-500" />
              <span className="ml-2 text-xl font-bold">Lexingo</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => openAuthModal('login')}
                className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              >
                Acceder
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-gray-900/20 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center relative z-10">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-900/30 border border-purple-700/30 mb-8">
              <Sparkles className="h-4 w-4 text-purple-400 mr-2" />
              <span className="text-sm text-purple-300">Potenciado por Inteligencia Artificial</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6">
              <span className="block text-white mb-2">Tu asistente de lectura</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                con traducción instantánea
              </span>
            </h1>
            
            <p className="mt-3 max-w-md mx-auto text-lg text-gray-300 sm:text-xl md:mt-5 md:max-w-3xl">
              Mejora tu comprensión lectora en inglés con traducción en tiempo real impulsada por IA.
              Sube tus documentos y comienza a leer de forma interactiva.
            </p>

            <div className="mt-10 flex justify-center gap-4">
              <button
                onClick={() => openAuthModal('register')}
                className="px-8 py-3 text-base font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 md:py-4 md:text-lg md:px-10 transform transition-all hover:scale-105"
              >
                Comenzar gratis
              </button>
              <button
                onClick={() => openAuthModal('login')}
                className="px-8 py-3 border border-gray-700 text-base font-medium rounded-md text-gray-300 bg-gray-900 hover:bg-gray-800 md:py-4 md:text-lg md:px-10"
              >
                Ya tengo cuenta
              </button>
            </div>

            <button
              onClick={scrollToFeatures}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center text-gray-400 hover:text-gray-300 transition-colors animate-bounce"
            >
              <span className="text-sm mb-2">Descubre más</span>
              <ChevronDown className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold sm:text-4xl bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Tecnología avanzada de IA
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-400">
              Experimenta una nueva forma de leer con tecnología de vanguardia
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="relative group">
                <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 opacity-25 group-hover:opacity-50 transition-opacity blur" />
                <div className="relative p-8 bg-gray-900 rounded-lg border border-gray-800">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-900/30 rounded-lg mb-4">
                    <Brain className="h-6 w-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Traducción con IA
                  </h3>
                  <p className="text-gray-400">
                    Traducciones precisas y contextuales usando modelos avanzados de lenguaje
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="relative group">
                <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 opacity-25 group-hover:opacity-50 transition-opacity blur" />
                <div className="relative p-8 bg-gray-900 rounded-lg border border-gray-800">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-900/30 rounded-lg mb-4">
                    <Zap className="h-6 w-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Respuesta instantánea
                  </h3>
                  <p className="text-gray-400">
                    Traducciones en tiempo real con solo hacer clic en cualquier palabra
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="relative group">
                <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 opacity-25 group-hover:opacity-50 transition-opacity blur" />
                <div className="relative p-8 bg-gray-900 rounded-lg border border-gray-800">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-900/30 rounded-lg mb-4">
                    <Languages className="h-6 w-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Comprensión mejorada
                  </h3>
                  <p className="text-gray-400">
                    Mejora tu vocabulario y comprensión con ayuda de la IA
                  </p>
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