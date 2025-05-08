import React from 'react';
import { BookProvider, useBookContext } from './context/BookContext';
import { ThemeProvider } from './context/ThemeContext';
import NavigationBar from './components/NavigationBar';
import FileUploader from './components/PDFUploader';
import Reader from './components/Reader';

const AppContent: React.FC = () => {
  const { book } = useBookContext();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <NavigationBar />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {book ? (
            <Reader />
          ) : (
            <div className="py-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  Bienvenido a Lexingo
                </h1>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                  Sube un libro en PDF, TXT, DOCX u otros formatos y toca cualquier palabra para ver su traducción al español.
                  ¡Perfecto para estudiantes de idiomas!
                </p>
              </div>
              
              <FileUploader onFileProcessed={() => {}} />
            </div>
          )}
        </div>
      </main>
      
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Lexingo - Herramienta de Lectura Interactiva © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <BookProvider>
        <AppContent />
      </BookProvider>
    </ThemeProvider>
  );
}

export default App