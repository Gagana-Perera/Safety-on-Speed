import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "./global.css";
import { ThemeProvider, useTheme } from "./themeContext";
import { useEffect } from "react";                        
import * as ImagePicker from 'expo-image-picker';         
import * as Location from 'expo-location';
import { supabase } from '../lib/superbase';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

function RootLayoutNav() {
  const { isDark } = useTheme();

  const registerPushToken = async () => {
    try {

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

  const requestDataSharingPermission = async () => {
    try {
      // Check if already asked before
      const alreadyAsked = await AsyncStorage.getItem('data_sharing_asked');
      if (alreadyAsked) return;

      // Check if user is logged in
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session) return;

      // Show popup
      Alert.alert(
        'Data Sharing',
        'Allow Safety on Speed to share anonymous usage data to help improve the app?',
        [
          {
            text: 'Decline',
            style: 'cancel',
            onPress: async () => {
              await supabase
                .from('profiles')
                .update({ personal_data_access: false } as any)
                .eq('id', session.user.id);
              await AsyncStorage.setItem('data_sharing_asked', 'true');
            }
          },
          {
            text: 'Allow',
            onPress: async () => {
              await supabase
                .from('profiles')
                .update({ personal_data_access: true } as any)
                .eq('id', session.user.id);
              await AsyncStorage.setItem('data_sharing_asked', 'true');
            }
          }
        ]
      );
    } catch (error) {
      console.log('Data sharing permission error:', error);
    }
  };

  useEffect(() => {
  const requestAllPermissions = async () => {
    await ImagePicker.requestCameraPermissionsAsync();
    await Location.requestForegroundPermissionsAsync();
    await requestDataSharingPermission();
    
    if (Constants.executionEnvironment  !== 'storeClient') {
      try {
        const Notifications = await import('expo-notifications');
        await Notifications.requestPermissionsAsync();
        await registerPushToken();
      } catch (error) {
        console.log('Notifications skipped on Expo Go:', error);
      }
    }
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