import { Stack } from "expo-router";
import "./global.css";

export default function RootLayout() {
  return (
    <    Stack screenOptions={{ headerShown: false, }} >

      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

{/*}
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
  */}
