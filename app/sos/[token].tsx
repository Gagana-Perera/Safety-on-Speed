import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  buildGoogleMapsUrl,
  getSOSSessionByShareToken,
  getSOSStatusMessage,
  removeSOSSubscription,
  subscribeToSOSSessionByShareToken,
  type SOSSessionRow,
} from "@/lib/sosService";

import { useTheme } from "../themeContext";

function getRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function SOSShareScreen() {
  const { theme } = useTheme();
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
        const row = await getSOSSessionByShareToken(shareToken);
        if (!isMounted) return;

        setSessionRow(row);
        setErrorMessage(
          row && row.status === "active"
            ? null
            : "This SOS session is not currently active.",
        );
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getSOSStatusMessage(error));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadSession();

    const pollId = setInterval(() => {
      void loadSession();
    }, 10000);

    const channel = subscribeToSOSSessionByShareToken(shareToken, (row) => {
      if (!isMounted) return;
      setSessionRow(row);
      setErrorMessage(
        row && row.status === "active"
          ? null
          : "This SOS session is not currently active.",
      );
      setLoading(false);
    });

    return () => {
      isMounted = false;
      clearInterval(pollId);
      void removeSOSSubscription(channel);
    };
  }, [shareToken]);

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
    if (sessionRow?.last_lat == null || sessionRow.last_lng == null) return;

    try {
      await Linking.openURL(
        buildGoogleMapsUrl(sessionRow.last_lat, sessionRow.last_lng),
      );
    } catch {
      Alert.alert("Unable to open maps", "Please try again in a moment.");
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
      ) : errorMessage || !sessionRow || !region ? (
        <View style={styles.centerContent}>
          <Text style={[styles.message, { color: theme.text }]}>
            {errorMessage ?? "No live location is available."}
          </Text>
        </View>
      ) : (
        <>
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

          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.summaryText, { color: theme.text }]}>
              Mode:{" "}
              {sessionRow.mode === "emergency" ? "Emergency SOS" : "Quick SOS"}
            </Text>
            <Text style={[styles.summaryText, { color: theme.text }]}>
              Last updated:{" "}
              {sessionRow.last_updated_at
                ? new Date(sessionRow.last_updated_at).toLocaleString()
                : "Pending"}
            </Text>
            <Text style={[styles.summaryText, { color: theme.text }]}>
              Coordinates: {sessionRow.last_lat?.toFixed(6)},{" "}
              {sessionRow.last_lng?.toFixed(6)}
            </Text>

            <TouchableOpacity onPress={openInMaps} style={styles.mapButton}>
              <Text style={styles.mapButtonText}>Open in Google Maps</Text>
            </TouchableOpacity>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  map: {
    flex: 1,
  },
  mapButton: {
    alignItems: "center",
    backgroundColor: "#E53935",
    borderRadius: 14,
    marginTop: 16,
    minHeight: 50,
    justifyContent: "center",
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
});
