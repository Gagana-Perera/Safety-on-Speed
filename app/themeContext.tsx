import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Define what the Theme looks like
type ThemeShape = {
  background: string;
  card: string;
  text: string;
  subText: string;
  icon: string;
  border: string;
};

// 2. Define what data the Context holds
interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  theme: ThemeShape;
}

// 3. Create Context with a default value of undefined
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 4. Define props for the Provider (typing 'children')
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('userTheme');
        if (savedTheme) {
          setIsDark(savedTheme === 'dark');
        }
      } catch (e) {
        console.log("Failed to load theme");
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    try {
      await AsyncStorage.setItem('userTheme', newTheme ? 'dark' : 'light');
    } catch (e) {
      console.log("Failed to save theme");
    }
  };

  const theme: ThemeShape = {
    background: isDark ? '#002747' : '#F2F2F7',
    card:       isDark ? '#1E3C5A' : '#FFFFFF',
    text:       isDark ? '#FFFFFF' : '#000000',
    subText:    isDark ? '#a7a7a7' : '#666666',
    icon:       isDark ? '#8FD3FF' : '#007AFF',
    border:     isDark ? '#305d7b' : '#E5E5EA',
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 5. Custom Hook with error handling
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};