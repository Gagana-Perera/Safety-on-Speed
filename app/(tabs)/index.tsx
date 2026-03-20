import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "@/components/theme/ThemeContext";
import { countGuardianRecipients } from "@/hooks/notifyVerifiedGuardians";
import { useInternetStatus } from "@/hooks/useInternetStatus";
import { supabase } from "@/lib/superbase";
import { sendSOS } from "@/services/sendSOS";

type GpsStatus = "checking" | "off" | "permission-needed" | "ready";

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

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("checking");
  const [guardianCount, setGuardianCount] = useState(0);
  const [isSendingSOS, setIsSendingSOS] = useState(false);

  const loadDashboardState = useCallback(async () => {
    setDashboardLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;
      if (!userId) {
        setGuardianCount(0);
        setGpsStatus("permission-needed");
        return;
      }

      const guardianTotal = await countGuardianRecipients(userId).catch(() => 0);
      const servicesEnabled = await Location.hasServicesEnabledAsync().catch(
        () => false,
      );
      const permission = await Location.getForegroundPermissionsAsync().catch(
        () => ({ status: "undetermined" as const }),
      );

      setGuardianCount(guardianTotal);

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
    };
  }, [pulseValue]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboardState();
    }, [loadDashboardState]),
  );

  const handleSOSPress = useCallback(async () => {
    if (dashboardLoading || isSendingSOS) return;

    // This state disables the button so the same alert is not sent twice.
    setIsSendingSOS(true);

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(
      () => undefined,
    );

    try {
      const result = await sendSOS();
      const sentLabel =
        result.sentCount === 1 ? "1 guardian" : `${result.sentCount} guardians`;
      const failedLabel =
        result.failedCount > 0
          ? ` ${result.failedCount} message(s) failed.`
          : "";

      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);

      Alert.alert(
        "SOS Sent",
        `Your current location was sent by SMS to ${sentLabel}.${failedLabel}`,
      );
    } catch (error) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => undefined);

      Alert.alert(
        "SOS Failed",
        error instanceof Error
          ? error.message
          : "Unable to send the SOS SMS right now.",
      );
    } finally {
      setIsSendingSOS(false);
      void loadDashboardState();
    }
  }, [dashboardLoading, isSendingSOS, loadDashboardState]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroHeader}>
          <Text style={[styles.kicker, { color: theme.icon }]}>
            Personal Safety
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>SOS Control</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            Press the SOS button to send your current location by SMS to your
            guardians. This sends a one-time emergency message only.
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
                borderColor: isSendingSOS ? "#FFB4B0" : "#F48C87",
                transform: [{ scale: pulseValue }],
              },
            ]}
          >
            <TouchableOpacity
              accessibilityLabel="SOS Button"
              activeOpacity={0.88}
              disabled={dashboardLoading || isSendingSOS}
              onPress={handleSOSPress}
              style={[
                styles.sosButton,
                isSendingSOS && styles.sosButtonDisabled,
                {
                  backgroundColor: "#E53935",
                },
              ]}
            >
              {dashboardLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.sosLabel}>SOS</Text>
                  <Text style={styles.sosSubLabel}>
                    {isSendingSOS ? "Sending current location..." : "Send SMS"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={[styles.helperText, { color: theme.icon }]}>
            The button sends one SMS alert with your current Google Maps
            location. It does not start live tracking.
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
                : "Configured to receive SOS SMS alerts"}
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
              Location access is required before the app can send your SMS alert.
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
              Automatic SMS delivery uses the Supabase Edge Function and Twilio,
              so an internet connection is required.
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => router.push("/extra")}
            style={[styles.actionButton, { backgroundColor: theme.card }]}
          >
            <Text style={[styles.actionTitle, { color: theme.text }]}>
              Emergency Services
            </Text>
            <Text style={[styles.actionText, { color: theme.icon }]}>
              Open hotlines and emergency support contacts.
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
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    paddingTop: 52,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 18,
    textAlign: "center",
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
  sosButton: {
    alignItems: "center",
    borderRadius: 120,
    height: 196,
    justifyContent: "center",
    width: 196,
  },
  sosButtonDisabled: {
    opacity: 0.72,
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
    textAlign: "center",
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
  title: {
    fontSize: 38,
    fontWeight: "900",
    marginBottom: 8,
  },
});
