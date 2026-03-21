import LocationPreviewMap from "@/components/LocationPreviewMap";
import { useTheme } from "@/components/theme/ThemeContext";
import { countGuardianRecipients, loadGuardianRecipients } from "@/hooks/notifyVerifiedGuardians";
import { sendSOSWhatsAppAlert } from "@/services/sendSOSWhatsAppAlert";
import {
  EMERGENCY_SOS_TAP_WINDOW_MS,
  getEmergencyTapHint,
} from "@/lib/sosTap";
import { useInternetStatus } from "@/hooks/useInternetStatus";
import { supabase } from "@/lib/superbase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as TaskManager from "expo-task-manager";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";


import "@/lib/sosTask";

const LOCATION_PREPROMPT_CHOICE_KEY = "location_preprompt_choice_v3";

type GpsStatus = "checking" | "off" | "permission-needed" | "ready";
type SOSLaunchMode = "emergency" | "quick";

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

export default function Index() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const internetStatus = useInternetStatus();

  const pulseValue = useRef(new Animated.Value(1)).current;
  const quickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const emergencyWindowRef = useRef<NodeJS.Timeout | null>(null);
  const tapTimestampsRef = useRef<number[]>([]);

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("checking");
  const [guardianCount, setGuardianCount] = useState(0);
  const [launchMode, setLaunchMode] = useState<SOSLaunchMode | null>(null);
  const [tapCount, setTapCount] = useState(0);

  // Preprompt state from origin/main
  const [showLocationPreprompt, setShowLocationPreprompt] = useState(false);
  const [locationPrepromptBusy, setLocationPrepromptBusy] = useState(false);
  const hasShownLocationPrepromptThisLaunchRef = useRef(false);

  // Uber-style preprompt colors
  const modalSurfaceColor = "#F0F0F0";
  const modalTextColor = "#000000";
  const isLaunchingSOS = launchMode !== null;

  const closeLocationPreprompt = () => {
    setShowLocationPreprompt(false);
  };

  const clearQuickTimer = useCallback(() => {
    if (quickTimerRef.current) {
      clearTimeout(quickTimerRef.current);
      quickTimerRef.current = null;
    }
  }, []);

  const clearEmergencyWindow = useCallback(() => {
    if (emergencyWindowRef.current) {
      clearTimeout(emergencyWindowRef.current);
      emergencyWindowRef.current = null;
    }
  }, []);

  const resetTapSequence = useCallback(() => {
    clearQuickTimer();
    clearEmergencyWindow();
    tapTimestampsRef.current = [];
    setTapCount(0);
  }, [clearEmergencyWindow, clearQuickTimer]);

  const getShouldShowLocationPreprompt = useCallback(async () => {
    // 1. If we already showed it this launch, don't show it again.
    if (hasShownLocationPrepromptThisLaunchRef.current) {
      return false;
    }

    try {
      // In Expo Go/dev, permissions are often already granted to Expo Go which can
      // make it hard to validate the preprompt UX. Force-show once per launch
      // regardless of stored choice or OS grant status (testing convenience).
      if (__DEV__ && !hasShownLocationPrepromptThisLaunchRef.current) {
        return true;
      }

      // 2. If already granted, no need to show at all.
      const fg = await Location.getForegroundPermissionsAsync();
      if (fg.status === "granted") return false;

      // 3. Check persistent storage for previous decisions.
      const previousChoice = await AsyncStorage.getItem(
        LOCATION_PREPROMPT_CHOICE_KEY,
      );

      // If they explicitly denied, we respect that and don't show it again this launch.
      if (previousChoice === "deny") return false;

      // If they chose "allow_while", we check why it's not granted yet. 
      // If it's not granted, it means they might have revoked it or it's a new session.
      if (previousChoice === "allow_while") return true;

      // Default: If they haven't seen it or haven't made a permanent choice, show it.
      return true;
    } catch {
      return true;
    }
  }, []);

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

      const guardianTotal = await countGuardianRecipients(userId).catch(
        () => 0,
      );
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
      resetTapSequence();
    };
  }, [pulseValue, resetTapSequence]);

  useFocusEffect(
    useCallback(() => {
      setLaunchMode(null);
      resetTapSequence();
      void loadDashboardState();

      let cancelled = false;
      void (async () => {
        const shouldShow = await getShouldShowLocationPreprompt();
        if (cancelled) return;
        if (shouldShow) {
          hasShownLocationPrepromptThisLaunchRef.current = true;
          setShowLocationPreprompt(true);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [loadDashboardState, getShouldShowLocationPreprompt, resetTapSequence]),
  );

  useEffect(() => {
    const sub = (AppState as any)?.addEventListener?.(
      "change",
      (state: any) => {
        if (state !== "active") return;
        // Keep the ref true if it was already shown; don't reset it just because the app was backgrounded.

        void (async () => {
          try {
            const shouldShow = await getShouldShowLocationPreprompt();
            if (shouldShow) {
              hasShownLocationPrepromptThisLaunchRef.current = true;
              setShowLocationPreprompt(true);
            }
          } catch {
            // ignore
          }
        })();
      },
    );

    return () => {
      sub?.remove?.();
    };
  }, [getShouldShowLocationPreprompt]);

  const requestForegroundLocationWithChoice = async (
    choice: "once" | "while",
  ) => {
    if (locationPrepromptBusy) return;
    setLocationPrepromptBusy(true);

    try {
      try {
        await AsyncStorage.removeItem(LOCATION_PREPROMPT_CHOICE_KEY);
      } catch {
        // ignore
      }

      setShowLocationPreprompt(false);
      await new Promise<void>((resolve) => setTimeout(resolve, 250));

      const res = await Location.requestForegroundPermissionsAsync();

      if (choice === "while" && res.status === "granted") {
        try {
          await AsyncStorage.setItem(
            LOCATION_PREPROMPT_CHOICE_KEY,
            "allow_while",
          );
        } catch {
          // ignore
        }
      }
    } finally {
      setLocationPrepromptBusy(false);
      void loadDashboardState();
    }
  };

  const dismissLocationPreprompt = async () => {
    if (locationPrepromptBusy) return;
    try {
      await AsyncStorage.setItem(LOCATION_PREPROMPT_CHOICE_KEY, "deny");
    } catch {
      // ignore
    }
    setShowLocationPreprompt(false);
  };

  const triggerSOSFlow = useCallback(
    async (mode: "quick" | "emergency") => {
      // Navigate immediately to context-rich loading screen
      router.push({
        params: { mode },
        pathname: "/sos/loading",
      });

      // Reset local tap state
      setLaunchMode(null);
      resetTapSequence();
    },
    [resetTapSequence, router],
  );

  const handleSOSPress = useCallback(() => {
    if (dashboardLoading || isLaunchingSOS) return;

    const now = Date.now();
    const recentTaps = tapTimestampsRef.current.filter(
      (timestamp) => now - timestamp <= EMERGENCY_SOS_TAP_WINDOW_MS,
    );
    const nextTaps = [...recentTaps, now];

    tapTimestampsRef.current = nextTaps;
    setTapCount(nextTaps.length);

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => undefined,
    );


    if (nextTaps.length >= 3) {
      clearQuickTimer();
      clearEmergencyWindow();
      void triggerSOSFlow("emergency");
      return;
    }

    // Single tap starts a quick SOS after the emergency tap window expires.
    if (nextTaps.length === 1) {
      clearQuickTimer();
      quickTimerRef.current = setTimeout(() => {
        quickTimerRef.current = null;
        void triggerSOSFlow("quick");
      }, EMERGENCY_SOS_TAP_WINDOW_MS);
    }
  }, [
    clearEmergencyWindow,
    clearQuickTimer,
    dashboardLoading,
    isLaunchingSOS,
    triggerSOSFlow,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroHeader}>
          <Text style={[styles.kicker, { color: theme.icon }]}>
            {t('personal_safety')}
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>{t('sos_control')}</Text>
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
                borderColor: isLaunchingSOS ? "#FFB4B0" : "#F48C87",
                transform: [{ scale: pulseValue }],
              },
            ]}
          >
            <TouchableOpacity
              accessibilityLabel="SOS Button"
              activeOpacity={0.88}
              disabled={dashboardLoading || isLaunchingSOS}
              onPress={handleSOSPress}
              style={[
                styles.sosButton,
                isLaunchingSOS && styles.sosButtonDisabled,
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
                    {launchMode === "emergency"
                      ? "Starting emergency SOS..."
                      : launchMode === "quick"
                        ? "Starting Quick SOS..."
                        : "Tap now"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={[styles.helperText, { color: theme.icon }]}>
            1 tap = Quick SOS. 3 taps = Emergency SOS.
          </Text>
          <Text style={[styles.helperText, { color: theme.icon }]}>
            {getEmergencyTapHint(tapCount)}
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
              {t('guardians')}
            </Text>
            <Text style={[styles.statusValue, { color: theme.text }]}>
              {guardianCount}
            </Text>
            <Text style={[styles.statusHint, { color: theme.icon }]}>
              {guardianCount === 0
                ? t('add_guardians_before_sos')
                : t('guardians_desc')}
            </Text>
          </View>

          <View
            style={[
              styles.statusCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.statusLabel, { color: theme.icon }]}>{t('gps')}</Text>
            <Text style={[styles.statusValue, { color: theme.text }]}>
              {formatGpsStatus(gpsStatus)}
            </Text>
            <Text style={[styles.statusHint, { color: theme.icon }]}>
              Location access is required before the app can send your SMS
              alert.
            </Text>
          </View>

          <View
            style={[
              styles.statusCardWide,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.statusLabel, { color: theme.icon }]}>
              {t('internet')}
            </Text>
            <Text style={[styles.statusValue, { color: theme.text }]}>
              {formatInternetStatus(internetStatus)}
            </Text>
            <Text style={[styles.statusHint, { color: theme.icon }]}>
              Automatic guardian alerts need a connected network and backend
              endpoint.
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => router.push("/extra")}
            style={[styles.actionButton, { backgroundColor: theme.card }]}
          >
            <Text style={[styles.actionTitle, { color: theme.text }]}>
              {t('emergency_services')}
            </Text>
            <Text style={[styles.actionText, { color: theme.icon }]}>
              {t('open_hotlines_desc')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/auth/addguardians" as any)}
            style={[styles.actionButton, { backgroundColor: theme.card }]}
          >
            <Text style={[styles.actionTitle, { color: theme.text }]}>
              {guardianCount === 0 ? t('add_guardians') : t('manage_guardians')}
            </Text>
            <Text style={[styles.actionText, { color: theme.icon }]}>
              {guardianCount === 0
                ? t('setup_contacts_emergency_desc')
                : t('manage_guardians_desc')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showLocationPreprompt}
        transparent
        animationType="fade"
        onRequestClose={closeLocationPreprompt}
      >
        <View style={styles.locationModalWrap}>
          <Pressable
            style={styles.locationBackdrop}
            onPress={closeLocationPreprompt}
          />

          <View
            style={[
              styles.locationSheet,
              { backgroundColor: modalSurfaceColor, borderColor: theme.border },
            ]}
          >
            <View style={styles.locationSheetInner}>
              <View style={styles.locationContent}>
                <View style={styles.locationHeader}>
                  <Text
                    style={[styles.locationTitle, { color: modalTextColor }]}
                  >
                    Allow “Safety on Speed” to use your location?
                  </Text>
                  <Text
                    style={[styles.locationBody, { color: modalTextColor }]}
                  >
                    To improve SOS support and nearby safety features, we
                    collect location data while you use the app.
                  </Text>
                </View>

                <View style={styles.locationMapWrap}>
                  <View style={styles.locationMapCard}>
                    <LocationPreviewMap />
                    <View style={styles.preciseChip}>
                      <Text style={styles.preciseChipText}>Precise: On</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.locationActions}>
                <Pressable
                  disabled={locationPrepromptBusy}
                  style={[
                    styles.locationActionBtn,
                    { borderTopColor: theme.border },
                  ]}
                  onPress={() => {
                    void requestForegroundLocationWithChoice("once");
                  }}
                >
                  <Text
                    style={[styles.locationActionText, { color: "#007AFF" }]}
                  >
                    Allow Once
                  </Text>
                </Pressable>

                <Pressable
                  disabled={locationPrepromptBusy}
                  style={[
                    styles.locationActionBtn,
                    { borderTopColor: theme.border },
                  ]}
                  onPress={() => {
                    void requestForegroundLocationWithChoice("while");
                  }}
                >
                  <Text
                    style={[styles.locationActionText, { color: "#007AFF" }]}
                  >
                    Allow While Using App
                  </Text>
                </Pressable>

                <Pressable
                  disabled={locationPrepromptBusy}
                  style={[
                    styles.locationActionBtnLast,
                    { borderTopColor: theme.border },
                  ]}
                  onPress={() => {
                    void dismissLocationPreprompt();
                  }}
                >
                  <Text
                    style={[styles.locationActionText, { color: "#007AFF" }]}
                  >
                    Don’t Allow
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  title: {
    fontSize: 38,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 560,
  },
  locationModalWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  locationBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  locationSheet: {
    width: "82%",
    maxWidth: 440,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  locationSheetInner: {
    flex: 1,
    justifyContent: "space-between",
  },
  locationContent: {
    flexShrink: 1,
  },
  locationHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  locationMapWrap: {
    width: "100%",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  locationMapCard: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "#ffffff",
  },
  preciseChip: {
    position: "absolute",
    left: 12,
    top: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  preciseChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#007AFF",
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  locationBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    opacity: 0.85,
  },
  locationActions: {
    backgroundColor: "rgba(240,240,240,0.96)",
  },
  locationActionBtn: {
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 1,
  },
  locationActionBtnLast: {
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 1,
  },
  locationActionText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
