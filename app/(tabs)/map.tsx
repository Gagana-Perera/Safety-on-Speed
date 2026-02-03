import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

export default function MapScreen() {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(
    {
      latitude: 6.9271,
      longitude: 79.8612,
    },
  );
  const [loading, setLoading] = useState(true);
  const [hasLocation, setHasLocation] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [useFallbackEmbed, setUseFallbackEmbed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Request permissions
        let { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Location is required for safety features.",
          );
          setLocationDenied(true);
          setLoading(false);
          return;
        }

        // Get coordinates
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setHasLocation(true);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const SRI_LANKA_CENTER = { latitude: 7.8731, longitude: 80.7718 };
  // Rough bounding box for Sri Lanka (keeps map from defaulting to a world view).
  const SRI_LANKA_BOUNDS = {
    minLat: 5.85,
    maxLat: 9.85,
    minLng: 79.4,
    maxLng: 82.1,
  };

  const isWithinSriLanka =
    coords.latitude >= SRI_LANKA_BOUNDS.minLat &&
    coords.latitude <= SRI_LANKA_BOUNDS.maxLat &&
    coords.longitude >= SRI_LANKA_BOUNDS.minLng &&
    coords.longitude <= SRI_LANKA_BOUNDS.maxLng;

  const displayCenter =
    hasLocation && isWithinSriLanka ? coords : SRI_LANKA_CENTER;
  const displayZoom = hasLocation && isWithinSriLanka ? 15 : 7;

  // Works in Expo Go (no native Google Maps module required).
  // Uses an <iframe> embed so it stays inside the app.
  // Prefer the official Embed API if a key is present, but fall back automatically if blocked
  // (common causes: billing not enabled, key restrictions, Embed API disabled).
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
  const iframeSrc =
    !useFallbackEmbed && googleMapsApiKey
      ? `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(
          googleMapsApiKey,
        )}&center=${displayCenter.latitude},${displayCenter.longitude}&zoom=${displayZoom}&maptype=roadmap`
      : `https://www.google.com/maps?q=${displayCenter.latitude},${displayCenter.longitude}&z=${displayZoom}&output=embed`;

  const mapHtml = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        html, body { height: 100%; width: 100%; margin: 0; padding: 0; }
        iframe { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; border: 0; }
      </style>
    </head>
    <body>
      <iframe
        src="${iframeSrc}"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        allowfullscreen
      ></iframe>
    </body>
  </html>`;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: mapHtml, baseUrl: "https://www.google.com" }}
        style={styles.webview}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        startInLoadingState
        onError={() => {
          if (!useFallbackEmbed) {
            setUseFallbackEmbed(true);
          }
          Alert.alert(
            "Map Error",
            "Could not load the embedded map. Falling back to a basic embed.",
          );
        }}
        onHttpError={() => {
          if (!useFallbackEmbed) {
            setUseFallbackEmbed(true);
          }
          Alert.alert(
            "Map Error",
            "Google Maps blocked the Embed API request. Falling back to a basic embed (check billing + API key restrictions).",
          );
        }}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#FF0000" />
            <Text style={styles.loadingText}>Loading map…</Text>
          </View>
        )}
      />

      {locationDenied && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Location is disabled — showing Sri Lanka.
          </Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#FF0000" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  loadingOverlay: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 20,
    elevation: 5,
  },
  loadingText: {
    marginTop: 6,
    color: "#111",
    fontSize: 12,
    textAlign: "center",
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
