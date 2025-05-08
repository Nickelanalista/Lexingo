import React from 'react';
import { Book } from 'lucide-react';
import { useBookContext } from '../context/BookContext';

const NavigationBar: React.FC = () => {
  const { book, setBook } = useBookContext();
  
  const handleBackToUpload = () => {
    if (book && !window.confirm('¿Estás seguro de que quieres cerrar este libro?')) {
      return;
    }
    setBook(null);
  };
  
  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Book className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">Lexingo</span>
          </div>
          
          {book && (
            <div className="flex items-center">
              <div className="hidden md:block mr-4">
                <h2 className="text-lg font-medium truncate max-w-xs text-gray-700 dark:text-gray-300">
                  {book.title}
                </h2>
              </div>
              
              <button
                onClick={handleBackToUpload}
                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                Subir Nuevo Libro
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default NavigationBar