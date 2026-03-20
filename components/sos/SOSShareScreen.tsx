import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getSOSSession, SOS_TRACKING_POLL_MS } from "@/lib/sosLiveTracking";
import { getSOSStatusMessage, type SOSSessionRow } from "@/lib/sosService";

function getRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function SOSShareScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const shareToken = getRouteParam(params.token);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionRow, setSessionRow] = useState<SOSSessionRow | null>(null);

  useEffect(() => {
    if (!shareToken) {
      setErrorMessage("This SOS link is missing its share token.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadSession = async () => {
      try {
        const row = await getSOSSession(shareToken);
        if (!isMounted) return;

        if (row) {
          setSessionRow(row);
          setErrorMessage(
            row.status === "active"
              ? null
              : "This SOS session has already been stopped.",
          );
        } else {
          setSessionRow((current) =>
            current ? { ...current, status: "ended" } : current,
          );
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

  const latitude = useMemo(() => sessionRow?.last_lat ?? null, [sessionRow]);
  const longitude = useMemo(() => sessionRow?.last_lng ?? null, [sessionRow]);
  const googleMapsUrl = useMemo(() => {
    if (latitude == null || longitude == null) return null;
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }, [latitude, longitude]);

  async function openInMaps() {
    if (!googleMapsUrl) return;
    await Linking.openURL(googleMapsUrl);
  }

  const statusLabel =
    sessionRow?.status === "active"
      ? "SOS Active"
      : sessionRow
        ? "SOS Stopped"
        : "Unavailable";

  return (
    <View style={[styles.container, { backgroundColor: "#050816" }]}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: "#F87171" }]}>Safety on Speed</Text>
        <Text style={[styles.title, { color: "#F8FAFC" }]}>SOS Share</Text>
        <Text style={[styles.subtitle, { color: "#94A3B8" }]}>
          {sessionRow?.user_name || "Shared SOS session"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#F8FAFC" />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.statusBadge}>{statusLabel}</Text>
            <Text style={styles.tokenLabel}>SOS Token</Text>
            <Text style={styles.tokenValue}>{shareToken ?? "Missing token"}</Text>

            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.statusValue}>{statusLabel}</Text>

            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Latitude</Text>
                <Text style={styles.metricValue}>
                  {latitude == null ? "Pending" : latitude.toFixed(6)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Longitude</Text>
                <Text style={styles.metricValue}>
                  {longitude == null ? "Pending" : longitude.toFixed(6)}
                </Text>
              </View>
            </View>

            <Text style={styles.helperText}>
              {errorMessage ?? "This page refreshes the SOS location every 3 seconds."}
            </Text>

            <Pressable
              onPress={openInMaps}
              style={[styles.mapButton, !googleMapsUrl && styles.disabledButton]}
            >
              <Text style={styles.mapButtonText}>Open in Google Maps</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0F172A",
    borderColor: "#1E293B",
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
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
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  disabledButton: {
    opacity: 0.55,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  header: {
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  helperText: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 18,
  },
  mapButton: {
    alignItems: "center",
    backgroundColor: "#DC2626",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  mapButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  metricCard: {
    backgroundColor: "#111827",
    borderColor: "#1F2937",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 16,
  },
  metricLabel: {
    color: "#94A3B8",
    fontSize: 13,
    marginBottom: 8,
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  metricValue: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "800",
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#14532D",
    borderRadius: 999,
    color: "#DCFCE7",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusLabel: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 18,
    textTransform: "uppercase",
  },
  statusValue: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },
  tokenLabel: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 20,
    textTransform: "uppercase",
  },
  tokenValue: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },
});
