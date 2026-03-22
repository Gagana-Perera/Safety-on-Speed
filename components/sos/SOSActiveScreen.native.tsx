import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  buildGoogleMapsUrl,
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

function formatAlertStatus(session: StoredSOSSession | null) {
  if (!session) return "Preparing guardian alerts";

  if (session.alertDeliveryStatus === "sent") {
    if (session.alertDeliveryMethod === "sms-api") {
      return "Guardians alerted by SMS";
    }

    return session.alertDeliveryMethod === "whatsapp-api"
      ? "Guardians alerted automatically"
      : "Guardian alert prepared";
  }

  if (session.alertDeliveryStatus === "pending") {
    return "WhatsApp automation needs manual confirmation";
  }

  return "No guardian alert sent";
}

export default function SOSActiveScreenNative() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    autoCall?: string | string[];
    sessionId?: string | string[];
  }>();

  const autoCall = getRouteParam(params.autoCall) === "1";
  const requestedSessionId = getRouteParam(params.sessionId);
  const didAutoCallRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [sessionRow, setSessionRow] = useState<SOSSessionRow | null>(null);
  const [storedSession, setStoredSession] = useState<StoredSOSSession | null>(null);
  const [stopping, setStopping] = useState(false);
  const [sharingAlert, setSharingAlert] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const stored = await getStoredActiveSOSSession();
        const sessionId = requestedSessionId ?? stored?.sessionId ?? null;

        if (!sessionId) {
          if (isMounted) {
            setLoading(false);
          }
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
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSession();

    const channel =
      requestedSessionId !== null
        ? subscribeToSOSSessionById(
            requestedSessionId,
            (row) => {
              if (!isMounted) return;
              setSessionRow(row);
              setStoredSession((current) => {
                if (!row) return current;
                const mapped = mapSOSSessionRowToStoredSession(row);
                return current
                  ? {
                      ...current,
                      ...mapped,
                      alertDeliveryMethod:
                        current.alertDeliveryMethod ?? mapped.alertDeliveryMethod,
                      alertDeliveryStatus:
                        current.alertDeliveryStatus ?? mapped.alertDeliveryStatus,
                    }
                  : mapped;
              });
            },
            (error) => {
              if (isMounted) {
                console.warn(error.message);
              }
            },
          )
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

  const region = useMemo(() => {
    if (sessionRow?.last_lat == null || sessionRow?.last_lng == null) return null;

    return {
      latitude: sessionRow.last_lat,
      latitudeDelta: 0.01,
      longitude: sessionRow.last_lng,
      longitudeDelta: 0.01,
    };
  }, [sessionRow]);

  const lastUpdated =
    sessionRow?.last_updated_at ?? storedSession?.lastUpdatedAt ?? null;

  async function handleStopAlert() {
    const sessionId = storedSession?.sessionId ?? sessionRow?.id;
    if (!sessionId || stopping) return;

    setStopping(true);

    try {
      await stopSOS(sessionId);
      Alert.alert("SOS stopped", "Your alert has been ended safely.");
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Unable to stop SOS", getSOSStatusMessage(error));
    } finally {
      setStopping(false);
    }
  }

  async function handleShareLink() {
    if (!shareUrl) return;

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
      Alert.alert("WhatsApp opened", "Finish sending the alert to your guardians.");
    } catch (error) {
      Alert.alert("Unable to open WhatsApp", getSOSStatusMessage(error));
    } finally {
      setSharingAlert(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top", "left", "right", "bottom"]}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      </SafeAreaView>
    );
  }

  if (!storedSession || !sessionRow) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top", "left", "right", "bottom"]}
      >
        <View style={styles.centerContent}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No active SOS alert
          </Text>
          <Text style={[styles.emptyText, { color: theme.icon }]}>
            Start a Quick SOS or Emergency SOS from the home screen first.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Back Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>SOS Active</Text>
        <Text style={[styles.subtitle, { color: theme.icon }]}>
          {storedSession.mode === "emergency" ? "Emergency SOS" : "Quick SOS"}
        </Text>
      </View>

      {region ? (
        <MapView style={styles.mapPreview} region={region}>
          <Marker
            coordinate={{
              latitude: region.latitude,
              longitude: region.longitude,
            }}
            title="Latest SOS location"
            description="Live location preview"
          />
        </MapView>
      ) : (
        <View
          style={[
            styles.mapFallback,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.mapFallbackTitle, { color: theme.text }]}>
            Waiting for location
          </Text>
          <Text style={[styles.mapFallbackText, { color: theme.icon }]}>
            The SOS session exists, but the device has not posted a location yet.
          </Text>
        </View>
      )}

      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.icon }]}>
            Guardians
          </Text>
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            {storedSession.guardianCount}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.icon }]}>
            Last location update
          </Text>
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            {lastUpdated ? new Date(lastUpdated).toLocaleString() : "Pending"}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.icon }]}>
            Tracking
          </Text>
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            {sessionRow.status === "active" ? "Running" : "Ended"}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.icon }]}>
            Alert delivery
          </Text>
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            {formatAlertStatus(storedSession)}
          </Text>
        </View>

        {sessionRow.last_lat != null && sessionRow.last_lng != null && (
          <TouchableOpacity
            onPress={() =>
              void Linking.openURL(
                buildGoogleMapsUrl(sessionRow.last_lat!, sessionRow.last_lng!),
              ).catch(() => {
                Alert.alert("Unable to open maps", "Please try again.");
              })
            }
            style={styles.inlineLinkButton}
          >
            <Text style={styles.inlineLinkText}>Open current location in Maps</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.buttonGrid}>
        <TouchableOpacity
          disabled={stopping}
          onPress={handleStopAlert}
          style={styles.dangerButton}
        >
          <Text style={styles.dangerButtonText}>
            {stopping ? "Stopping..." : "Stop Alert"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            void triggerCall119().catch((error) => {
              Alert.alert("Unable to call 119", getSOSStatusMessage(error));
            })
          }
          style={styles.darkButton}
        >
          <Text style={styles.darkButtonText}>Call 119</Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={!shareUrl}
          onPress={handleShareLink}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Share Live Link</Text>
        </TouchableOpacity>

        {storedSession.alertDeliveryStatus === "pending" && (
          <TouchableOpacity
            disabled={sharingAlert}
            onPress={handleManualGuardianAlert}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              {sharingAlert ? "Opening..." : "Alert Guardians"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    padding: 20,
    paddingTop: 14,
  },
  centerContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  container: {
    flex: 1,
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: "#E53935",
    borderRadius: 16,
    flexGrow: 1,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  dangerButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
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
  darkButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    marginTop: 8,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: "900",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  inlineLinkButton: {
    marginTop: 16,
  },
  inlineLinkText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "700",
  },
  mapFallback: {
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 20,
    minHeight: 210,
    padding: 20,
    justifyContent: "center",
  },
  mapFallbackText: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  mapFallbackTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  mapPreview: {
    borderRadius: 24,
    height: 240,
    marginHorizontal: 20,
    overflow: "hidden",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#E53935",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 22,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
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
  secondaryButtonText: {
    color: "#102A56",
    fontSize: 15,
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
    marginTop: 18,
    padding: 20,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryRow: {
    gap: 4,
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
  },
});
