import { Redirect, Stack, usePathname } from "expo-router";
import "./global.css";
import { ThemeProvider } from "./themeContext";

export default function RootLayout() {
  const pathname = usePathname();
  const isRoot = pathname === "/";

  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="session" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/forgot-password"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="auth/sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="auth/setup" options={{ headerShown: false }} />
        <Stack.Screen name="auth/otp" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      {isRoot && <Redirect href="/session" />}
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
