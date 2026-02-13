import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

// Define Colors
const LightTheme = {
  mode: 'light',
  background: '#FFFFFF',
  text: '#000000',
  card: '#F0F0F0',
  border: '#E0E0E0',
  icon: '#333333',
};

const DarkTheme = {
  mode: 'dark',
  background: '#002747',
  text: '#FFFFFF',
  card: '#1A3B54',
  border: '#30363D',
  icon: '#F0F0F0',
};

const ThemeContext = createContext({
  theme: LightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  // Load saved theme
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('userTheme');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        }
      } catch (error) {
        console.log('Error loading theme:', error);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newThemeStatus = !isDark;
    setIsDark(newThemeStatus);
    try {
      await AsyncStorage.setItem('userTheme', newThemeStatus ? 'dark' : 'light');
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {/* CONTROL STATUS BAR HERE - This prevents the crash loop! */}
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);