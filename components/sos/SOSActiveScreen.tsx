import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  buildSOSShareUrl,
  getSOSSessionById,
  getSOSStatusMessage,
  getStoredActiveSOSSession,
  mapSOSSessionRowToStoredSession,
  openPendingGuardianAlert,
  removeSOSSubscription,
  stopSOS,
  subscribeToSOSSessionById,
  triggerCall119,
  type SOSSessionRow,
  type StoredSOSSession,
} from "@/lib/sosService";
import { useTheme } from "@/components/theme/ThemeContext";

function getRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatDeliveryStatus(session: StoredSOSSession | null) {
  if (!session) return "Preparing guardian alerts";

  if (session.alertDeliveryStatus === "sent") {
    if (session.alertDeliveryMethod === "sms-api") {
      return "Guardians alerted by SMS";
    }

    if (session.alertDeliveryMethod === "whatsapp-api") {
      return "Guardians alerted automatically";
    }

    return "Guardian alert prepared";
  }

  if (session.alertDeliveryStatus === "pending") {
    return "Alert automation needs manual confirmation";
  }

  return "No guardian alert sent";
}

export default function SOSActiveScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    autoCall?: string | string[];
    sessionId?: string | string[];
  }>();

  const autoCall = getRouteParam(params.autoCall) === "1";
  const requestedSessionId = getRouteParam(params.sessionId);
  const didAutoCallRef = useRef(false);

  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionRow, setSessionRow] = useState<SOSSessionRow | null>(null);
  const [storedSession, setStoredSession] = useState<StoredSOSSession | null>(null);
  const [sharingAlert, setSharingAlert] = useState(false);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const stored = await getStoredActiveSOSSession();
        const sessionId = requestedSessionId ?? stored?.sessionId ?? null;

        if (!sessionId) {
          if (isMounted) setLoading(false);
          return;
        }

        const row = await getSOSSessionById(sessionId);
        if (!isMounted) return;

        setStoredSession(
          stored?.sessionId === sessionId
            ? stored
            : row
              ? mapSOSSessionRowToStoredSession(row)
              : null,
        );
        setSessionRow(row);
      } catch (error) {
        if (isMounted) {
          Alert.alert("Unable to load SOS alert", getSOSStatusMessage(error));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadSession();

    const channel =
      requestedSessionId !== null
        ? subscribeToSOSSessionById(requestedSessionId, (row) => {
            if (!isMounted) return;
            setSessionRow(row);
            setStoredSession((current) =>
              row
                ? {
                    ...(current ?? mapSOSSessionRowToStoredSession(row)),
                    ...mapSOSSessionRowToStoredSession(row),
                  }
                : current,
            );
          })
        : null;

    return () => {
      isMounted = false;
      void removeSOSSubscription(channel);
    };
  }, [requestedSessionId]);

  useEffect(() => {
    if (!autoCall || didAutoCallRef.current || !storedSession) return;
    didAutoCallRef.current = true;

    const timeoutId = setTimeout(() => {
      void triggerCall119().catch((error) => {
        Alert.alert("Unable to call 119", getSOSStatusMessage(error));
      });
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [autoCall, storedSession]);

  const shareUrl = useMemo(() => {
    if (storedSession?.shareUrl) return storedSession.shareUrl;
    if (sessionRow?.share_token) return buildSOSShareUrl(sessionRow.share_token);
    return null;
  }, [sessionRow, storedSession]);

  const iframeSrc = useMemo(() => {
    if (sessionRow?.last_lat == null || sessionRow?.last_lng == null) return null;
    return `https://www.google.com/maps/@${sessionRow.last_lat},${sessionRow.last_lng},16z?output=embed`;
  }, [sessionRow]);

  async function handleStopAlert() {
    const sessionId = storedSession?.sessionId ?? sessionRow?.id;
    if (!sessionId || stopping) return;

    setStopping(true);
    try {
      await stopSOS(sessionId);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Unable to stop SOS", getSOSStatusMessage(error));
    } finally {
      setStopping(false);
    }
  }

  async function handleShareLink() {
    if (!shareUrl) return;

    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(shareUrl);
      Alert.alert("Copied", "The live SOS link has been copied.");
      return;
    }

    await Share.share({
      message: `Live SOS link: ${shareUrl}`,
      title: "SOS Live Link",
    });
  }

  async function handleManualGuardianAlert() {
    if (!storedSession || sharingAlert) return;

    setSharingAlert(true);
    try {
      const nextSession = await openPendingGuardianAlert(storedSession);
      setStoredSession(nextSession);
    } catch (error) {
      Alert.alert("Unable to open WhatsApp", getSOSStatusMessage(error));
    } finally {
      setSharingAlert(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      </View>
    );
  }

  if (!storedSession || !sessionRow) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.title, { color: theme.text }]}>No active SOS alert</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>SOS Active</Text>
        <Text style={[styles.subtitle, { color: theme.icon }]}>
          {storedSession.mode === "emergency" ? "Emergency SOS" : "Quick SOS"}
        </Text>
      </View>

      {iframeSrc ? (
        <>
          <iframe
            title="sos-active-map"
            src={iframeSrc}
            loading="lazy"
            onLoad={() => setIframeLoaded(true)}
            style={styles.iframe}
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          {!iframeLoaded && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#E53935" />
            </View>
          )}
        </>
      ) : (
        <View
          style={[
            styles.emptyMap,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.emptyMapText, { color: theme.icon }]}>
            Waiting for the first location update.
          </Text>
        </View>
      )}

      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.summaryLine, { color: theme.text }]}>
          Guardians: {storedSession.guardianCount}
        </Text>
        <Text style={[styles.summaryLine, { color: theme.text }]}>
          Last update:{" "}
          {sessionRow.last_updated_at
            ? new Date(sessionRow.last_updated_at).toLocaleString()
            : "Pending"}
        </Text>
        <Text style={[styles.summaryLine, { color: theme.text }]}>
          Delivery: {formatDeliveryStatus(storedSession)}
        </Text>
      </View>

      <View style={styles.buttonGrid}>
        <TouchableOpacity onPress={handleStopAlert} style={styles.dangerButton}>
          <Text style={styles.buttonText}>{stopping ? "Stopping..." : "Stop Alert"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            void triggerCall119().catch((error) => {
              Alert.alert("Unable to call 119", getSOSStatusMessage(error));
            })
          }
          style={styles.darkButton}
        >
          <Text style={styles.buttonText}>Call 119</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShareLink} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Copy Live Link</Text>
        </TouchableOpacity>
        {storedSession.alertDeliveryStatus === "pending" && (
          <TouchableOpacity onPress={handleManualGuardianAlert} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>
              {sharingAlert ? "Opening..." : "Alert Guardians"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    padding: 20,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  centerContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  container: {
    flex: 1,
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: "#E53935",
    borderRadius: 16,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 16,
  },
  darkButton: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 16,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 16,
  },
  emptyMap: {
    borderRadius: 22,
    borderWidth: 1,
    height: 240,
    justifyContent: "center",
    marginHorizontal: 20,
  },
  emptyMapText: {
    fontSize: 15,
    textAlign: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 18,
  },
  iframe: {
    border: 0,
    flex: 1,
    width: "100%",
  } as any,
  loadingOverlay: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 999,
    padding: 12,
    position: "absolute",
    top: 100,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#DDE7F7",
    borderRadius: 16,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 16,
  },
  secondaryText: {
    color: "#102A56",
    fontSize: 14,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: -18,
    padding: 20,
  },
  summaryLine: {
    fontSize: 15,
    lineHeight: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
  },
});
