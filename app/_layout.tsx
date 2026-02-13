import { Stack } from "expo-router";
import "./global.css";
import { ThemeProvider } from "./themeContext";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="session" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="auth/sign-up" />
        <Stack.Screen name="auth/setup" />
        <Stack.Screen name="auth/otp" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}

{
  /*}
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "./global.css";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" translucent />

      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </>
  );
}
  */
}
