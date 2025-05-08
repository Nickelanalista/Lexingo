import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  fontSize: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  fontSize: 16,
  increaseFontSize: () => {},
  decreaseFontSize: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as Theme) || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });
  
  const [fontSize, setFontSize] = useState<number>(() => {
    const savedFontSize = localStorage.getItem('fontSize');
    return savedFontSize ? parseInt(savedFontSize, 10) : 16;
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize.toString());
  }, [fontSize]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const increaseFontSize = () => {
    setFontSize((prev) => Math.min(prev + 1, 24));
  };

  const decreaseFontSize = () => {
    setFontSize((prev) => Math.max(prev - 1, 12));
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        toggleTheme, 
        fontSize, 
        increaseFontSize, 
        decreaseFontSize 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};