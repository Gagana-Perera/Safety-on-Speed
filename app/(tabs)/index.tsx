import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { countGuardianRecipients } from "@/hooks/notifyVerifiedGuardians";
import { useInternetStatus } from "@/hooks/useInternetStatus";
import {
  getStoredActiveSOSSession,
  hydrateStoredSOSSession,
  type StoredSOSSession,
} from "@/lib/sosService";
import {
  EMERGENCY_SOS_TAP_WINDOW_MS,
  QUICK_SOS_CONFIRM_DELAY_MS,
  getEmergencyTapHint,
} from "@/lib/sosTap";
import { supabase } from "@/lib/superbase";

import { useTheme } from "../themeContext";

type GpsStatus = "checking" | "off" | "permission-needed" | "ready";
type LaunchMode = "emergency" | "quick" | null;

function formatGpsStatus(status: GpsStatus) {
  switch (status) {
    case "off":
      return "GPS Off";
    case "permission-needed":
      return "Permission Needed";
    case "ready":
      return "GPS Ready";
    default:
      return "Checking GPS";
  }
}

function formatInternetStatus(status: ReturnType<typeof useInternetStatus>) {
  switch (status) {
    case "offline":
      return "Offline";
    case "online":
      return "Online";
    default:
      return "Checking Network";
  }
}

export default function HomeSOSScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const internetStatus = useInternetStatus();

  const pulseValue = useRef(new Animated.Value(1)).current;
  const quickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const emergencyWindowRef = useRef<NodeJS.Timeout | null>(null);
  const tapTimestampsRef = useRef<number[]>([]);

  const [activeSession, setActiveSession] = useState<StoredSOSSession | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("checking");
  const [guardianCount, setGuardianCount] = useState(0);
  const [launchMode, setLaunchMode] = useState<LaunchMode>(null);
  const [tapCount, setTapCount] = useState(0);

  const isLaunching = launchMode !== null;

  const resetTapSequence = useCallback(() => {
    if (quickTimerRef.current) {
      clearTimeout(quickTimerRef.current);
      quickTimerRef.current = null;
    }

    if (emergencyWindowRef.current) {
      clearTimeout(emergencyWindowRef.current);
      emergencyWindowRef.current = null;
    }

    tapTimestampsRef.current = [];
    setTapCount(0);
  }, []);

  const loadDashboardState = useCallback(async () => {
    setDashboardLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;
      if (!userId) {
        setActiveSession(null);
        setGuardianCount(0);
        setGpsStatus("permission-needed");
        return;
      }

      const [guardianTotal, hydratedSession] = await Promise.all([
        countGuardianRecipients(userId).catch(() => 0),
        hydrateStoredSOSSession(userId).catch(async () => {
          const stored = await getStoredActiveSOSSession();
          return stored?.userId === userId ? stored : null;
        }),
      ]);

      const servicesEnabled = await Location.hasServicesEnabledAsync().catch(
        () => false,
      );
      const permission = await Location.getForegroundPermissionsAsync().catch(
        () => ({ status: "undetermined" as const }),
      );

      setGuardianCount(guardianTotal);
      setActiveSession(hydratedSession);

      if (!servicesEnabled) {
        setGpsStatus("off");
      } else if (permission.status !== "granted") {
        setGpsStatus("permission-needed");
      } else {
        setGpsStatus("ready");
      }
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          duration: 1100,
          toValue: 1.08,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          duration: 1100,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      resetTapSequence();
    };
  }, [pulseValue, resetTapSequence]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboardState();
    }, [loadDashboardState]),
  );

  const navigateToSOSFlow = useCallback(
    (mode: Exclude<LaunchMode, null>) => {
      setLaunchMode(mode);
      resetTapSequence();

      void Haptics.notificationAsync(
        mode === "emergency"
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);

      router.push({
        params: { mode },
        pathname: "/sos/loading",
      });

      setTimeout(() => {
        setLaunchMode(null);
      }, 300);
    },
    [resetTapSequence, router],
  );

  const handleSOSPress = useCallback(() => {
    if (dashboardLoading || isLaunching) return;

    if (activeSession?.status === "active") {
      router.push({
        params: { sessionId: activeSession.sessionId },
        pathname: "/sos/active",
      });
      return;
    }

    const now = Date.now();
    tapTimestampsRef.current = [
      ...tapTimestampsRef.current.filter(
        (timestamp) => now - timestamp <= EMERGENCY_SOS_TAP_WINDOW_MS,
      ),
      now,
    ];

    const nextTapCount = tapTimestampsRef.current.length;
    setTapCount(nextTapCount);

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => undefined,
    );

    if (nextTapCount === 1) {
      quickTimerRef.current = setTimeout(() => {
        navigateToSOSFlow("quick");
      }, QUICK_SOS_CONFIRM_DELAY_MS);

      emergencyWindowRef.current = setTimeout(() => {
        resetTapSequence();
      }, EMERGENCY_SOS_TAP_WINDOW_MS);

      return;
    }

    if (quickTimerRef.current) {
      clearTimeout(quickTimerRef.current);
      quickTimerRef.current = null;
    }

    if (nextTapCount >= 3) {
      navigateToSOSFlow("emergency");
    }
  }, [
    activeSession,
    dashboardLoading,
    isLaunching,
    navigateToSOSFlow,
    resetTapSequence,
    router,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroHeader}>
          <Text style={[styles.kicker, { color: theme.icon }]}>
            Personal Safety
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>SOS Control</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            One tap starts a Quick SOS. Three fast taps starts the emergency
            flow and prompts a 119 call.
          </Text>
        </View>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.sosRing,
              {
                borderColor:
                  activeSession?.status === "active" ? "#FFB4B0" : "#F48C87",
                transform: [{ scale: pulseValue }],
              },
            ]}
          >
            <TouchableOpacity
              accessibilityLabel="SOS Button"
              activeOpacity={0.88}
              disabled={dashboardLoading || isLaunching}
              onPress={handleSOSPress}
              style={[
                styles.sosButton,
                {
                  backgroundColor:
                    activeSession?.status === "active" ? "#C62828" : "#E53935",
                },
              ]}
            >
              {dashboardLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.sosLabel}>
                    {activeSession?.status === "active" ? "ACTIVE" : "SOS"}
                  </Text>
                  <Text style={styles.sosSubLabel}>
                    {launchMode === "emergency"
                      ? "Emergency SOS..."
                      : launchMode === "quick"
                        ? "Quick SOS..."
                        : activeSession?.status === "active"
                          ? "Tap to resume"
                          : "Tap now"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.modeRow}>
            <View style={styles.modePill}>
              <Text style={styles.modePillLabel}>1 tap = Quick SOS</Text>
            </View>
            <View style={[styles.modePill, styles.modePillDark]}>
              <Text style={styles.modePillLabel}>3 taps = Emergency SOS</Text>
            </View>
          </View>

          <Text style={[styles.tapHint, { color: theme.icon }]}>
            {activeSession?.status === "active"
              ? "An alert is already active. Tap the button to open the Active Alert screen."
              : getEmergencyTapHint(tapCount)}
          </Text>
        </View>

        <View style={styles.statusGrid}>
          <View
            style={[
              styles.statusCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.statusLabel, { color: theme.icon }]}>
              Guardians
            </Text>
            <Text style={[styles.statusValue, { color: theme.text }]}>
              {guardianCount}
            </Text>
            <Text style={[styles.statusHint, { color: theme.icon }]}>
              {guardianCount === 0
                ? "Add guardians before using SOS"
                : "Configured for SOS alerts"}
            </Text>
          </View>

          <View
            style={[
              styles.statusCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.statusLabel, { color: theme.icon }]}>GPS</Text>
            <Text style={[styles.statusValue, { color: theme.text }]}>
              {formatGpsStatus(gpsStatus)}
            </Text>
            <Text style={[styles.statusHint, { color: theme.icon }]}>
              Location access is required for live tracking
            </Text>
          </View>

          <View
            style={[
              styles.statusCardWide,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.statusLabel, { color: theme.icon }]}>
              Internet
            </Text>
            <Text style={[styles.statusValue, { color: theme.text }]}>
              {formatInternetStatus(internetStatus)}
            </Text>
            <Text style={[styles.statusHint, { color: theme.icon }]}>
              Automatic WhatsApp delivery needs a connected network and backend
              endpoint.
            </Text>
          </View>
        </View>

        {activeSession?.status === "active" && (
          <View
            style={[
              styles.activeBanner,
              { backgroundColor: "#FFF4E5", borderColor: "#F5B971" },
            ]}
          >
            <Text style={styles.activeBannerTitle}>SOS already active</Text>
            <Text style={styles.activeBannerText}>
              {activeSession.mode === "emergency"
                ? "Emergency SOS is currently running."
                : "Quick SOS is currently running."}
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  params: { sessionId: activeSession.sessionId },
                  pathname: "/sos/active",
                })
              }
              style={styles.bannerButton}
            >
              <Text style={styles.bannerButtonText}>Open Active Alert</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => router.push("/extra")}
            style={[styles.actionButton, { backgroundColor: theme.card }]}
          >
            <Text style={[styles.actionTitle, { color: theme.text }]}>
              Emergency Services
            </Text>
            <Text style={[styles.actionText, { color: theme.icon }]}>
              Call hotlines or open nearby emergency support.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/auth/addguardians")}
            style={[styles.actionButton, { backgroundColor: theme.card }]}
          >
            <Text style={[styles.actionTitle, { color: theme.text }]}>
              {guardianCount === 0 ? "Add Guardians" : "Manage Guardians"}
            </Text>
            <Text style={[styles.actionText, { color: theme.icon }]}>
              {guardianCount === 0
                ? "Set up contacts before your next emergency."
                : "Review the contacts that receive SOS alerts."}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    borderRadius: 22,
    minHeight: 132,
    padding: 18,
    width: "48%",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  activeBanner: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 22,
    padding: 18,
  },
  activeBannerText: {
    color: "#8A4B08",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  activeBannerTitle: {
    color: "#8A4B08",
    fontSize: 18,
    fontWeight: "800",
  },
  bannerButton: {
    alignSelf: "flex-start",
    backgroundColor: "#8A4B08",
    borderRadius: 999,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    paddingTop: 52,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 22,
    padding: 22,
  },
  heroHeader: {
    marginBottom: 18,
  },
  kicker: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  modePill: {
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modePillDark: {
    backgroundColor: "#FFD6D3",
  },
  modePillLabel: {
    color: "#8E1D1D",
    fontSize: 12,
    fontWeight: "800",
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  sosButton: {
    alignItems: "center",
    borderRadius: 120,
    height: 196,
    justifyContent: "center",
    width: 196,
  },
  sosLabel: {
    color: "#FFFFFF",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  sosRing: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 160,
    borderWidth: 18,
    height: 244,
    justifyContent: "center",
    marginBottom: 26,
    width: 244,
  },
  sosSubLabel: {
    color: "#FFE8E7",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  statusCard: {
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 140,
    padding: 18,
    width: "48%",
  },
  statusCardWide: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    width: "100%",
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 22,
  },
  statusHint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  statusValue: {
    fontSize: 26,
    fontWeight: "800",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 560,
  },
  tapHint: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 18,
    textAlign: "center",
  },
  title: {
    fontSize: 38,
    fontWeight: "900",
    marginBottom: 8,
  },
});
