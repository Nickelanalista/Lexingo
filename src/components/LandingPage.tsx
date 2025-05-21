import React, { useState } from 'react';
import { Book, Sparkles, Brain, Zap, Languages, BookOpen, ChevronDown, BookText, GraduationCap, BarChart, Clock, Check, Globe, Bookmark, ChevronRight, PieChart, ChevronLeft } from 'lucide-react';
import AuthModal from './AuthModal';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// Datos para multilenguaje
const translations = {
  es: {
    nav: {
      login: "Acceder",
      langButton: "ES"
    },
    hero: {
      badge: "Potenciado por Inteligencia Artificial",
      title1: "Tu asistente de lectura",
      title2: "con traducción instantánea",
      subtitle: "Mejora tu comprensión lectora en diferentes idiomas con traducción en tiempo real impulsada por IA. Sube tus documentos y comienza a leer de forma interactiva.",
      cta: "Comenzar gratis",
      altCta: "Ya tengo cuenta",
      scrollCta: "Descubre más"
    },
    features: {
      title: "Tecnología avanzada de IA",
      subtitle: "Experimenta una nueva forma de leer con tecnología de vanguardia",
      ai: {
        title: "Traducción con IA",
        description: "Traducciones precisas y contextuales usando modelos avanzados de lenguaje"
      },
      instant: {
        title: "Respuesta instantánea",
        description: "Traducciones en tiempo real con solo hacer clic en cualquier palabra"
      },
      comprehension: {
        title: "Comprensión mejorada",
        description: "Mejora tu vocabulario y comprensión con ayuda de la IA"
      },
      multiLang: {
        title: "Múltiples idiomas",
        description: "Aprende inglés, español, francés, alemán, italiano y muchos más"
      }
    },
    howItWorks: {
      title: "Cómo funciona",
      subtitle: "Simplificamos el proceso de aprender mientras lees",
      step1: {
        title: "1. Sube tu documento",
        description: "Importa tus PDFs, artículos o libros en cualquier idioma que quieras leer y comprender mejor"
      },
      step2: {
        title: "2. Interactúa con el texto",
        description: "Toca cualquier palabra o párrafo para obtener traducciones instantáneas con IA"
      },
      step3: {
        title: "3. Aprende y mejora",
        description: "Expande tu vocabulario y mejora tu comprensión lectora con cada texto que leas"
      }
    },
    benefits: {
      title: "Potencia tu aprendizaje de idiomas",
      contextual: {
        title: "Comprensión contextual",
        description: "Entiende las palabras en su contexto real, no solo traducciones aisladas"
      },
      practical: {
        title: "Aprendizaje práctico",
        description: "Aprende idiomas con tus propios materiales, no con ejemplos descontextualizados"
      },
      uninterrupted: {
        title: "Sin interrupciones",
        description: "Lee de forma fluida sin tener que consultar constantemente diccionarios externos"
      },
      accessible: {
        title: "Accesible siempre",
        description: "Accede a tus documentos desde cualquier dispositivo y continúa donde lo dejaste"
      },
      cta: "Prueba Lexingo ahora"
    },
    finalCta: {
      title: "Mejora tu comprensión de idiomas hoy mismo",
      subtitle: "Únete a miles de estudiantes que están mejorando su nivel de idiomas mientras leen sus textos favoritos",
      button: "Comenzar ahora - ¡Es gratis!"
    },
    comparison: {
      title: "Comparativa de soluciones",
      subtitle: "Descubre cómo Lexingo supera a otras alternativas",
      categories: {
        ai: "Profundidad IA Lingüística",
        content: "Personalización Contenido",
        practice: "Enfoque Práctica Activa",
        translation: "Traducción Integrada",
        usability: "Facilidad de Uso",
        community: "Comunidad/Cont. Precargado"
      },
      solutions: {
        lexingo: "Lexingo AI",
        generic: "Chat con PDF Genérico",
        traditional: "Plataforma Aprendizaje Idiomas (Tradicional)"
      },
      interaction: "Interactúa con el gráfico para comparar"
    }
  },
  en: {
    nav: {
      login: "Login",
      langButton: "EN"
    },
    hero: {
      badge: "Powered by Artificial Intelligence",
      title1: "Your reading assistant",
      title2: "with instant translation",
      subtitle: "Improve your reading comprehension in different languages with real-time AI-powered translation. Upload your documents and start reading interactively.",
      cta: "Start for free",
      altCta: "I already have an account",
      scrollCta: "Discover more"
    },
    features: {
      title: "Advanced AI Technology",
      subtitle: "Experience a new way of reading with cutting-edge technology",
      ai: {
        title: "AI Translation",
        description: "Accurate and contextual translations using advanced language models"
      },
      instant: {
        title: "Instant Response",
        description: "Real-time translations with just a click on any word"
      },
      comprehension: {
        title: "Enhanced Comprehension",
        description: "Improve your vocabulary and understanding with AI assistance"
      },
      multiLang: {
        title: "Multiple Languages",
        description: "Learn English, Spanish, French, German, Italian, and many more"
      }
    },
    howItWorks: {
      title: "How It Works",
      subtitle: "We simplify the process of learning while you read",
      step1: {
        title: "1. Upload Your Document",
        description: "Import your PDFs, articles, or books in any language you want to read and better understand"
      },
      step2: {
        title: "2. Interact with the Text",
        description: "Touch any word or paragraph to get instant AI translations"
      },
      step3: {
        title: "3. Learn and Improve",
        description: "Expand your vocabulary and improve your reading comprehension with every text you read"
      }
    },
    benefits: {
      title: "Power Up Your Language Learning",
      contextual: {
        title: "Contextual Understanding",
        description: "Understand words in their real context, not just isolated translations"
      },
      practical: {
        title: "Practical Learning",
        description: "Learn languages with your own materials, not with decontextualized examples"
      },
      uninterrupted: {
        title: "Without Interruptions",
        description: "Read fluently without constantly consulting external dictionaries"
      },
      accessible: {
        title: "Always Accessible",
        description: "Access your documents from any device and continue where you left off"
      },
      cta: "Try Lexingo now"
    },
    finalCta: {
      title: "Improve your language comprehension today",
      subtitle: "Join thousands of students who are improving their language skills while reading their favorite texts",
      button: "Start now - It's free!"
    },
    comparison: {
      title: "Solution Comparison",
      subtitle: "Discover how Lexingo outperforms other alternatives",
      categories: {
        ai: "Linguistic AI Depth",
        content: "Content Personalization",
        practice: "Active Practice Focus",
        translation: "Integrated Translation",
        usability: "Ease of Use",
        community: "Community/Preloaded Content"
      },
      solutions: {
        lexingo: "Lexingo AI",
        generic: "Generic PDF Chat",
        traditional: "Language Learning Platform (Traditional)"
      },
      interaction: "Interact with the chart to compare"
    }
  }
};

export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<'login' | 'register'>('login');
  const [language, setLanguage] = useState('es'); // Idioma por defecto
  const t = translations[language]; // Traducciones según el idioma seleccionado
  const [activeDataset, setActiveDataset] = useState<'all' | 'lexingo' | 'generic' | 'traditional'>('all');

  const openAuthModal = (view: 'login' | 'register') => {
    setAuthModalView(view);
    setIsAuthModalOpen(true);
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'es' ? 'en' : 'es');
  };

  // Configuración del gráfico radar
  const radarData = {
    labels: [
      t.comparison.categories.ai,
      t.comparison.categories.content,
      t.comparison.categories.practice,
      t.comparison.categories.translation, 
      t.comparison.categories.usability,
      t.comparison.categories.community
    ],
    datasets: [
      {
        label: t.comparison.solutions.lexingo,
        data: [9, 8, 8, 9, 10, 6],
        backgroundColor: 'rgba(0, 128, 128, 0.2)',
        borderColor: 'rgba(0, 128, 128, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(0, 128, 128, 1)',
        pointHoverRadius: 6,
        hidden: activeDataset !== 'all' && activeDataset !== 'lexingo',
      },
      {
        label: t.comparison.solutions.generic,
        data: [3, 4, 2, 5, 6, 3],
        backgroundColor: 'rgba(220, 53, 69, 0.2)',
        borderColor: 'rgba(220, 53, 69, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(220, 53, 69, 1)',
        pointHoverRadius: 6,
        hidden: activeDataset !== 'all' && activeDataset !== 'generic',
      },
      {
        label: t.comparison.solutions.traditional,
        data: [5, 3, 6, 4, 7, 8],
        backgroundColor: 'rgba(65, 137, 230, 0.2)',
        borderColor: 'rgba(65, 137, 230, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(65, 137, 230, 1)',
        pointHoverRadius: 6,
        hidden: activeDataset !== 'all' && activeDataset !== 'traditional',
      }
    ]
  };

  const radarOptions = {
    scales: {
      r: {
        angleLines: {
          display: true,
          color: 'rgba(255, 255, 255, 0.15)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        pointLabels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12
          }
        },
        ticks: {
          backdropColor: 'transparent',
          color: 'rgba(255, 255, 255, 0.6)',
          z: 100,
          stepSize: 2,
          max: 10,
          min: 0,
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          padding: 20,
          font: {
            size: 14
          },
          usePointStyle: true,
          boxWidth: 10,
          boxHeight: 10,
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => {
              return {
                text: dataset.label,
                fillStyle: dataset.backgroundColor,
                strokeStyle: dataset.borderColor,
                lineWidth: 2,
                hidden: dataset.hidden,
                index: i
              };
            });
          }
        },
        onClick: (e, legendItem, legend) => {
          const index = legendItem.index;
          const ci = legend.chart;
          
          // Cambia la visibilidad de los datasets
          ci.data.datasets.forEach((dataset, i) => {
            ci.getDatasetMeta(i).hidden = (i !== index);
          });
          
          // Actualiza el gráfico
          ci.update();
          
          // Actualiza el estado
          if (index === 0) setActiveDataset('lexingo');
          else if (index === 1) setActiveDataset('generic');
          else if (index === 2) setActiveDataset('traditional');
        }
      },
      tooltip: {
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        padding: 12,
        boxPadding: 8,
        bodyFont: {
          size: 13
        },
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        cornerRadius: 6,
      }
    },
    maintainAspectRatio: false,
    responsive: true,
  };

  // Función para cambiar la visualización de los datasets
  const toggleDataset = (dataset: 'all' | 'lexingo' | 'generic' | 'traditional') => {
    setActiveDataset(dataset);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      {/* Navigation - Mejorado con efectos futuristas */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-gradient-to-r from-gray-900/80 via-purple-900/70 to-gray-900/80 border-b border-purple-500/30 shadow-lg shadow-purple-900/20">
        <div className="border-b border-purple-500/10"></div> {/* Línea decorativa extra */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-1 flex items-center">
              <img src="/img/lexingo_white.png" alt="Lexingo" className="h-9 relative z-10" />
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleLanguage}
                className="px-3 py-1.5 rounded-full bg-purple-900/40 border border-purple-700/50 text-sm font-medium text-purple-300 hover:bg-purple-800/50 transition-colors flex items-center backdrop-blur-sm hover:shadow-md hover:shadow-purple-800/20"
              >
                <Globe className="h-3.5 w-3.5 mr-1.5" />
                {t.nav.langButton}
              </button>
              <button
                onClick={() => openAuthModal('login')}
                className="px-4 py-2 rounded-md bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white transition-colors shadow-md shadow-purple-900/30 hover:shadow-lg hover:shadow-purple-900/40"
              >
                {t.nav.login}
              </button>
            </div>
          </div>
        </div>
        {/* Efecto de línea brillante en la parte inferior */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
      </nav>
      
      {/* Spacer para compensar el header fijo */}
      <div className="h-16"></div>

      {/* Hero Section */}
      <div className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden">
        {/* Background gradients and effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-gray-900/20 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-900/30 border border-purple-700/30 mb-8 group hover:bg-purple-800/40 transition-colors cursor-default">
              <Sparkles className="h-4 w-4 text-purple-400 mr-2 group-hover:animate-pulse" />
              <span className="text-sm text-purple-300">{t.hero.badge}</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6">
              <span className="block text-white mb-2">{t.hero.title1}</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                {t.hero.title2}
              </span>
            </h1>
            
            <p className="mt-3 max-w-md mx-auto text-lg text-gray-300 sm:text-xl md:mt-5 md:max-w-3xl">
              {t.hero.subtitle}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => openAuthModal('register')}
                className="px-8 py-3 text-base font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 md:py-4 md:text-lg md:px-10 transform transition-all hover:scale-105 shadow-lg hover:shadow-purple-500/20"
              >
                {t.hero.cta}
              </button>
              <button
                onClick={() => openAuthModal('login')}
                className="px-8 py-3 border border-gray-700 text-base font-medium rounded-md text-gray-300 bg-gray-900/50 hover:bg-gray-800 md:py-4 md:text-lg md:px-10 backdrop-blur-sm"
              >
                {t.hero.altCta}
              </button>
            </div>
          </div>
        </div>
        
        {/* Decorative UI elements */}
        <div className="absolute right-0 top-1/3 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 bg-purple-600/5 rounded-full blur-3xl"></div>
        <div className="absolute left-0 bottom-1/3 w-64 h-64 md:w-96 md:h-96 bg-blue-600/5 rounded-full blur-3xl"></div>
      </div>

      {/* Benefits Section - Movida justo después del hero y mejorada visualmente */}
      <div className="py-16 sm:py-20 bg-gradient-to-r from-gray-900 to-gray-950 relative overflow-hidden">
        {/* Efectos decorativos */}
        <div className="absolute inset-0 bg-[url('/img/grid-pattern.png')] bg-repeat opacity-5"></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 leading-tight text-center">
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Potencia tu aprendizaje
              </span>
              <span className="text-white">de idiomas</span>
            </h2>
          </div>
          
          <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-16 items-start">
            {/* Lexingo Reader Demo - Con título claro */}
            <div className="mb-12 lg:mb-0 lg:order-2">
              <h3 className="text-xl font-semibold text-white mb-5 text-center flex items-center justify-center">
                <Book className="w-5 h-5 text-purple-400 mr-2" />
                Lexingo Reader
                <div className="flex ml-3 space-x-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
              </h3>
              
              <div className="max-w-md mx-auto">
                <div className="perspective-1000">
                  <div className="relative rounded-xl overflow-hidden shadow-2xl border border-purple-700/30 transform hover:rotate-y-3 transition-all duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20 mix-blend-overlay"></div>
                    <div className="bg-gray-800/90 backdrop-blur-md p-6 relative border-b border-purple-700/30">
                      <div className="mb-5 p-4 bg-gray-900/70 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-inner relative">
                        <div className="absolute -top-1 -left-1 w-1 h-1 rounded-full bg-purple-500/70 animate-pulse"></div>
                        <div className="absolute -top-1 -right-1 w-1 h-1 rounded-full bg-blue-500/70 animate-pulse"></div>
                        
                        <p className="text-gray-300 text-sm leading-relaxed">
                          The <span className="px-2 py-1 bg-purple-900/80 rounded text-white border border-purple-600/60 cursor-pointer hover:bg-purple-800/80 transition-colors text-xs font-medium">artificial intelligence</span> has transformed how we approach language learning, making it more accessible than ever before.
                        </p>
                        
                        <div className="mt-4 p-3 bg-blue-900/40 rounded-lg border border-blue-700/40 shadow-lg">
                          <div className="flex items-center mb-1">
                            <div className="bg-blue-600/30 rounded-full w-4 h-4 flex items-center justify-center mr-2">
                              <Languages className="w-2 h-2 text-blue-300" />
                            </div>
                            <p className="text-blue-200 text-xs font-medium">Traducción</p>
                          </div>
                          <p className="text-blue-100 text-xs">La inteligencia artificial ha transformado cómo abordamos el aprendizaje de idiomas, haciéndolo más accesible que nunca.</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 bg-purple-900/40 rounded-lg border border-purple-700/40 text-center hover:bg-purple-900/60 transition-colors cursor-pointer">
                          <p className="text-purple-200 text-xs font-medium">Traducción</p>
                        </div>
                        <div className="p-2 bg-gray-700/40 rounded-lg border border-gray-600/40 text-center hover:bg-gray-700/60 transition-colors cursor-pointer">
                          <p className="text-gray-300 text-xs">Definición</p>
                        </div>
                        <div className="p-2 bg-gray-700/40 rounded-lg border border-gray-600/40 text-center hover:bg-gray-700/60 transition-colors cursor-pointer">
                          <p className="text-gray-300 text-xs">Ejemplos</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-b from-gray-800/50 to-gray-900/50 backdrop-blur-md p-3 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <button className="p-1.5 rounded-full bg-gray-700/40 hover:bg-gray-700/60 transition-colors">
                          <ChevronLeft className="h-4 w-4 text-gray-300" />
                        </button>
                        <span className="text-gray-400 text-xs">24/186</span>
                        <button className="p-1.5 rounded-full bg-gray-700/40 hover:bg-gray-700/60 transition-colors">
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-1.5 rounded-full bg-gray-700/40 hover:bg-purple-700/60 transition-colors">
                          <Bookmark className="h-4 w-4 text-gray-300" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Efecto de brillo bajo el lector */}
                <div className="h-1 w-2/3 mx-auto mt-2 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent rounded-full blur-md"></div>
              </div>
            </div>
            
            {/* Beneficios - Versión más compacta */}
            <div className="mb-12 lg:mb-0 lg:order-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-purple-800/30 hover:bg-gray-800/60 hover:border-purple-700/50 transition-all duration-300">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-9 w-9 rounded-full bg-purple-900/40 flex items-center justify-center">
                        <Brain className="h-4 w-4 text-purple-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white mb-1">Comprensión contextual</h3>
                      <p className="text-gray-400 text-sm">
                        Entiende las palabras en su contexto real, no solo traducciones aisladas
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-purple-800/30 hover:bg-gray-800/60 hover:border-purple-700/50 transition-all duration-300">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-9 w-9 rounded-full bg-purple-900/40 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-purple-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white mb-1">Aprendizaje práctico</h3>
                      <p className="text-gray-400 text-sm">
                        Aprende idiomas con tus propios materiales, no con ejemplos descontextualizados
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-purple-800/30 hover:bg-gray-800/60 hover:border-purple-700/50 transition-all duration-300">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-9 w-9 rounded-full bg-purple-900/40 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-purple-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white mb-1">Sin interrupciones</h3>
                      <p className="text-gray-400 text-sm">
                        Lee de forma fluida sin tener que consultar constantemente diccionarios externos
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-purple-800/30 hover:bg-gray-800/60 hover:border-purple-700/50 transition-all duration-300">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-9 w-9 rounded-full bg-purple-900/40 flex items-center justify-center">
                        <Globe className="h-4 w-4 text-purple-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white mb-1">Accesible siempre</h3>
                      <p className="text-gray-400 text-sm">
                        Accede a tus documentos desde cualquier dispositivo y continúa donde lo dejaste
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 text-center sm:text-left">
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl hover:shadow-purple-600/20 transition transform hover:-translate-y-1 flex items-center mx-auto sm:mx-0"
                >
                  <span>Prueba Lexingo ahora</span>
                  <ChevronRight className="h-5 w-5 ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nueva sección: Aprende cualquier idioma con tus documentos preferidos */}
      <div className="py-20 bg-gradient-to-b from-gray-900/90 to-gray-900/70 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/img/grid-pattern.png')] bg-repeat opacity-5"></div>
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="lg:order-2">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-purple-700/30 max-h-[400px]">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-blue-800/30 mix-blend-overlay"></div>
                <img 
                  src="/img/books/the-alchemist.jpg" 
                  alt="Aprende con tus documentos" 
                  className="w-full h-full object-cover object-top"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="flex items-start space-x-4 p-4 bg-gray-800/60 backdrop-blur-md rounded-xl border border-purple-500/20">
                      <div className="mt-1 h-10 w-10 rounded-full bg-purple-600/60 flex items-center justify-center">
                        <Globe className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="flex space-x-2 mb-1">
                          <span className="px-2 py-1 bg-purple-900/60 text-xs font-medium text-purple-200 rounded-full">
                            Inglés
                          </span>
                          <span className="px-2 py-1 bg-blue-900/60 text-xs font-medium text-blue-200 rounded-full">
                            Español
                          </span>
                          <span className="px-2 py-1 bg-indigo-900/60 text-xs font-medium text-indigo-200 rounded-full">
                            Francés
                          </span>
                          <span className="px-2 py-1 bg-teal-900/60 text-xs font-medium text-teal-200 rounded-full">
                            +10 idiomas
                          </span>
                        </div>
                        <h3 className="text-white text-lg font-medium">Traduce al instante mientras lees</h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:order-1">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
                  Aprende cualquier idioma
                </span>
                <span className="text-white">con tus documentos preferidos</span>
              </h2>
              
              <p className="text-gray-300 text-lg mb-8">
                Sube tus PDFs, libros y documentos favoritos a Lexingo y empieza a aprender idiomas de forma natural, mientras lees contenido que realmente te interesa.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-purple-800/30 hover:bg-gray-800/60 hover:border-purple-700/50 transition-all duration-300">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-9 w-9 rounded-full bg-purple-900/40 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-purple-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white mb-1">Sube cualquier documento</h3>
                      <p className="text-gray-400 text-sm">
                        Novelas, artículos científicos, manuales técnicos o cualquier texto que quieras leer.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-purple-800/30 hover:bg-gray-800/60 hover:border-purple-700/50 transition-all duration-300">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-9 w-9 rounded-full bg-purple-900/40 flex items-center justify-center">
                        <Languages className="h-4 w-4 text-purple-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white mb-1">Selecciona para traducir</h3>
                      <p className="text-gray-400 text-sm">
                        Toca cualquier palabra o frase para obtener su traducción instantánea, sin interrumpir tu lectura.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-purple-800/30 hover:bg-gray-800/60 hover:border-purple-700/50 transition-all duration-300">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-9 w-9 rounded-full bg-purple-900/40 flex items-center justify-center">
                        <Brain className="h-4 w-4 text-purple-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white mb-1">IA que aprende contigo</h3>
                      <p className="text-gray-400 text-sm">
                        Nuestro sistema recuerda las palabras que consultas y te ayuda a reforzar tu aprendizaje.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-purple-800/30 hover:bg-gray-800/60 hover:border-purple-700/50 transition-all duration-300">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-9 w-9 rounded-full bg-purple-900/40 flex items-center justify-center">
                        <Bookmark className="h-4 w-4 text-purple-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white mb-1">Biblioteca personal</h3>
                      <p className="text-gray-400 text-sm">
                        Guarda todos tus documentos en la nube y accede a ellos desde cualquier dispositivo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center sm:text-left">
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium shadow-lg shadow-purple-900/20 hover:shadow-xl hover:shadow-purple-900/30 transition-all transform hover:-translate-y-1"
                >
                  Empieza a aprender ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/0 via-purple-900/5 to-gray-900/0 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold sm:text-4xl bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              {t.features.title}
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-400">
              {t.features.subtitle}
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {/* Feature 1 */}
              <div className="relative group cursor-pointer transition-all duration-300 transform hover:scale-105">
                <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 opacity-25 group-hover:opacity-70 transition-opacity blur"></div>
                <div className="relative p-6 bg-gray-900 rounded-lg border border-gray-800 h-full shadow-lg">
                  <div className="flex items-center justify-center w-14 h-14 bg-purple-900/30 rounded-full mb-4 group-hover:bg-purple-800/60 transition-colors">
                    <Brain className="h-7 w-7 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {t.features.ai.title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {t.features.ai.description}
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="relative group cursor-pointer transition-all duration-300 transform hover:scale-105">
                <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 opacity-25 group-hover:opacity-70 transition-opacity blur"></div>
                <div className="relative p-6 bg-gray-900 rounded-lg border border-gray-800 h-full shadow-lg">
                  <div className="flex items-center justify-center w-14 h-14 bg-purple-900/30 rounded-full mb-4 group-hover:bg-purple-800/60 transition-colors">
                    <Zap className="h-7 w-7 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {t.features.instant.title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {t.features.instant.description}
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="relative group cursor-pointer transition-all duration-300 transform hover:scale-105">
                <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 opacity-25 group-hover:opacity-70 transition-opacity blur"></div>
                <div className="relative p-6 bg-gray-900 rounded-lg border border-gray-800 h-full shadow-lg">
                  <div className="flex items-center justify-center w-14 h-14 bg-purple-900/30 rounded-full mb-4 group-hover:bg-purple-800/60 transition-colors">
                    <Languages className="h-7 w-7 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {t.features.comprehension.title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {t.features.comprehension.description}
                  </p>
                </div>
              </div>
              
              {/* Feature 4 */}
              <div className="relative group cursor-pointer transition-all duration-300 transform hover:scale-105">
                <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 opacity-25 group-hover:opacity-70 transition-opacity blur"></div>
                <div className="relative p-6 bg-gray-900 rounded-lg border border-gray-800 h-full shadow-lg">
                  <div className="flex items-center justify-center w-14 h-14 bg-purple-900/30 rounded-full mb-4 group-hover:bg-purple-800/60 transition-colors">
                    <Bookmark className="h-7 w-7 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {t.features.multiLang.title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {t.features.multiLang.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de Comparativa (Nueva) */}
      <div className="py-24 bg-gradient-to-b from-gray-900/70 via-purple-900/10 to-gray-900/70 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/img/grid-pattern.png')] bg-repeat opacity-5"></div>
        
        {/* Efectos decorativos */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold sm:text-4xl bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
              {t.comparison.title}
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-gray-400">
              {t.comparison.subtitle}
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-gray-900/60 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-purple-700/30 shadow-xl h-[450px] sm:h-[500px] hover:border-purple-600/60 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-blue-900/10 rounded-xl"></div>
              <Radar data={radarData} options={radarOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 bg-gradient-to-b from-gray-900/50 via-purple-900/10 to-gray-900/50 relative">
        <div className="absolute inset-0 bg-[url('/img/grid-pattern.png')] bg-repeat opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold sm:text-4xl text-white">
              {t.howItWorks.title} <span className="text-purple-400">Lexingo</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-400">
              {t.howItWorks.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mb-6 group-hover:bg-purple-800/40 transition-colors">
                <BookText className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">{t.howItWorks.step1.title}</h3>
              <p className="text-gray-400">
                {t.howItWorks.step1.description}
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mb-6 group-hover:bg-purple-800/40 transition-colors">
                <Languages className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">{t.howItWorks.step2.title}</h3>
              <p className="text-gray-400">
                {t.howItWorks.step2.description}
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mb-6 group-hover:bg-purple-800/40 transition-colors">
                <GraduationCap className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">{t.howItWorks.step3.title}</h3>
              <p className="text-gray-400">
                {t.howItWorks.step3.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 py-20 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl font-extrabold text-white mb-6">
            {t.finalCta.title}
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-gray-300 mb-10">
            {t.finalCta.subtitle}
          </p>
          <button
            onClick={() => openAuthModal('register')}
            className="px-8 py-4 text-base font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 md:text-lg md:px-10 transform transition-all hover:scale-105 shadow-xl hover:shadow-purple-500/30"
          >
            {t.finalCta.button}
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