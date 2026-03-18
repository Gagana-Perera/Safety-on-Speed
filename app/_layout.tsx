import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "./global.css";
import { ThemeProvider, useTheme } from "./themeContext";
import { useEffect } from "react";                        
import * as ImagePicker from 'expo-image-picker';         
import * as Location from 'expo-location';
import { supabase } from '../lib/superbase';
import Constants from 'expo-constants';

function RootLayoutNav() {
  const { isDark } = useTheme();

  const registerPushToken = async () => {
    try {
      // Only run on real builds, not Expo Go
      if (Constants.appOwnership === 'expo') return;

      const Notifications = await import('expo-notifications');
      const { data: token } = await Notifications.getExpoPushTokenAsync();
      console.log('Push token:', token);

      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session) return;

      await supabase
        .from('profiles')
        .update({ push_token: token } as any)
        .eq('id', session.user.id);

    } catch (error) {
      console.log('Push token error:', error);
    }
  };

  useEffect(() => {
    const requestAllPermissions = async () => {
      await ImagePicker.requestCameraPermissionsAsync();
      await Location.requestForegroundPermissionsAsync();
      await registerPushToken();
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
        <Stack.Screen name="report" options={{ presentation: 'transparentModal', animation: 'fade' }} />
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