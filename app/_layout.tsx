import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "./global.css";
import { ThemeProvider, useTheme } from "./themeContext";

function RootLayoutNav() {
  // Now this works because this component is INSIDE the ThemeProvider
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
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
        <Stack.Screen
          name="report"
          options={{ presentation: "transparentModal", animation: "fade" }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}
