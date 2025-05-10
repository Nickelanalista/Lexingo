import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { BookProvider, useBookContext } from './context/BookContext';
import { ThemeProvider } from './context/ThemeContext';
import { supabase } from './lib/supabase';
import NavigationBar from './components/NavigationBar';
import FileUploader from './components/PDFUploader';
import Reader from './components/Reader';
import LandingPage from './components/LandingPage';
import BooksPage from './pages/BooksPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const { book } = useBookContext();
  const [session, setSession] = useState(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  if (!session) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <NavigationBar />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={
              <div className="flex flex-col items-center h-screen">
                <div className="text-center mb-0 mt-10 pt-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                    Bienvenido a Lexingo
                  </h1>
                  <div className="max-w-[280px] mx-auto">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Tu asistente de lectura con traducción instantánea
                    </p>
                    <p className="text-2xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-2">
                      Traduce palabras o párrafos con un solo clic.
                    </p>
                  </div>
                </div>

                <div className="w-full max-w-[280px] mx-auto transform scale-90 mt-8">
                  <FileUploader onFileProcessed={() => {}} />
                </div>
              </div>
            } />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/reader" element={
              book ? <Reader /> : <Navigate to="/" replace />
            } />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <BookProvider>
          <AppContent />
        </BookProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;