import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BookProvider } from './context/BookContext';
import { ThemeProvider } from './context/ThemeContext';
import { OCRProvider, useOCR } from './context/OCRContext';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import NavigationBar from './components/NavigationBar';
import MobileNavigation from './components/MobileNavigation';
import ReaderComponent from './components/Reader';
import LandingPage from './components/LandingPage';
import HomePage from './components/HomePage';
import ModernHomePage from './components/ModernHomePage';
import BooksPage from './pages/BooksPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import UploadPage from './pages/UploadPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import TermPage from './pages/TermPage';
import SupportPage from './pages/SupportPage';
import EulaPage from './pages/EulaPage';
import EmailConfirmed from './pages/EmailConfirmed';
import OCRProgressPopup from './components/OCRProgressPopup';
import TranslationProgressPopup from './components/TranslationProgressPopup';
import { useFileProcessor } from './hooks/useFileProcessor';
import { useTranslator } from './hooks/useTranslator';

// Componente para manejar cuando mostrar NavigationBar
const AppContent = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const location = useLocation();
  const { isProcessingOCR, ocrProgress, ocrTotal, ocrBookTitle } = useOCR();
  const { cancelOCR, isCancelling } = useFileProcessor();
  const { 
    isTranslatingBulk, 
    translationProgress, 
    translationTotal, 
    currentFromLanguage, 
    currentToLanguage, 
    cancelTranslation, 
    isCancellingTranslation,
    resetTranslationState
  } = useTranslator();

  // Verificar si estamos en la ruta del lector
  const isReaderRoute = location.pathname === '/reader';
  
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {!isReaderRoute && <NavigationBar />}
      
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<ModernHomePage />} />
          <Route path="/eula" element={<EulaPage />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/reader" element={<ReaderComponent onFullScreenChange={setIsFullScreen} />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/term" element={<TermPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/email-confirmed" element={<EmailConfirmed />} />
        </Routes>
      </main>

      {!isReaderRoute && <MobileNavigation />}
      
      {/* Global OCR Progress Popup - Available everywhere including Reader */}
      {isProcessingOCR && (
        <OCRProgressPopup
          progress={ocrProgress}
          total={ocrTotal}
          onCancel={cancelOCR}
          isCancelling={isCancelling}
        />
      )}

      {/* Global Translation Progress Popup - Available everywhere including Reader */}
      {isTranslatingBulk && (
        <TranslationProgressPopup
          progress={translationProgress}
          total={translationTotal}
          fromLanguage={currentFromLanguage}
          toLanguage={currentToLanguage}
          onCancel={cancelTranslation}
          isCancelling={isCancellingTranslation}
          isVisible={isTranslatingBulk}
        />
      )}
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
          <Route path="/eula" element={<EulaPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/term" element={<TermPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/email-confirmed" element={<EmailConfirmed />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <ThemeProvider>
        <BookProvider>
          <OCRProvider>
            <AppContent />
          </OCRProvider>
        </BookProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
