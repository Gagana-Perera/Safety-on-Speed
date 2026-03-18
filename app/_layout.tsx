import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "./global.css";
import { ThemeProvider, useTheme } from "./themeContext";
import { useEffect } from "react";                        
import * as ImagePicker from 'expo-image-picker';         
import * as Location from 'expo-location';               

function RootLayoutNav() {
  const { isDark } = useTheme();

  useEffect(() => {
    const requestAllPermissions = async () => {
      await ImagePicker.requestCameraPermissionsAsync();
      await Location.requestForegroundPermissionsAsync();
    };
    requestAllPermissions();
  }, []);

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