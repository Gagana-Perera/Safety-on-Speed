import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/components/theme/ThemeContext";
import {
  getSOSSession,
  SOS_TRACKING_POLL_MS,
  stopSOS,
  updateLocation,
} from "@/lib/sosLiveTracking";
import { buildGoogleMapsUrl, getSOSStatusMessage, type SOSSessionRow } from "@/lib/sosService";
import { supabase } from "@/lib/superbase";

function getRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function SOSShareScreenNative() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const shareToken = getRouteParam(params.token);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionRow, setSessionRow] = useState<SOSSessionRow | null>(null);
  const [stopping, setStopping] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) {
      setErrorMessage("This SOS link is missing its share token.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadSession = async () => {
      try {
        const [row, authState] = await Promise.all([
          getSOSSession(shareToken),
          supabase.auth.getSession(),
        ]);
        if (!isMounted) return;

        const viewerId = authState.data.session?.user?.id ?? null;
        setIsOwner(Boolean(row && viewerId && row.user_id === viewerId));

        if (row) {
          setSessionRow(row);
          setErrorMessage(
            row.status === "active"
              ? null
              : "This SOS session has already been stopped.",
          );
        } else {
          setSessionRow((current) => current);
          setErrorMessage("This SOS session could not be found.");
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getSOSStatusMessage(error));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSession();
    const pollId = setInterval(() => {
      void loadSession();
    }, SOS_TRACKING_POLL_MS);

    return () => {
      isMounted = false;
      clearInterval(pollId);
    };
  }, [shareToken]);

  useEffect(() => {
    if (!shareToken || !isOwner || sessionRow?.status !== "active") {
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isCancelled = false;

    // The owner page keeps pushing the newest coordinates to Supabase.
    const sendCurrentLocation = async () => {
      try {
        const currentPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (isCancelled) return;

        await updateLocation(
          shareToken,
          currentPosition.coords.latitude,
          currentPosition.coords.longitude,
        );

        if (!isCancelled) {
          setTrackingError(null);
        }
      } catch (error) {
        if (!isCancelled) {
          setTrackingError(getSOSStatusMessage(error));
        }
      }
    };

    const startTracking = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (isCancelled) return;

        if (permission.status !== "granted") {
          setTrackingError(
            "Location permission is required to keep SOS live tracking updated.",
          );
          return;
        }

        await sendCurrentLocation();
        intervalId = setInterval(() => {
          void sendCurrentLocation();
        }, SOS_TRACKING_POLL_MS);
      } catch (error) {
        if (!isCancelled) {
          setTrackingError(getSOSStatusMessage(error));
        }
      }
    };

    void startTracking();

    return () => {
      isCancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isOwner, sessionRow?.status, shareToken]);

  const region = useMemo(() => {
    if (sessionRow?.last_lat == null || sessionRow?.last_lng == null) return null;

    return {
      latitude: sessionRow.last_lat,
      latitudeDelta: 0.01,
      longitude: sessionRow.last_lng,
      longitudeDelta: 0.01,
    };
  }, [sessionRow]);

  async function openInMaps() {
    if (!region) return;

    try {
      await Linking.openURL(buildGoogleMapsUrl(region.latitude, region.longitude));
    } catch {
      Alert.alert("Unable to open maps", "Please try again in a moment.");
    }
  }

  async function handleStopSOS() {
    if (!shareToken || stopping) return;

    setStopping(true);
    try {
      const stoppedSession = await stopSOS(shareToken);
      setSessionRow(stoppedSession);
      setErrorMessage("This SOS session has already been stopped.");
    } catch (error) {
      Alert.alert("Unable to stop SOS", getSOSStatusMessage(error));
    } finally {
      setStopping(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Live SOS Link</Text>
        <Text style={[styles.subtitle, { color: theme.icon }]}>
          {sessionRow?.user_name || "Safety on Speed user"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : !sessionRow ? (
        <View style={styles.centerContent}>
          <Text style={[styles.message, { color: theme.text }]}>
            {errorMessage ?? "This SOS session could not be found."}
          </Text>
        </View>
      ) : (
        <>
          {region ? (
            <MapView style={styles.map} region={region}>
              <Marker
                coordinate={{
                  latitude: region.latitude,
                  longitude: region.longitude,
                }}
                title="SOS location"
                description="Live emergency location"
              />
            </MapView>
          ) : (
            <View
              style={[
                styles.waitingCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.message, { color: theme.text }]}>
                Waiting for the first live location update.
              </Text>
            </View>
          )}

          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.summaryText, { color: theme.text }]}>
              Token: {shareToken}
            </Text>
            <Text style={[styles.summaryText, { color: theme.text }]}>
              Status: {sessionRow.status === "active" ? "SOS Active" : "SOS Stopped"}
            </Text>
            <Text style={[styles.summaryText, { color: theme.text }]}>
              Latitude:{" "}
              {sessionRow.last_lat == null ? "Pending" : sessionRow.last_lat.toFixed(6)}
            </Text>
            <Text style={[styles.summaryText, { color: theme.text }]}>
              Longitude:{" "}
              {sessionRow.last_lng == null ? "Pending" : sessionRow.last_lng.toFixed(6)}
            </Text>
            <Text style={[styles.summaryText, { color: theme.text }]}>
              Last updated:{" "}
              {sessionRow.last_updated_at
                ? new Date(sessionRow.last_updated_at).toLocaleString()
                : "Pending"}
            </Text>

            {errorMessage ? (
              <Text style={[styles.summaryText, { color: "#DC2626" }]}>
                {errorMessage}
              </Text>
            ) : null}

            {trackingError ? (
              <Text style={[styles.summaryText, { color: "#DC2626" }]}>
                {trackingError}
              </Text>
            ) : null}

            <Pressable
              onPress={openInMaps}
              style={[styles.mapButton, !region && styles.disabledButton]}
            >
              <Text style={styles.mapButtonText}>Open in Google Maps</Text>
            </Pressable>

            {isOwner ? (
              <Pressable
                onPress={handleStopSOS}
                style={[styles.stopButton, stopping && styles.disabledButton]}
              >
                <Text style={styles.stopButtonText}>
                  {stopping ? "Stopping..." : "STOP SOS"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  container: {
    flex: 1,
  },
  disabledButton: {
    opacity: 0.6,
  },
  header: {
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  map: {
    flex: 1,
  },
  mapButton: {
    alignItems: "center",
    backgroundColor: "#E53935",
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 50,
  },
  mapButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  stopButton: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 50,
  },
  stopButtonText: {
    color: "#FFFFFF",
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
    marginTop: -18,
    padding: 20,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
  },
  waitingCard: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 20,
    padding: 24,
  },
});
