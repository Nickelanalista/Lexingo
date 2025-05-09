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
        <div className="flex justify-center h-12 items-center">
          <div className="flex items-center">
            <Book className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span className="ml-2 text-lg font-bold text-gray-900 dark:text-white">Lexingo</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavigationBar