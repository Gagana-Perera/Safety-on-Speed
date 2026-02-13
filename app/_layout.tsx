import { Stack } from "expo-router";
import { ThemeProvider, useTheme } from "./themeContext";
import { StatusBar } from "expo-status-bar";
import "./global.css";

// 1. Create a component specifically to hold the logic that needs the Theme
function RootLayoutNav() {
  // Now this works because this component is INSIDE the ThemeProvider
  const { isDark } = useTheme(); 

  return (
    <>
      {/* Dynamic Status Bar */}
      <StatusBar style={isDark ? "light" : "dark"} />

      <Stack screenOptions={{ headerShown: false }}>
        {/* Your Screens */}
        <Stack.Screen name="index" />
        <Stack.Screen name="session" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="auth/sign-up" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="editProfile" />
      </Stack>
    </>
  );
}

// 2. The Main Export just sets up the Provider
export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}