import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Book } from '../types';

interface BookContextType {
  book: Book | null;
  setBook: (book: Book) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  goToPage: (pageNumber: number) => void;
}

const defaultContext: BookContextType = {
  book: null,
  setBook: () => {},
  isLoading: false,
  setIsLoading: () => {},
  goToPage: () => {},
};

const BookContext = createContext<BookContextType>(defaultContext);

export const useBookContext = () => useContext(BookContext);

export const BookProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const goToPage = (pageNumber: number) => {
    if (!book) return;
    
    const validPage = Math.max(1, Math.min(pageNumber, book.totalPages));
    setBook({
      ...book,
      currentPage: validPage,
    });
  };

  return (
    <BookContext.Provider 
      value={{ 
        book, 
        setBook, 
        isLoading, 
        setIsLoading, 
        goToPage
      }}
    >
      {children}
    </BookContext.Provider>
  );
};