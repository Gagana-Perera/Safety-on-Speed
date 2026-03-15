import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Linking, Animated, Easing } from 'react-native';
import { useTheme } from '../themeContext';
import { Link } from 'expo-router';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager'; 
import { supabase } from '../../lib/superbase';
import { useState, useEffect, useRef } from 'react';
import { notifyVerifiedGuardians } from '../../hooks/notifyVerifiedGuardians';

const CURRENT_USER_ID = 'a';
const LOCATION_TASK_NAME = 'a';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: { data: any, error: any }) => {
  if (error) {
    console.error("Task Manager Error:", error.message);
    return;
  }
  
  if (data) {
    const { locations } = data as any;
    
    if (locations && locations.length > 0) {
      const location = locations[0];
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      try {
        await supabase
          .from('live_locations' as any)
          .upsert({ 
            user_id: CURRENT_USER_ID, 
            latitude: lat, 
            longitude: lng, 
            updated_at: new Date().toISOString(),
            is_active: true
          }, { onConflict: 'user_id' }); 
      } catch (err) {
        console.error("Background Supabase Error:", err);
      }
    }
  }
});

export default function Index() {
  const { theme } = useTheme();

  {/*sos button start*/}
  const [sosMode, setSosMode] = useState<'off' | 'single' | 'triple'>('off');
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const tapCountRef = useRef(0);
  const tapResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSOSPress = () => {
    if (tapResetTimerRef.current) {
      clearTimeout(tapResetTimerRef.current);
    }

    tapCountRef.current += 1;

    if (tapCountRef.current === 3) {
      setSosMode('triple');
      tapCountRef.current = 0;
      return;
    }

    setSosMode((prev) => (prev === 'off' ? 'single' : 'off'));

    tapResetTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (tapResetTimerRef.current) {
        clearTimeout(tapResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sosMode !== 'off') {
      pulseAnim.setValue(0);
      pulseLoopRef.current = Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseAnim.setValue(0);
    }

    return () => {
      pulseLoopRef.current?.stop();
    };
  }, [sosMode, pulseAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  });

  const isSosActive = sosMode !== 'off';
  {/*sos button end*/}

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={{ padding: 16, gap: 12 }}>
      <Text>Welcome</Text>

      <Link href="/auth/sign-up" asChild>
        <Text style={{ color: "#2563eb", fontWeight: "600" }}>Sign Up</Text>
      </Link>
      <Link href="/auth/login" asChild>
        <Text style={{ color: "#2563eb", fontWeight: "600" }}>Login</Text>
      </Link>
    </View>
        
        {/* Header Area */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Welcome!</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            This is the Home Screen.
          </Text>
        </View>


        {/* SOS Button Area */}

    <View style={[styles.emergencyContainer]}>
      <View style={styles.sosButtonWrap}>
      {isSosActive && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseCircle,
            {
              backgroundColor: sosMode === 'triple' ? '#DC2626' : '#AC991F',
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        />
      )}
      <TouchableOpacity 
        onPress={handleSOSPress}
        activeOpacity={0.7}
        style={[
          styles.emergencyButton,
          { backgroundColor: sosMode === 'off' ? '#0F7CA5' : sosMode === 'triple' ? '#DC2626' : '#AC991F' },
        ]}
      >
        <Text style={[styles.emergencyButtonText, { color: theme.text }]}>
          {isSosActive ? 'ACTIVE' : 'SOS'}
        </Text>
      </TouchableOpacity>
      </View>
    </View>


        {/* Example Card 1 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Dark Mode Test</Text>
          <Text style={[styles.cardText, { color: theme.icon }]}>
            If the toggle Dark Mode in your Profile, this card should turn dark grey.
          </Text>
        </View>

        {/* Example Card 2 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Team's Work</Text>
          <Text style={[styles.cardText, { color: theme.icon }]}>
            We can replace this file later with our real code.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

type AlertMode = 'single' | 'triple' | null;
export function EmergencyButton() {
  const [activeMode, setActiveMode] = useState<AlertMode>(null);
  const [tapCount, setTapCount] = useState<number>(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handlePress = () => {
    if (activeMode) {
      cancelAlert();
      return;
    }
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount === 1) {
      timerRef.current = setTimeout(() => {
        triggerAlert('single');
      }, 10000); // 10 second delay for single tap
    } else if (newCount === 3) {
      if (timerRef.current) clearTimeout(timerRef.current);
      triggerAlert('triple');
    }
  };

    const triggerAlert = async (mode: Exclude<AlertMode, null>) => {
    setTapCount(0);
    setActiveMode(mode);
    
    let { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      Alert.alert('Permission Denied', 'App needs foreground location access.');
      setActiveMode(null);
      return;
    }

    let { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Background location is required so SOS works when phone is locked.');
      setActiveMode(null);
      return;
    }

    const liveLocationLink = `https://yourdomain.com/track/${CURRENT_USER_ID}`;
    
    await notifyVerifiedGuardians(CURRENT_USER_ID, liveLocationLink);

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000,
      distanceInterval: 5, 
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "SOS Alert Active",
        notificationBody: "Your live location is being shared with your guardians.",
        notificationColor: "#e74c3c",
      }
    });

    console.log("Background tracking initiated.");
    console.log(`Alert triggered: ${mode}`);
    // Add our Supabase or SMS logic here

    if (mode === 'triple') {
      const emergencyNumber = 'tel:119'; 
      
      try {
        const supported = await Linking.canOpenURL(emergencyNumber);
        if (supported) {
          await Linking.openURL(emergencyNumber);
        } else {
          Alert.alert('Error', 'Your device does not support making phone calls from this app.');
        }
      } catch (error) {
        console.error('Error opening dialer:', error);
      }
    }
  };

  const cancelAlert = async () => {
    setActiveMode(null);
    setTapCount(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log("Background tracking stopped.");
    }

    try {
      await supabase
        .from('live_locations' as any)
        .update({ is_active: false })
        .eq('user_id', CURRENT_USER_ID);
      console.log("Database updated: alert inactive.");
    } catch (err) {
      console.error("Failed to update cancel status in DB", err);
    }
  };

  return null; // can replace this with a <TouchableOpacity> later

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60, // Space for status bar
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    // Shadow for iOS/Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emergencyContainer: {
    paddingTop: 210,
    paddingBottom: 210,
    marginBottom: 16,
    alignItems: 'center',
  },
  sosButtonWrap: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  emergencyButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyButtonText: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emergencyStatus: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
});
