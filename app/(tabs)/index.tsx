import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Animated, Easing } from 'react-native';
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
// sos button start
  const [sosMode, setSosMode] = useState<'off' | 'single' | 'triple'>('off');
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSOSPress = () => {
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    tapCountRef.current += 1;

    if (tapCountRef.current === 3) {
      setSosMode('triple');
      tapCountRef.current = 0;
      tapTimerRef.current = null;
      return;
    }

    tapTimerRef.current = setTimeout(() => {
      if (tapCountRef.current === 1) {
        setSosMode((prev) => (prev === 'off' ? 'single' : 'off'));
      }

      tapCountRef.current = 0;
      tapTimerRef.current = null;
    }, 420);
  };

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;

    if (sosMode !== 'off') {
      pulseAnim.setValue(0);
      pulseLoop = Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      );
      pulseLoop.start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    }

    return () => {
      pulseLoop?.stop();
    };
  }, [sosMode, pulseAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.38, 0],
  });
  const isSosActive = sosMode !== 'off';
  const isTripleActive = sosMode === 'triple';
// sos button end
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            Safety on Speed
          </Text>
          <Text style={[styles.subtitle, { color: theme.text }]}>
            Stay safe, stay connected.
          </Text>
        </View>

        {/* Card 1 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Live Location
          </Text>
          <Text style={[styles.cardText, { color: theme.text }]}>
            Your location is being tracked to keep you safe.
          </Text>
        </View>

        {/* Emergency Button */}
        <View style={[styles.emergencyContainer]}>
          <View style={styles.sosButtonWrap}>
            {isSosActive && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pulseCircle,
                  {
                    backgroundColor: isTripleActive ? '#DC2626' : '#AC991F',
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
              { backgroundColor: !isSosActive ? '#0F7CA5' : isTripleActive ? '#DC2626' : '#AC991F' },
            ]}
          >
            <Text style={[styles.emergencyButtonText, { color: theme.text }]}>
              {isSosActive ? 'ACTIVE' : 'SOS'}
            </Text>
          </TouchableOpacity>
          </View>
        </View>

        {/* Card 2 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Emergency Services
          </Text>
          <Text style={[styles.cardText, { color: theme.text }]}>
            Quick access to emergency contacts and services.
          </Text>
          <Link href="/extra" style={{ color: theme.text, marginTop: 8 }}>
            View Services →
          </Link>
        </View>

        {/* Card 3 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            News & Alerts
          </Text>
          <Text style={[styles.cardText, { color: theme.text }]}>
            Stay updated with the latest safety news in your area.
          </Text>
          <Link href="/news" style={{ color: theme.text, marginTop: 8 }}>
            View News →
          </Link>
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
  };

  const cancelAlert = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveMode(null);
    setTapCount(0);
    Alert.alert("Alert Cancelled");
  };

  return null; // can replace this with a <TouchableOpacity> later

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
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
    paddingTop: 80,
    paddingBottom: 80,
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
  }
});