import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, ChevronLeft, ChevronRight, Clock, Award, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBookContext } from '../context/BookContext';
import * as pdfjsLib from 'pdfjs-dist';

// Inicializar PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export default function HomePage() {
  const [recentBooks, setRecentBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [communityBooks, setCommunityBooks] = useState([
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
    fetchRecentBooks();
  }, []);

  const fetchRecentBooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('last_read', { ascending: false });

      if (error) throw error;
      setRecentBooks(data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBook = async (book) => {
    try {
      // Indicar que estamos cargando
      setLoading(true);
      console.log(`Abriendo libro: ${book.title}, página guardada: ${book.current_page}`);
      
      // Verificar que la página actual es válida
      let currentPage = book.current_page || 1;
      
      // Asegurarnos de que la página está dentro del rango válido
      if (currentPage > book.total_pages) {
        console.log(`La página guardada ${currentPage} excede el total (${book.total_pages}), reseteando a 1`);
        currentPage = 1;
      }
      
      // Limpiar el libro actual antes de cargar el nuevo
      setBook(null);
      
      // Construir los datos del libro
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
        
        // Cargar el libro
        loadBookAndSkipEmptyPages(bookData);
        
        // Esperar un momento antes de navegar
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
      
      // Cargar el PDF desde la URL pública
      const loadingTask = pdfjsLib.getDocument(pdfPath);
      const pdf = await loadingTask.promise;
      
      // Verificar que el número de páginas coincida
      const pdfTotalPages = pdf.numPages;
      console.log(`PDF cargado con ${pdfTotalPages} páginas (esperadas: ${totalPages})`);
      
      // Crear un array para almacenar el contenido de las páginas
      const pages = [];
      
      // Procesar cada página
      for (let i = 1; i <= pdfTotalPages; i++) {
        try {
          console.log(`Extrayendo texto de la página ${i}`);
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Extraer el texto
          const pageText = textContent.items
            .map((item: any) => 'str' in item ? item.str : '')
            .join(' ');
          
          // Añadir la página al array
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
      
      // Si el PDF tiene menos páginas que las esperadas, añadir páginas vacías
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
      
      // En caso de error, devolver páginas con mensajes de error
      return Array.from({ length: totalPages }, (_, i) => ({
        content: `Error al cargar el PDF. Página ${i+1} de ${totalPages}.`
      }));
    }
  };

  const handleOpenCommunityBook = async (book) => {
    try {
      // Mostramos una animación de carga
      setLoading(true);
      console.log(`Abriendo libro comunitario: ${book.title}`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No hay usuario autenticado');
        setLoading(false);
        return;
      }
      
      // Verificamos si ya existe este libro en la biblioteca del usuario
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
        // Si ya existe, cargamos ese libro
        console.log('El libro ya existe en la biblioteca del usuario, cargándolo...');
        handleOpenBook(existingBooks[0]);
      } else {
        console.log('El libro no existe en la biblioteca del usuario, creándolo...');
        
        // Construir la ruta completa al PDF
        const pdfPath = `/books/${book.filename}`;
        console.log(`Ruta del PDF: ${pdfPath}`);
        
        // Procesar el PDF para extraer el contenido real
        console.log('Procesando PDF para extraer contenido real...');
        const pdfPages = await processPDF(pdfPath, book.totalPages);
        console.log(`PDF procesado. Se extrajeron ${pdfPages.length} páginas`);
        
        // Verificar que se obtuvo contenido
        if (!pdfPages || pdfPages.length === 0) {
          console.error('No se pudo extraer contenido del PDF');
          setLoading(false);
          return;
        }
        
        // Generamos un UUID válido para el ID del libro
        const bookId = generateUUID();
        console.log(`ID UUID generado para el libro: ${bookId}`);
        
        // Creamos el registro en la base de datos
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
        
        // Insertar en la base de datos
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
        
        // Limpiar el libro actual antes de cargar el nuevo
        setBook(null);
        
        // Cargar este libro para lectura
        const bookData = {
          id: bookId, // Asegurarnos de usar el mismo UUID
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
        
        // Actualizamos la lista de libros recientes
        console.log('Actualizando lista de libros recientes');
        fetchRecentBooks();
      }
      
      // Esperamos un momento para asegurar que el libro se ha cargado correctamente
      setTimeout(() => {
        // Navegamos al lector
        console.log('Navegando a la página del lector');
        navigate('/reader');
      }, 500);
    } catch (error) {
      console.error('Error al abrir libro comunitario:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">
            Bienvenido a{' '}
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              Lexingo
            </span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Tu asistente de lectura con traducción instantánea
          </p>
        </div>

        {/* Recent Books Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-purple-500" />
              <h2 className="text-lg font-medium text-white">
                Continuar leyendo
              </h2>
            </div>
            {recentBooks.length > 0 && (
              <button
                onClick={() => navigate('/books')}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                Ver todos
              </button>
            )}
          </div>

          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : recentBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentBooks.slice(0, 4).map((book) => (
                <button
                  key={book.id}
                  onClick={() => handleOpenBook(book)}
                  className="bg-gray-800 rounded-lg overflow-hidden group text-left w-full hover:ring-2 hover:ring-purple-500/50 transition-all duration-300"
                >
                  <div className="aspect-[3/4] h-[180px] relative overflow-hidden">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                        <Book className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Progress Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                      <div className="flex justify-between text-xs text-white mb-1">
                        <span>{Math.round((book.current_page / book.total_pages) * 100)}%</span>
                      </div>
                      <div className="bg-gray-600/50 rounded-full h-1">
                        <div 
                          className="bg-purple-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${(book.current_page / book.total_pages) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <h3 className="font-medium text-white text-sm mb-1 line-clamp-1">
                      {book.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Página {book.current_page} de {book.total_pages}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-800 rounded-lg">
              <Book className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400">
                No hay libros recientes
              </p>
            </div>
          )}
        </div>

        {/* Community Books Section */}
        <div className="space-y-3 pb-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Award className="w-4 h-4 mr-2 text-purple-500" />
              <h2 className="text-lg font-medium text-white">
                Libros de la comunidad
              </h2>
            </div>
            <button
              onClick={() => {}} 
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              Explorar más
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {communityBooks.map((book) => (
              <button
                key={book.id}
                onClick={() => handleOpenCommunityBook(book)}
                className="bg-gray-800 rounded-lg overflow-hidden text-left w-full hover:ring-2 hover:ring-purple-500/50 transition-all duration-300 group"
              >
                <div className="aspect-[3/4] h-[180px] relative overflow-hidden">
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                
                <div className="p-3">
                  <h3 className="font-medium text-white text-sm line-clamp-1">
                    {book.title}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-1">
                    {book.author}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}