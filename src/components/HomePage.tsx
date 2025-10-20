import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, ChevronLeft, ChevronRight, Clock, Award, BookOpen, Globe, Bookmark, LanguagesIcon, Brain, Languages, Share2, Star, Users, MessageSquare, Zap, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBookContext } from '../context/BookContext';
import * as pdfjsLib from 'pdfjs-dist';
import BookCover from './BookCover';

// Inicializar PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

// Tipos para TypeScript
type LanguageCode = 'es' | 'en';

interface CommunityBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  filename: string;
  totalPages: number;
}

interface UserBook {
  id: string;
  title: string;
  user_id: string;
  cover_url: string;
  total_pages: number;
  current_page: number;
  content: string;
  created_at: string;
  last_read: string;
  bookmarked?: boolean;
  bookmark_page?: number;
  bookmark_position?: number;
  bookmark_updated_at?: string;
}

interface TestimonialUser {
  name: string;
  role: string;
  text: string;
  stars: number;
}

// Datos para el multilenguaje
const translations = {
  es: {
    nav: {
      logout: "Cerrar sesión"
    },
    hero: {
      title: "Aprende idiomas mientras lees lo que te apasiona",
      subtitle: "Olvídate de las tediosas clases de idiomas. Con Lexingo, mejora tu vocabulario leyendo libros que realmente te interesan.",
      cta: "Comenzar ahora",
      secondaryCta: "Ver demostración"
    },
    features: {
      title: "Características que transformarán tu aprendizaje",
      translate: {
        title: "Traducción instantánea",
        description: "Selecciona cualquier palabra o frase y obtén su traducción al instante en tu idioma."
      },
      reading: {
        title: "Lectura inmersiva",
        description: "Sumérgete en historias fascinantes mientras aprendes vocabulario nuevo de forma natural."
      },
      vocabulary: {
        title: "Vocabulario personalizado",
        description: "Guarda las palabras que estás aprendiendo y repásalas cuando quieras."
      },
      multiLang: {
        title: "Múltiples idiomas",
        description: "Aprende inglés, español, francés, alemán, italiano y muchos más."
      }
    },
    comparison: {
      title: "¿Por qué elegir Lexingo?",
      subtitle: "Comparativa con otras plataformas de aprendizaje",
      lexingo: "Lexingo",
      traditional: "Apps tradicionales",
      duolingo: "Duolingo",
      other: "Otras apps",
      features: {
        context: "Aprendizaje en contexto real",
        personalized: "Contenido personalizado",
        natural: "Adquisición natural",
        practical: "Vocabulario práctico",
        fun: "Diversión garantizada"
      }
    },
    testimonials: {
      title: "Lo que dicen nuestros usuarios",
      subtitle: "Descubre cómo Lexingo está transformando el aprendizaje de idiomas",
      users: [
        {
          name: "María Rodríguez",
          role: "Estudiante de francés",
          text: "Lexingo ha revolucionado mi forma de aprender. Ahora disfruto leyendo libros en francés y aprendiendo vocabulario de forma natural.",
          stars: 5
        },
        {
          name: "Carlos Mendoza",
          role: "Profesional",
          text: "Necesitaba mejorar mi inglés técnico y Lexingo me ha permitido leer documentación en inglés sin interrupciones constantes.",
          stars: 5
        },
        {
          name: "Ana León",
          role: "Viajera frecuente",
          text: "Con Lexingo he aprendido vocabulario relevante para mis viajes leyendo guías de viaje en el idioma original.",
          stars: 4
        }
      ]
    },
    community: {
      title: "Biblioteca compartida",
      description: "Explora libros seleccionados por nuestra comunidad para todos los niveles."
    },
    recent: {
      title: "Continúa leyendo",
      description: "Retoma tus lecturas donde las dejaste.",
      empty: "Aún no has empezado ningún libro. ¡Comienza a leer ahora!"
    },
    languages: {
      title: "Selecciona tu idioma"
    }
  },
  en: {
    nav: {
      logout: "Sign out"
    },
    hero: {
      title: "Learn languages while reading what you love",
      subtitle: "Forget about tedious language classes. With Lexingo, improve your vocabulary by reading books that truly interest you.",
      cta: "Get started",
      secondaryCta: "Watch demo"
    },
    features: {
      title: "Features that will transform your learning",
      translate: {
        title: "Instant translation",
        description: "Select any word or phrase and get its translation instantly in your language."
      },
      reading: {
        title: "Immersive reading",
        description: "Immerse yourself in fascinating stories while naturally learning new vocabulary."
      },
      vocabulary: {
        title: "Personalized vocabulary",
        description: "Save the words you're learning and review them whenever you want."
      },
      multiLang: {
        title: "Multiple languages",
        description: "Learn English, Spanish, French, German, Italian, and many more."
      }
    },
    comparison: {
      title: "Why choose Lexingo?",
      subtitle: "Comparison with other learning platforms",
      lexingo: "Lexingo",
      traditional: "Traditional apps",
      duolingo: "Duolingo",
      other: "Other apps",
      features: {
        context: "Learning in real context",
        personalized: "Personalized content",
        natural: "Natural acquisition",
        practical: "Practical vocabulary",
        fun: "Guaranteed fun"
      }
    },
    testimonials: {
      title: "What our users say",
      subtitle: "Discover how Lexingo is transforming language learning",
      users: [
        {
          name: "Maria Rodriguez",
          role: "French student",
          text: "Lexingo has revolutionized my way of learning. Now I enjoy reading books in French and learning vocabulary naturally.",
          stars: 5
        },
        {
          name: "Carlos Mendoza",
          role: "Professional",
          text: "I needed to improve my technical English and Lexingo has allowed me to read documentation in English without constant interruptions.",
          stars: 5
        },
        {
          name: "Ana Leon",
          role: "Frequent traveler",
          text: "With Lexingo I've learned relevant vocabulary for my travels by reading travel guides in the original language.",
          stars: 4
        }
      ]
    },
    community: {
      title: "Shared library",
      description: "Explore books curated by our community for all levels."
    },
    recent: {
      title: "Continue reading",
      description: "Pick up your readings where you left off.",
      empty: "You haven't started any books yet. Start reading now!"
    },
    languages: {
      title: "Select your language"
    }
  }
} as const;

export default function HomePage() {
  const [recentBooks, setRecentBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<LanguageCode>('es');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const t = translations[language];
  
  const [communityBooks] = useState<CommunityBook[]>([
    {
      id: 'comm4',
      title: 'The Alchemist',
      author: 'Paulo Coelho',
      cover: '/img/books/the-alchemist.jpg',
      filename: 'the-alchemist.pdf',
      totalPages: 189
    },
    {
      id: 'comm3',
      title: 'The Adventures of Sherlock Holmes',
      author: 'Arthur Conan Doyle',
      cover: '/img/books/the-adventures-of-sherlock-holmes.jpg',
      filename: 'the-adventures-of-sherlock-holmes.pdf',
      totalPages: 307
    },
    {
      id: 'comm1',
      title: 'Natural Remedies',
      author: 'Barbara O\'Neill',
      cover: '/img/books/barbara-oneill-natural-remedies.jpg',
      filename: 'barbara-oneill-natural-remedies.pdf',
      totalPages: 186
    },
    {
      id: 'comm2',
      title: 'Rich Dad\'s Retirement Lie',
      author: 'Robert Kiyosaki',
      cover: '/img/books/robert-kiyosaki-rich-dad-49-retirement.jpg',
      filename: 'robert-kiyosaki-rich-dad-49-retirement.pdf',
      totalPages: 215
    }
  ]);
  const navigate = useNavigate();
  const { setBook, loadBookAndSkipEmptyPages } = useBookContext();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecentBooks();
    }
  }, [isAuthenticated]);

  // Verificar estado de autenticación
  const checkAuthStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUser(user);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Función para calcular tiempo transcurrido desde la última lectura
  const getTimeAgo = (lastRead: string) => {
    const now = new Date();
    const lastReadDate = new Date(lastRead);
    const diffInMs = now.getTime() - lastReadDate.getTime();
    
    const minutes = Math.floor(diffInMs / (1000 * 60));
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'hace un momento';
    if (minutes < 60) return `hace ${minutes} min`;
    if (hours < 24) return `hace ${hours}h`;
    if (days < 7) return `hace ${days}d`;
    return lastReadDate.toLocaleDateString();
  };

  // Cerrar sesión
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setRecentBooks([]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Cambiar al siguiente slide
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === communityBooks.length - 1 ? 0 : prev + 1));
  };

  // Cambiar al slide anterior
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? communityBooks.length - 1 : prev - 1));
  };

  // Cambiar idioma
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'es' ? 'en' : 'es');
  };

  const fetchRecentBooks = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('last_read', { ascending: false });

      if (error) throw error;
      setRecentBooks(data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const handleOpenBook = async (book: UserBook) => {
    try {
      setLoading(true);
      console.log(`Abriendo libro: ${book.title}, página guardada: ${book.current_page}`);
      
      let currentPage = book.current_page || 1;
      
      if (currentPage > book.total_pages) {
        console.log(`La página guardada ${currentPage} excede el total (${book.total_pages}), reseteando a 1`);
        currentPage = 1;
      }
      
      try {
        const bookContent = JSON.parse(book.content);
        console.log(`Libro cargado: ${book.title} con ${bookContent.length} páginas`);
        
        const bookData = {
          id: book.id,
          title: book.title,
          pages: bookContent,
          currentPage: currentPage,
          totalPages: book.total_pages,
          coverUrl: book.cover_url,
          lastRead: book.last_read,
          bookmarked: book.bookmarked,
          bookmark_page: book.bookmark_page,
          bookmark_position: book.bookmark_position,
          bookmark_updated_at: book.bookmark_updated_at
        };
        
        loadBookAndSkipEmptyPages(bookData);
        
        setTimeout(() => {
          console.log('Navegando a la página del lector');
          navigate('/reader');
        }, 300);
      } catch (parseError) {
        console.error('Error al parsear el contenido del libro:', parseError);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error al abrir el libro:', error);
      setLoading(false);
    }
  };

  // Función para generar un UUID v4 válido
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Función para procesar un PDF y extraer su contenido
  const processPDF = async (pdfPath: string, totalPages: number): Promise<any[]> => {
    try {
      console.log(`Procesando PDF: ${pdfPath}`);
      
      const loadingTask = pdfjsLib.getDocument(pdfPath);
      const pdf = await loadingTask.promise;
      
      const pdfTotalPages = pdf.numPages;
      console.log(`PDF cargado con ${pdfTotalPages} páginas (esperadas: ${totalPages})`);
      
      const pages = [];
      
      for (let i = 1; i <= pdfTotalPages; i++) {
        try {
          console.log(`Extrayendo texto de la página ${i}`);
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .map((item: any) => 'str' in item ? item.str : '')
            .join(' ');
          
          pages.push({
            content: pageText.trim() || `[Página ${i} sin texto extraíble]`
          });
        } catch (pageError) {
          console.error(`Error procesando página ${i}:`, pageError);
          pages.push({
            content: `[Error al procesar la página ${i}]`
          });
        }
      }
      
      if (pdfTotalPages < totalPages) {
        for (let i = pdfTotalPages + 1; i <= totalPages; i++) {
          pages.push({
            content: `[Página ${i} (no existe en el PDF)]`
          });
        }
      }
      
      return pages;
    } catch (error) {
      console.error('Error procesando PDF:', error);
      
      return Array.from({ length: totalPages }, (_, i) => ({
        content: `Error al cargar el PDF. Página ${i+1} de ${totalPages}.`
      }));
    }
  };

  const handleOpenCommunityBook = async (book: CommunityBook) => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log(`Abriendo libro comunitario: ${book.title}`);
      
      const { data: existingBooks, error: queryError } = await supabase
        .from('books')
        .select('*')
        .eq('title', book.title)
        .eq('user_id', user.id);
      
      if (queryError) {
        console.error('Error al buscar libros existentes:', queryError);
        setLoading(false);
        return;
      }
      
      if (existingBooks && existingBooks.length > 0) {
        console.log('El libro ya existe en la biblioteca del usuario, cargándolo...');
        handleOpenBook(existingBooks[0]);
      } else {
        console.log('El libro no existe en la biblioteca del usuario, creándolo...');
        
        const pdfPath = `/books/${book.filename}`;
        console.log(`Ruta del PDF: ${pdfPath}`);
        
        console.log('Procesando PDF para extraer contenido real...');
        const pdfPages = await processPDF(pdfPath, book.totalPages);
        console.log(`PDF procesado. Se extrajeron ${pdfPages.length} páginas`);
        
        if (!pdfPages || pdfPages.length === 0) {
          console.error('No se pudo extraer contenido del PDF');
          setLoading(false);
          return;
        }
        
        const bookId = generateUUID();
        console.log(`ID UUID generado para el libro: ${bookId}`);
        
        const newBook = {
          id: bookId,
          title: book.title,
          user_id: user.id,
          cover_url: book.cover,
          total_pages: pdfPages.length,
          current_page: 1,
          content: JSON.stringify(pdfPages),
          created_at: new Date().toISOString(),
          last_read: new Date().toISOString()
        };
        
        console.log('Insertando libro en la base de datos:', newBook.title);
        
        const { data: insertedBook, error: insertError } = await supabase
          .from('books')
          .insert(newBook)
          .select();
          
        if (insertError) {
          console.error('Error al guardar el libro comunitario:', insertError);
          setLoading(false);
          return;
        }
        
        console.log('Libro guardado correctamente en la base de datos, ID:', insertedBook[0]?.id);
        
        const bookData = {
          id: bookId,
          title: book.title,
          pages: pdfPages,
          currentPage: 1,
          totalPages: pdfPages.length,
          coverUrl: book.cover,
          lastRead: new Date().toISOString(),
          bookmarked: false
        };
        
        console.log('Cargando libro en el contexto:', bookData.title);
        loadBookAndSkipEmptyPages(bookData);
        
        console.log('Actualizando lista de libros recientes');
        fetchRecentBooks();
      }
      
      setTimeout(() => {
        console.log('Navegando a la página del lector');
        navigate('/reader');
      }, 500);
    } catch (error) {
      console.error('Error al abrir libro comunitario:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras se verifica la autenticación
  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Vista para usuarios autenticados (simplificada)
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {/* Lecturas Recientes */}
          <section className="py-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t.recent.title}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {t.recent.description}
              </p>
            </div>
            
            {recentBooks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {recentBooks.map((book) => (
                  <div
                    key={book.id}
                    className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition cursor-pointer"
                    onClick={() => handleOpenBook(book)}
                  >
                    <div className="aspect-[3/4] relative">
                      <BookCover
                        src={book.cover_url || '/img/books/default-cover.jpg'}
                        title={book.title}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                        <div className="p-4 text-white w-full">
                          <h3 className="font-bold text-lg line-clamp-2 mb-1">{book.title}</h3>
                          <div className="flex items-center text-sm opacity-90 mb-2">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>
                              {getTimeAgo(book.last_read)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200/30 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${Math.round((book.current_page / book.total_pages) * 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-right mt-1 opacity-75">
                            {book.current_page} / {book.total_pages}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-lg">
                <Book className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t.recent.empty}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Explora nuestra biblioteca comunitaria para comenzar
                </p>
              </div>
            )}
          </section>

          {/* Biblioteca Comunitaria */}
          <section className="py-8 border-t border-gray-100 dark:border-gray-800">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {t.community.title}
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  {t.community.description}
                </p>
              </div>
              <div className="flex space-x-2 mt-4 md:mt-0">
                <button
                  onClick={prevSlide}
                  className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
                <button 
                  onClick={nextSlide}
                  className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {communityBooks.map((book, index) => (
                <div 
                  key={book.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition duration-300 cursor-pointer ${
                    index === currentSlide ? 'ring-2 ring-blue-400' : ''
                  }`}
                  onClick={() => handleOpenCommunityBook(book)}
                >
                  <div className="aspect-[3/4] relative">
                    <BookCover
                      src={book.cover}
                      title={book.title}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                      <div className="p-4 text-white w-full">
                        <h3 className="font-bold text-lg line-clamp-2 mb-1">{book.title}</h3>
                        <p className="text-sm opacity-90 mb-2">{book.author}</p>
                        <div className="flex items-center justify-between text-xs opacity-75">
                          <span>{book.totalPages} páginas</span>
                          <span className="bg-blue-500/80 px-2 py-1 rounded">Nuevo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* Footer completo */}
        <footer className="bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
              {/* Información de la empresa */}
              <div className="lg:col-span-2">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-3xl font-bold text-blue-400">Lexingo</span>
                  <span className="text-blue-300">|</span>
                  <span className="text-gray-300">Aprende idiomas leyendo</span>
                </div>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Revoluciona tu aprendizaje de idiomas con nuestra plataforma innovadora. 
                  Lee libros que te apasionan mientras aprendes vocabulario de forma natural y contextual.
                </p>
                <div className="flex space-x-4">
                  <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 2.567-1.645 0-2.617-1.02-4.626-2.793-4.626z"/>
                    </svg>
                  </a>
                </div>
              </div>

              {/* Producto */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-white">Producto</h3>
                <ul className="space-y-3">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Características</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Planes y Precios</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Aplicación Móvil</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Integración API</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Actualizaciones</a></li>
                </ul>
              </div>

              {/* Recursos */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-white">Recursos</h3>
                <ul className="space-y-3">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Centro de Ayuda</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Guías y Tutoriales</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Comunidad</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Webinarios</a></li>
                </ul>
              </div>

              {/* Empresa */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-white">Empresa</h3>
                <ul className="space-y-3">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Sobre Nosotros</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Equipo</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Carreras</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Prensa</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contacto</a></li>
                </ul>
              </div>
            </div>

            {/* Sección de newsletter */}
            <div className="border-t border-gray-800 mt-12 pt-8">
              <div className="flex flex-col lg:flex-row justify-between items-center">
                <div className="mb-6 lg:mb-0">
                  <h3 className="text-xl font-semibold mb-2">Mantente actualizado</h3>
                  <p className="text-gray-400">Recibe las últimas noticias y tips de aprendizaje directamente en tu correo.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <input
                    type="email"
                    placeholder="Tu email"
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                  />
                  <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap">
                    Suscribirse
                  </button>
                </div>
              </div>
            </div>

            {/* Selector de idioma y enlaces legales */}
            <div className="border-t border-gray-800 mt-8 pt-8">
              <div className="flex flex-col lg:flex-row justify-between items-center">
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6 lg:mb-0">
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-400 text-sm">Idioma:</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setLanguage('es')}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          language === 'es' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        Español
                      </button>
                      <button
                        onClick={() => setLanguage('en')}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          language === 'en' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        English
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap justify-center lg:justify-end items-center space-x-6 text-sm">
                  <a href="/terms" className="text-gray-400 hover:text-white transition-colors">
                    Términos de Servicio
                  </a>
                  <a href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                    Política de Privacidad
                  </a>
                  <a href="/cookies" className="text-gray-400 hover:text-white transition-colors">
                    Política de Cookies
                  </a>
                  <a href="/dmca" className="text-gray-400 hover:text-white transition-colors">
                    DMCA
                  </a>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-gray-800 mt-8 pt-6 text-center">
              <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-400">
                <p>© {new Date().getFullYear()} Lexingo. Todos los derechos reservados.</p>
                <p className="mt-2 sm:mt-0">
                  Hecho con ❤️ para estudiantes de idiomas en todo el mundo
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Vista para usuarios no autenticados (landing completo)
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Barra de navegación con selector de idioma */}
      <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">Lexingo</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleLanguage}
                className="flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 text-sm font-medium"
              >
                <Globe className="h-4 w-4 mr-1" />
                {language === 'es' ? 'ESP' : 'ENG'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Sección Hero */}
        <section className="py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fadeIn">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                {t.hero.title}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                {t.hero.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
                  {t.hero.cta}
                </button>
                <button className="px-8 py-4 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-medium rounded-lg shadow hover:shadow-md transition">
                  {t.hero.secondaryCta}
                </button>
              </div>
            </div>
            <div className="relative h-[400px] lg:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/img/books/the-alchemist.jpg"
                alt="Lexingo App"
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 to-purple-600/80">
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <div className="bg-white/20 backdrop-blur-md rounded-xl p-6 shadow-lg">
                    <div className="flex items-start space-x-4">
                      <span className="text-5xl font-bold">👆</span>
                      <div>
                        <h3 className="text-xl font-semibold">Translate with a tap</h3>
                        <p className="opacity-90">Instantly understand any word or phrase</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Características principales */}
        <section className="py-16 border-t border-gray-100 dark:border-gray-800">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-16">
            {t.features.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                <Languages className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t.features.translate.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t.features.translate.description}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t.features.reading.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t.features.reading.description}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                <Bookmark className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t.features.vocabulary.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t.features.vocabulary.description}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                <LanguagesIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t.features.multiLang.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t.features.multiLang.description}
              </p>
            </div>
          </div>
        </section>

        {/* Lexingo Reader y Beneficios */}
        <section className="py-16 border-t border-gray-100 dark:border-gray-800">
          {/* Título principal */}
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Potencia tu aprendizaje de idiomas
          </h2>

          {/* PARTE 1: Lexingo Reader - Siempre primero en móvil */}
          <div className="mb-16">
            <h3 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-6 flex items-center justify-center">
              <Book className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
              Lexingo Reader
              <div className="flex ml-3 space-x-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
            </h3>
            
            <div className="max-w-2xl mx-auto">
              <div className="relative rounded-xl overflow-hidden shadow-2xl border border-blue-700/30">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 mix-blend-overlay"></div>
                <div className="bg-gray-800/90 backdrop-blur-md p-6 relative border-b border-blue-700/30">
                  <div className="mb-5 p-4 bg-gray-900/70 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-inner relative">
                    <div className="absolute -top-1 -left-1 w-1 h-1 rounded-full bg-blue-500/70 animate-pulse"></div>
                    <div className="absolute -top-1 -right-1 w-1 h-1 rounded-full bg-purple-500/70 animate-pulse"></div>
                    
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
              
              {/* Efecto de brillo bajo el lector */}
              <div className="h-1 w-2/3 mx-auto mt-2 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent rounded-full blur-md"></div>
            </div>
          </div>

          {/* PARTE 2: Beneficios - Siempre después del Reader */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-8">
              Características principales
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg hover:shadow-xl transition">
                <div className="flex items-start">
                  <div className="mr-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Comprensión contextual</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Entiende las palabras en su contexto real, no solo traducciones aisladas
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg hover:shadow-xl transition">
                <div className="flex items-start">
                  <div className="mr-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aprendizaje práctico</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Aprende idiomas con tus propios materiales, no con ejemplos descontextualizados
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg hover:shadow-xl transition">
                <div className="flex items-start">
                  <div className="mr-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Sin interrupciones</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Lee de forma fluida sin tener que consultar constantemente diccionarios externos
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg hover:shadow-xl transition">
                <div className="flex items-start">
                  <div className="mr-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Accesible siempre</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Accede a tus documentos desde cualquier dispositivo y continúa donde lo dejaste
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* PARTE 3: Botón CTA - Siempre al final */}
          <div className="text-center">
            <button
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition transform hover:-translate-y-1"
            >
              Prueba Lexingo ahora
            </button>
          </div>
        </section>

        {/* Comparativa con competidores */}
        <section className="py-16 border-t border-gray-100 dark:border-gray-800">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t.comparison.title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {t.comparison.subtitle}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="py-4 px-6 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"></th>
                    <th className="py-4 px-6 text-center text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <span className="flex flex-col items-center">
                        <span className="text-blue-600 dark:text-blue-400 text-base font-bold">{t.comparison.lexingo}</span>
                        <span className="mt-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs px-2 py-1 rounded-full">Recomendado</span>
                      </span>
                    </th>
                    <th className="py-4 px-6 text-center text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t.comparison.duolingo}</th>
                    <th className="py-4 px-6 text-center text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t.comparison.other}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">{t.comparison.features.context}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">{t.comparison.features.personalized}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">{t.comparison.features.natural}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">{t.comparison.features.practical}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">{t.comparison.features.fun}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Testimonios de usuarios */}
        <section className="py-16 border-t border-gray-100 dark:border-gray-800">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t.testimonials.title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {t.testimonials.subtitle}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.testimonials.users.map((user: TestimonialUser, index: number) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{user.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.role}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < user.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} 
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 italic">"{user.text}"</p>
                </div>
                
                <div className="flex justify-end">
                  <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    <span>Ver historia completa</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Biblioteca Comunitaria */}
        <section className="py-16 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t.community.title}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {t.community.description}
              </p>
            </div>
            <div className="flex space-x-2 mt-4 md:mt-0">
              <button
                onClick={prevSlide}
                className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <button 
                onClick={nextSlide}
                className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {communityBooks.map((book, index) => (
                <div 
                key={book.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition duration-300 transform ${
                    index === currentSlide ? 'md:scale-105 ring-2 ring-blue-400' : ''
                  }`}
                onClick={() => handleOpenCommunityBook(book)}
              >
                  <div className="relative aspect-[2/3]">
                  <BookCover
                    src={book.cover}
                    title={book.title}
                    alt={book.title}
                      className="w-full h-full object-cover"
                  />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                      <div className="p-4 text-white">
                        <h3 className="font-bold text-lg line-clamp-2">{book.title}</h3>
                        <p className="text-sm opacity-90">{book.author}</p>
                </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer con selector de idiomas */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lexingo</h3>
              <p className="text-gray-600 dark:text-gray-400">
                La forma moderna de aprender idiomas mediante la lectura.
                  </p>
                </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t.languages.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setLanguage('es')}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    language === 'es' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  Español
              </button>
                <button 
                  onClick={() => setLanguage('en')}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    language === 'en' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  English
                </button>
          </div>
        </div>
      </div>
          <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              © {new Date().getFullYear()} Lexingo. Todos los derechos reservados.
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                <span className="sr-only">GitHub</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}