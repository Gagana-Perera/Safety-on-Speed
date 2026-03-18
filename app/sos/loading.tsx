import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  getSOSStatusMessage,
  startEmergencySOS,
  startQuickSOS,
  type StartSOSProgress,
} from "@/lib/sosService";

import { useTheme } from "../themeContext";

const STEP_ORDER: StartSOSProgress["key"][] = [
  "creating_session",
  "capturing_location",
  "alerting_guardians",
  "starting_tracking",
];

export default function SOSLoadingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const pulseValue = useRef(new Animated.Value(1)).current;
  const startedRef = useRef(false);

  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const mode = modeParam === "emergency" ? "emergency" : "quick";

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stepLabels, setStepLabels] = useState<Record<string, string>>({});
  const [stepsDone, setStepsDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          duration: 700,
          toValue: 1.12,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          duration: 700,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulseValue]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const starter = mode === "emergency" ? startEmergencySOS : startQuickSOS;

    const handleProgress = (progress: StartSOSProgress) => {
      setStepLabels((current) => ({
        ...current,
        [progress.key]: progress.label,
      }));
      setStepsDone((current) => ({
        ...current,
        [progress.key]: progress.done,
      }));
    };

    void starter(handleProgress)
      .then((result) => {
        router.replace({
          params: {
            autoCall: mode === "emergency" ? "1" : "0",
            sessionId: result.session.sessionId,
          },
          pathname: "/sos/active",
        });
      })
      .catch((error) => {
        setErrorMessage(getSOSStatusMessage(error));
      });
  }, [mode, router]);

  const title =
    mode === "emergency" ? "Emergency SOS..." : "Sending SOS...";

  const subtitle =
    mode === "emergency"
      ? "Preparing the emergency flow and your live location link."
      : "Preparing your quick alert and live tracking session.";

  const stepItems = useMemo(
    () =>
      STEP_ORDER.map((key) => ({
        done: stepsDone[key] === true,
        label:
          stepLabels[key] ??
          (key === "creating_session"
            ? "Creating SOS session"
            : key === "capturing_location"
              ? "Capturing location"
              : key === "alerting_guardians"
                ? "Preparing guardian alerts"
                : "Starting tracking"),
      })),
    [stepLabels, stepsDone],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.signalCore,
            {
              backgroundColor:
                mode === "emergency" ? "#C62828" : "#E53935",
              transform: [{ scale: pulseValue }],
            },
          ]}
        >
          <Text style={styles.signalText}>SOS</Text>
        </Animated.View>

        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.icon }]}>{subtitle}</Text>

        <View
          style={[
            styles.progressCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {stepItems.map((step, index) => (
            <View key={STEP_ORDER[index]} style={styles.progressRow}>
              <View
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: step.done ? "#16A34A" : "transparent",
                    borderColor: step.done ? "#16A34A" : theme.border,
                  },
                ]}
              >
                {step.done ? (
                  <Text style={styles.progressCheck}>✓</Text>
                ) : (
                  <ActivityIndicator color={theme.icon} size="small" />
                )}
              </View>
              <Text style={[styles.progressText, { color: theme.text }]}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {errorMessage ? (
          <View
            style={[
              styles.errorCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={styles.errorTitle}>SOS could not start</Text>
            <Text style={[styles.errorText, { color: theme.text }]}>
              {errorMessage}
            </Text>

            <View style={styles.errorActions}>
              <TouchableOpacity
                onPress={() => router.replace("/(tabs)")}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Back Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  router.replace({
                    params: { mode },
                    pathname: "/sos/loading",
                  })
                }
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  errorActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  errorCard: {
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 22,
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  errorTitle: {
    color: "#C62828",
    fontSize: 20,
    fontWeight: "800",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#E53935",
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  progressCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 30,
    padding: 20,
  },
  progressCheck: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  progressDot: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    marginRight: 14,
    width: 36,
  },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  progressText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#334155",
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  signalCore: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 110,
    height: 180,
    justifyContent: "center",
    marginBottom: 26,
    width: 180,
  },
  signalText: {
    color: "#FFFFFF",
    fontSize: 46,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 12,
    textAlign: "center",
  },
});
