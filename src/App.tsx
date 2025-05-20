import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BookProvider } from './context/BookContext';
import { ThemeProvider } from './context/ThemeContext';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import NavigationBar from './components/NavigationBar';
import MobileNavigation from './components/MobileNavigation';
import ReaderComponent from './components/Reader';
import LandingPage from './components/LandingPage';
import HomePage from './components/HomePage';
import BooksPage from './pages/BooksPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import UploadPage from './pages/UploadPage';
import TermsPage from './pages/TermsPage';

// Componente para manejar cuando mostrar NavigationBar
const AppContent = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const location = useLocation();

  // Verificar si estamos en la ruta del lector
  const isReaderRoute = location.pathname === '/reader';
  
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {(!isReaderRoute || !isFullScreen) && <NavigationBar />}
      
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/reader" element={<ReaderComponent onFullScreenChange={setIsFullScreen} />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Routes>
      </main>

      {(!isReaderRoute || !isFullScreen) && <MobileNavigation />}
    </div>
  );
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  
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
    return (
      <Router>
        <Routes>
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Router>
    );
  }

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