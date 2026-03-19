import { supabase } from "@/lib/superbase";
import * as Location from "expo-location";
import { Link } from "expo-router";
import * as TaskManager from "expo-task-manager";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../themeContext";

const CURRENT_USER_ID = "a";
const LOCATION_TASK_NAME = "sos-location-task";

if (Platform.OS !== "web") {
  try {
    if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
      TaskManager.defineTask(
        LOCATION_TASK_NAME,
        async ({ data, error }: { data: any; error: any }) => {
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
                await supabase.from("live_locations" as any).upsert(
                  {
                    user_id: CURRENT_USER_ID,
                    latitude: lat,
                    longitude: lng,
                    updated_at: new Date().toISOString(),
                    is_active: true,
                  },
                  { onConflict: "user_id" },
                );
              } catch (err) {
                console.error("Background Supabase Error:", err);
              }
            }
          }
        },
      );
    }
  } catch (e) {
    // Task registration can fail in dev reloads or unsupported runtimes.
    console.warn("Failed to define background location task:", e);
  }
}

export default function Index() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  // sos button start
  const [sosMode, setSosMode] = useState<"off" | "single" | "triple">("off");
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startContinuousTracking = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Not supported",
        "Background tracking is not supported on web.",
      );
      return false;
    }

    let { status: fgStatus } =
      await Location.requestForegroundPermissionsAsync();
    let { status: bgStatus } =
      await Location.requestBackgroundPermissionsAsync();

    if (fgStatus !== "granted" || bgStatus !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Background location is required for continuous tracking.",
      );
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
      },
    });
    return true;
  };

  const stopContinuousTracking = async () => {
    if (Platform.OS === "web") return;
    const hasStarted =
      await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log("Continuous tracking stopped.");

      try {
        await supabase
          .from("live_locations" as any)
          .update({ is_active: false })
          .eq("user_id", CURRENT_USER_ID);
      } catch (err) {}
    }
  };

  const handleSOSPress = async () => {
    if (sosMode !== "off") {
      setSosMode("off");
      tapCountRef.current = 0;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      await stopContinuousTracking();
      return;
    }

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    tapCountRef.current += 1;

    if (tapCountRef.current === 3) {
      setSosMode("triple");
      tapCountRef.current = 0;
      tapTimerRef.current = null;

      try {
        const trackingStarted = await startContinuousTracking();

        if (trackingStarted) {
          let location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          const lat = location.coords.latitude;
          const lng = location.coords.longitude;

          const googleMapsUrl = `http://maps.google.com/maps?q=${lat},${lng}`;
          const messageToShare = `Emergency! I need help. My live tracking is active. My last known location: ${googleMapsUrl}`;

          await Share.share({
            message: messageToShare,
            title: "Emergency Location",
          });
        }

        // Open the dialer using the platform's tel: URI scheme.
        // (Direct auto-calling requires native modules and special permissions.)
        const url = Platform.OS === "ios" ? "telprompt:119" : "tel:119";
        await Linking.openURL(url);
      } catch (error) {
        console.warn("Call error:", error);
        Alert.alert("Error", "Could not complete the emergency call.");
      }

      return;
    }

    tapTimerRef.current = setTimeout(async () => {
      if (tapCountRef.current === 1) {
        setSosMode("single");
        await startContinuousTracking();
        Alert.alert(
          "Tracking Started",
          "Your live location is now updating in the background.",
        );
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

    if (sosMode !== "off") {
      pulseAnim.setValue(0);
      pulseLoop = Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
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
  const isSosActive = sosMode !== "off";
  const isTripleActive = sosMode === "triple";
  // sos button end
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

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t("app_title")}
          </Text>
          <Text style={[styles.subtitle, { color: theme.text }]}>
            {t("app_subtitle")}
          </Text>
        </View>

        {/* Example Card 1 */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Dark Mode Test
          </Text>
          <Text style={[styles.cardText, { color: theme.icon }]}>
            If the toggle Dark Mode in your Profile, this card should turn dark
            grey.
          </Text>
        </View>

        {/* Example Card 2 */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Team&apos;s Work
          </Text>
          <Text style={[styles.cardText, { color: theme.icon }]}>
            We can replace this file later with our real code.
          </Text>
        </View>

        {/* Emergency Button */}
        <View style={styles.emergencyContainer}>
          <View style={styles.sosButtonWrap}>
            {isSosActive && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pulseCircle,
                  {
                    backgroundColor: isTripleActive ? "#DC2626" : "#AC991F",
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
                {
                  backgroundColor: !isSosActive
                    ? "#0F7CA5"
                    : isTripleActive
                      ? "#DC2626"
                      : "#AC991F",
                },
              ]}
            >
              <Text style={[styles.emergencyButtonText, { color: theme.text }]}>
                {isSosActive ? "ACTIVE" : "SOS"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Report card */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>Report</Text>
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
    fontWeight: "bold",
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
    fontWeight: "600",
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
    alignItems: "center",
  },
  sosButtonWrap: {
    width: 180,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseCircle: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  emergencyButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: "center",
    alignItems: "center",
  },
  emergencyButtonText: {
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
  },
  emergencyStatus: {
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
  },
});
