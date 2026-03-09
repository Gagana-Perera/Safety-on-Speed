import * as Location from "expo-location";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function MapScreenWeb() {
  // Web implementation note:
  // `react-native-maps` isn't supported the same way on web in this project,
  // so we embed Google Maps via an iframe and center it on the user's location.
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(
    {
      latitude: 7.8731,
      longitude: 80.7718,
    },
  );
  const [loading, setLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // If the user denies location, we keep the default Sri Lanka center.
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationDenied(true);
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch {
        // Ignore: we'll show the default center.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const iframeSrc = useMemo(() => {
    // Embed URL recomputed only when coords change.
    const zoom = 15;
    return `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}&z=${zoom}&output=embed`;
  }, [coords.latitude, coords.longitude]);

  return (
    <View style={styles.container}>
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

      {locationDenied && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Location is disabled — showing Sri Lanka.
          </Text>
        </View>
      )}

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
