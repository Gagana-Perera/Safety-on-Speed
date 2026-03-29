import { useTheme } from "@/components/theme/ThemeContext";
import { countGuardianRecipients } from "@/hooks/notifyVerifiedGuardians";
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
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { globalStyles } from "@/styles/global";
import "@/lib/sosTask";

const LOCATION_PREPROMPT_CHOICE_KEY = "location_preprompt_choice_v3";
const LOCATION_PREPROMPT_PENDING_KEY = "location_preprompt_pending_v1";

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
      // 2. If already granted, no need to show at all.
      const fg = await Location.getForegroundPermissionsAsync();
      if (fg.status === "granted") {
        await AsyncStorage.removeItem(LOCATION_PREPROMPT_PENDING_KEY).catch(
          () => undefined,
        );
        return false;
      }

      const pendingAfterSignup = await AsyncStorage.getItem(
        LOCATION_PREPROMPT_PENDING_KEY,
      );
      if (pendingAfterSignup === "true") {
        return true;
      }

      // 3. Check persistent storage for previous decisions.
      const previousChoice = await AsyncStorage.getItem(
        LOCATION_PREPROMPT_CHOICE_KEY,
      );

      // If they explicitly denied, we respect that and don't show it again this launch.
      if (previousChoice === "deny") return false;

      // If they previously opted in but permission is not granted now,
      // prompt again so they can re-enable access.
      if (previousChoice === "allow") return true;

      // Outside the signup onboarding flow, don't force the popup on every launch.
      return false;
    } catch {
      return false;
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

  const requestForegroundLocationPermission = async () => {
    if (locationPrepromptBusy) return;
    setLocationPrepromptBusy(true);

    try {
      try {
        await AsyncStorage.removeItem(LOCATION_PREPROMPT_CHOICE_KEY);
        await AsyncStorage.removeItem(LOCATION_PREPROMPT_PENDING_KEY);
      } catch {
        // ignore
      }

      setShowLocationPreprompt(false);
      await new Promise<void>((resolve) => setTimeout(resolve, 250));

      const res = await Location.requestForegroundPermissionsAsync();

      if (res.status === "granted") {
        try {
          await AsyncStorage.setItem(LOCATION_PREPROMPT_CHOICE_KEY, "allow");
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
      await AsyncStorage.removeItem(LOCATION_PREPROMPT_PENDING_KEY);
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
      await AsyncStorage.setItem('sos_triggered_at', Date.now().toString());

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
    <View style={[globalStyles.homeContainer, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={globalStyles.homeContent}>
        <View style={globalStyles.homeHeroHeader}>
          <Text style={[globalStyles.homeKicker, { color: theme.icon }]}>
            {t('personal_safety')}
          </Text>
          <Text style={[globalStyles.homeTitle, { color: theme.text }]}>{t('sos_control')}</Text>
          <Text style={[globalStyles.homeSubtitle, { color: theme.icon }]}>
            {t('sos_control_desc')}
          </Text>
        </View>

        <View
          style={[
            globalStyles.homeHeroCard,
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

          <Text style={[globalStyles.homeHelperText, { color: theme.icon }]}>
            {getEmergencyTapHint(tapCount)}
          </Text>
        </View>

        <View style={globalStyles.homeStatusGrid}>
          <View
            style={[
              globalStyles.homeStatusCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[globalStyles.homeStatusLabel, { color: theme.icon }]}>
              {t('guardians')}
            </Text>
            <Text style={[globalStyles.homeStatusValue, { color: theme.text }]}>
              {guardianCount}
            </Text>
            <Text style={[globalStyles.homeStatusHint, { color: theme.icon }]}>
              {guardianCount === 0
                ? t('add_guardians_before_sos')
                : t('guardians_desc')}
            </Text>
          </View>

          <View
            style={[
              globalStyles.homeStatusCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[globalStyles.homeStatusLabel, { color: theme.icon }]}>{t('gps')}</Text>
            <Text style={[globalStyles.homeStatusValue, { color: theme.text }]}>
              {formatGpsStatus(gpsStatus)}
            </Text>
            <Text style={[globalStyles.homeStatusHint, { color: theme.icon }]}>
              {t('gps_ready_desc')}
            </Text>
          </View>

          <View
            style={[
              globalStyles.homeStatusCardWide,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[globalStyles.homeStatusLabel, { color: theme.icon }]}>
              {t('internet')}
            </Text>
            <Text style={[globalStyles.homeStatusValue, { color: theme.text }]}>
              {formatInternetStatus(internetStatus)}
            </Text>
            <Text style={[globalStyles.homeStatusHint, { color: theme.icon }]}>
              {t('offline_desc')}
            </Text>
          </View>
        </View>

        <View style={globalStyles.homeActionRow}>
          <TouchableOpacity
            onPress={() => router.push("/emergency")}
            style={[globalStyles.homeActionButton, { backgroundColor: theme.card }]}
          >
            <Text style={[globalStyles.homeActionTitle, { color: theme.text }]}>
              {t('emergency_services')}
            </Text>
            <Text style={[globalStyles.homeActionText, { color: theme.icon }]}>
              {t('open_hotlines_desc')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/auth/addguardians" as any)}
            style={[globalStyles.homeActionButton, { backgroundColor: theme.card }]}
          >
            <Text style={[globalStyles.homeActionTitle, { color: theme.text }]}>
              {guardianCount === 0 ? t('add_guardians') : t('manage_guardians')}
            </Text>
            <Text style={[globalStyles.homeActionText, { color: theme.icon }]}>
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
        statusBarTranslucent
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

                <View style={styles.locationPreviewWrap}>
                  <View style={styles.locationPreviewCard}>
                    <View style={styles.locationPulseOuter}>
                      <View style={styles.locationPulseInner}>
                        <View style={styles.locationPinStem} />
                        <View style={styles.locationPinDot} />
                      </View>
                    </View>
                    <Text style={styles.locationPreviewTitle}>Current location</Text>
                    <Text style={styles.locationPreviewText}>
                      Used for SOS alerts, nearby emergency services, and live
                      safety features while you use the app.
                    </Text>
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
                    void requestForegroundLocationPermission();
                  }}
                >
                  <Text
                    style={[styles.locationActionText, { color: "#007AFF" }]}
                  >
                    Allow
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
  locationPreviewWrap: {
    width: "100%",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  locationPreviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  locationPulseOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  locationPulseInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  locationPinStem: {
    width: 8,
    height: 14,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    marginTop: 6,
  },
  locationPinDot: {
    position: "absolute",
    top: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
  },
  locationPreviewTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  locationPreviewText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#374151",
    textAlign: "center",
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
