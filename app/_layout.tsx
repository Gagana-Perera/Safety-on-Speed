import { Redirect, Stack } from "expo-router";
import "./global.css";

export default function RootLayout() {
  return (
    <Stack>
      <Redirect href={"/session"} />
      <Stack.Screen name="session" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen
        name="auth/forgot-password"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="auth/sign-up" options={{ headerShown: false }} />
      <Stack.Screen
        name="auth/guardian-setup"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="auth/otp" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
