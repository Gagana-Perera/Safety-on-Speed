import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "./global.css";
import "@/lib/sosTask";
import { ThemeProvider, useTheme } from "./themeContext";

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
        <Stack.Screen name="auth/sign-up-password" />
        <Stack.Screen name="auth/sign-up-email" />
        <Stack.Screen name="auth/otp" />
        <Stack.Screen name="auth/setup" />
        <Stack.Screen name="auth/addguardians" />
        <Stack.Screen name="auth/change-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="editProfile" />
        <Stack.Screen name="sos/loading" />
        <Stack.Screen name="sos/active" />
        <Stack.Screen name="sos/[token]" />
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
