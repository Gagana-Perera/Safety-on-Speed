import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import { Alert, Animated, Easing, PermissionsAndroid, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/superbase';
import { useTheme } from '../themeContext';

import RNImmediatePhoneCall from 'react-native-immediate-phone-call';

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
  const { t } = useTranslation();
  const { theme } = useTheme();
// sos button start
  const [sosMode, setSosMode] = useState<'off' | 'single' | 'triple'>('off');
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startContinuousTracking = async () => {
    let { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    let { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

    if (fgStatus !== 'granted' || bgStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Background location is required for continuous tracking.');
      return false;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,

      // This Try to get Our Location every 5 Seconds Like 5m distance (Rivindu)
      timeInterval: 5000,
      distanceInterval: 5,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "SOS Active",
        notificationBody: "Your location is being continuously shared.",
        notificationColor: "#DC2626",
      }
    });
    return true;
  };


  const stopContinuousTracking = async () => {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log("Continuous tracking stopped.");
      
      try {
        await supabase.from('live_locations' as any).update({ is_active: false }).eq('user_id', CURRENT_USER_ID);
      } catch (err) {}
    }
  };



  const handleSOSPress = async () => {
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    tapCountRef.current += 1;

    if (tapCountRef.current === 3) {
      setSosMode('triple');
      tapCountRef.current = 0;
      tapTimerRef.current = null;

      try {

        //Location
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'App needs location access to share it.');
        } else {
          let location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High
          });
          
          const lat = location.coords.latitude;
          const lng = location.coords.longitude;

          // Fixed Google Maps URL format to ensure it opens correctly
          const googleMapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
          const messageToShare = `Emergency! I need help. Here is my current location: ${googleMapsUrl}`;

          // This triggers the native sharing menu (WhatsApp, SMS, etc.)
          await Share.share({
            message: messageToShare,
            title: 'Emergency Location',
          });
        }

        //ANDROID PART
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CALL_PHONE,
            {
              title: 'Emergency Call Permission',
              message: 'This app needs access to your dialer to make emergency calls directly.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            RNImmediatePhoneCall.immediatePhoneCall('119');
          } else {
            Alert.alert('Permission Denied', 'App cannot make calls automatically. Please dial 119 manually.');
          }
        } else {

          //For I PHONES - Emergency CALL
          RNImmediatePhoneCall.immediatePhoneCall('119');
        }
      } catch (error) {
        console.warn('Call error:', error);
        Alert.alert('Error', 'Could not complete the emergency call.');
      }

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
        
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t('app_title')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.text }]}>
            {t('app_subtitle')}
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

        {/* Card 4 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Report
          </Text>
          <Text style={[styles.cardText, { color: theme.text }]}>
            Report a safety issue in your area.
          </Text>
          <Link href="/report" style={{ color: theme.text, marginTop: 8 }}>
            View Report →
          </Link>
        </View>

      </ScrollView>
    </View>
  );
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