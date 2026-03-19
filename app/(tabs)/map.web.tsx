import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../themeContext";

/**
 * Map (Web)
 *
 * Why this file exists
 * - The native map implementation uses `react-native-maps`.
 * - In this project, web support for that stack is limited, so we embed Google
 *   Maps via an <iframe> and center it on the user's location.
 *
 * UX goals
 * - Show something immediately (default Sri Lanka center).
 * - If location permission is granted, re-center to the user's coordinates.
 * - Keep a visible "you are here" marker overlay.
 */
export default function MapScreenWeb() {
  const { isDark } = useTheme();

  // Current view coordinates.
  // Defaults to Sri Lanka so the screen is never blank.
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(
    {
      latitude: 7.8731,
      longitude: 80.7718,
    },
  );

  // Loading state is driven by *two* async events:
  // 1) fetching GPS coordinates
  // 2) the <iframe> finishing initial load
  const [loading, setLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Request permission. If denied, keep the default center and show a banner.
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationDenied(true);
          return;
        }

        // Use a balanced accuracy for web to be responsive and battery-friendly.
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch {
        // Ignore errors and keep the default center.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const iframeSrc = useMemo(() => {
    // Build the embed URL when coords change.
    const zoom = 15;
    // Use an @lat,lng view (no pin) so we can overlay our own marker.
    return `https://www.google.com/maps/@${coords.latitude},${coords.longitude},${zoom}z?output=embed`;
  }, [coords.latitude, coords.longitude]);

  return (
    <View style={styles.container}>
      {/* Base map layer */}
      <iframe
        title="map"
        src={iframeSrc}
        loading="lazy"
        onLoad={() => setIframeLoaded(true)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: 0,
        }}
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />

      {/*
        Marker overlay: we render the "current location" pin on top of the iframe
        (not inside the iframe) so it matches the app theme and remains visible.
      */}
      <View pointerEvents="none" style={styles.liveMarkerOverlay}>
        {isDark ? (
          <View style={styles.liveMarkerNeonWrapDark}>
            <View style={styles.liveMarkerNeonGlow3Dark} />
            <View style={styles.liveMarkerNeonGlow2Dark} />
            <View style={styles.liveMarkerNeonGlow1Dark} />

            <View style={styles.liveMarkerPinWrapDark}>
              <Ionicons
                name="location-sharp"
                size={52}
                color="#FFFFFF"
                style={styles.liveMarkerPinBack}
              />
              <Ionicons
                name="location-sharp"
                size={48}
                color="#FFF44F"
                style={styles.liveMarkerPinFront}
              />
            </View>
          </View>
        ) : (
          <View style={styles.liveMarkerPinWrapLight}>
            <Ionicons
              name="location-sharp"
              size={52}
              color="#FFFFFF"
              style={styles.liveMarkerPinBack}
            />
            <Ionicons
              name="location-sharp"
              size={48}
              color="#1E90FF"
              style={styles.liveMarkerPinFront}
            />
          </View>
        )}
      </View>

      {/* Permission banner */}
      {locationDenied && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Location is disabled — showing Sri Lanka.
          </Text>
        </View>
      )}

      {/* Loading pill while either GPS or iframe is still loading */}
      {(loading || !iframeLoaded) && (
        <View style={styles.loadingOverlay}>
          {/* Shows until both GPS fetch and iframe load are complete. */}
          <ActivityIndicator size="small" color="#FF0000" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  liveMarkerOverlay: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  liveMarkerNeonWrapDark: {
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -56,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  liveMarkerNeonGlow1Dark: {
    position: "absolute",
    top: -6,
    left: -6,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,244,79,0.18)",
  },
  liveMarkerNeonGlow2Dark: {
    position: "absolute",
    top: -12,
    left: -12,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,244,79,0.12)",
  },
  liveMarkerNeonGlow3Dark: {
    position: "absolute",
    top: -20,
    left: -20,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,244,79,0.08)",
  },
  liveMarkerPinWrapDark: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  liveMarkerPinWrapLight: {
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -56,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  liveMarkerPinBack: {
    position: "absolute",
    bottom: -2,
  },
  liveMarkerPinFront: {
    position: "absolute",
    bottom: -1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 20,
    elevation: 5,
  },
  banner: {
    position: "absolute",
    bottom: 18,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bannerText: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },
});
