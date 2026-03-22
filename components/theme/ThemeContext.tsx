import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform, useColorScheme } from "react-native";

const LightTheme = {
  mode: "light",
  background: "#FFFFFF",
  text: "#000000",
  card: "#F0F0F0",
  border: "#E0E0E0",
  icon: "#000000",
};

const DarkTheme = {
  mode: "dark",
  background: "#002747",
  text: "#FFFFFF",
  card: "#1A3B54",
  border: "#30363D",
  icon: "#F0F0F0",
};

type ThemeContextValue = {
  isDark: boolean;
  theme: typeof LightTheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: LightTheme,
  isDark: false,
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = "userTheme";

const webThemeStorage = {
  getItem: async (key: string) => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
};

const themeStorage = Platform.OS === "web" ? webThemeStorage : AsyncStorage;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === "dark");

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await themeStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          setIsDark(savedTheme === "dark");
        }
      } catch (error) {
        console.log("Error loading theme:", error);
      }
    };

    void loadTheme();
  }, []);

  const toggleTheme = async () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);

    try {
      await themeStorage.setItem(THEME_STORAGE_KEY, nextIsDark ? "dark" : "light");
    } catch (error) {
      console.log("Error saving theme:", error);
    }
  };

  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
