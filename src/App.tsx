import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { BookProvider } from './context/BookContext';
import { ThemeProvider } from './context/ThemeContext';
import { supabase } from './lib/supabase';
import NavigationBar from './components/NavigationBar';
import MobileNavigation from './components/MobileNavigation';
import Reader from './components/Reader';
import LandingPage from './components/LandingPage';
import HomePage from './components/HomePage';
import BooksPage from './pages/BooksPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

function App() {
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
    <Router>
      <ThemeProvider>
        <BookProvider>
          <div className="min-h-screen bg-gray-900">
            <NavigationBar />
            
            <main className="w-full pb-20">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/books" element={<BooksPage />} />
                <Route path="/reader" element={<Reader />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </main>

            <MobileNavigation />
          </div>
        </BookProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;