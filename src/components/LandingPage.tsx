import React, { useState } from 'react';
import { Book, Sparkles, Brain, Zap, Languages, BookOpen, ChevronDown, BookText, GraduationCap, BarChart, Clock, Check } from 'lucide-react';
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
              <img src="/img/lexingo_white.png" alt="Lexingo" className="h-8" />
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

      {/* How It Works Section */}
      <div className="py-24 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold sm:text-4xl text-white">
              Cómo funciona <span className="text-purple-400">Lexingo</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-400">
              Simplificamos el proceso de aprender mientras lees
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mb-6">
                <BookText className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">1. Sube tu documento</h3>
              <p className="text-gray-400">
                Importa tus PDFs, artículos o libros en inglés que quieras leer y comprender mejor
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mb-6">
                <Languages className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">2. Interactúa con el texto</h3>
              <p className="text-gray-400">
                Toca cualquier palabra o párrafo para obtener traducciones instantáneas con IA
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mb-6">
                <GraduationCap className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">3. Aprende y mejora</h3>
              <p className="text-gray-400">
                Expande tu vocabulario y mejora tu comprensión lectora con cada texto que leas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-white mb-8">
                Potencia tu aprendizaje de idiomas
              </h2>
              
              <div className="space-y-5">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Check className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-white">Comprensión contextual</h3>
                    <p className="mt-2 text-gray-400">
                      Entiende las palabras en su contexto real, no solo traducciones aisladas
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Check className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-white">Aprendizaje práctico</h3>
                    <p className="mt-2 text-gray-400">
                      Aprende inglés con tus propios materiales, no con ejemplos descontextualizados
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Check className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-white">Sin interrupciones</h3>
                    <p className="mt-2 text-gray-400">
                      Lee de forma fluida sin tener que consultar constantemente diccionarios externos
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Check className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-white">Accesible siempre</h3>
                    <p className="mt-2 text-gray-400">
                      Accede a tus documentos desde cualquier dispositivo y continúa donde lo dejaste
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-10">
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-8 py-3 text-base font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all hover:scale-105"
                >
                  Prueba Lexingo ahora
                </button>
              </div>
            </div>
            
            <div className="mt-12 lg:mt-0">
              <div className="relative rounded-lg overflow-hidden shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-blue-500/30 mix-blend-overlay" />
                <div className="bg-gray-800 rounded-lg p-8 relative border border-gray-700">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                      <Book className="h-6 w-6 text-purple-400 mr-2" />
                      <span className="text-white font-semibold">Reader Demo</span>
                    </div>
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                  
                  <div className="mb-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                    <p className="text-gray-300 text-sm">
                      The <span className="px-2 py-1 bg-purple-900/40 rounded text-white">artificial intelligence</span> has transformed how we approach language learning, making it more accessible than ever before.
                    </p>
                    
                    <div className="mt-2 p-2 bg-blue-900/20 rounded border border-blue-800/30">
                      <p className="text-blue-300 text-xs">La inteligencia artificial ha transformado cómo abordamos el aprendizaje de idiomas, haciéndolo más accesible que nunca.</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-gray-700/30 rounded border border-gray-600 text-center">
                      <p className="text-white text-xs">Traducción</p>
                    </div>
                    <div className="p-2 bg-gray-700/30 rounded border border-gray-600 text-center">
                      <p className="text-white text-xs">Definición</p>
                    </div>
                    <div className="p-2 bg-gray-700/30 rounded border border-gray-600 text-center">
                      <p className="text-white text-xs">Ejemplos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-6">
            Mejora tu comprensión de inglés hoy mismo
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-gray-300 mb-10">
            Únete a miles de estudiantes que están mejorando su nivel de inglés mientras leen sus textos favoritos
          </p>
          <button
            onClick={() => openAuthModal('register')}
            className="px-8 py-4 text-base font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 md:text-lg md:px-10 transform transition-all hover:scale-105"
          >
            Comenzar ahora - ¡Es gratis!
          </button>
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