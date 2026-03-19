import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  aggregateSosAlertsByTown,
  dummySosAlerts,
} from "../../services/sosHeatmap";

/**
 * Map (Web)
 *
 * Uses Google Maps JS API on web, since react-native-maps isn't ideal on web.
 */
export default function MapScreenWeb() {
  const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || "";

  // Defaults to Sri Lanka so the screen is never blank.
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(
    {
      latitude: 7.8731,
      longitude: 80.7718,
    },
  );

  const [loading, setLoading] = useState(true);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const heatmapLayerRef = useRef<any>(null);
  const townDotsRef = useRef<any[]>([]);
  const townInfoWindowRef = useRef<any>(null);

  const heatmapTowns = useMemo(
    () => aggregateSosAlertsByTown(dummySosAlerts),
    [],
  );

  const heatmapMaxCount = useMemo(() => {
    let max = 1;
    for (const t of heatmapTowns) max = Math.max(max, t.count || 1);
    return Math.max(1, max);
  }, [heatmapTowns]);

  const getDotColor = (count: number) => {
    const intensity = Math.max(0, Math.min(1, count / heatmapMaxCount));
    if (intensity <= 0.34) return "#3B82F6"; // Low
    if (intensity <= 0.67) return "#EAB308"; // Medium
    return "#EF4444"; // High
  };

  useEffect(() => {
    (async () => {
      try {
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
        // Ignore errors and keep default center.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!googleApiKey) {
      setMapsLoaded(false);
      return;
    }

    const w = globalThis as any;
    if (w.google?.maps) {
      setMapsLoaded(true);
      return;
    }

    const id = "google-maps-js";
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => setMapsLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.defer = true;
    // `visualization` is required for HeatmapLayer.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      googleApiKey,
    )}&libraries=visualization`;
    script.onload = () => setMapsLoaded(true);
    script.onerror = () => setMapsLoaded(false);
    document.head.appendChild(script);
  }, [googleApiKey]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!mapsLoaded) return;
    if (!mapDivRef.current) return;

    const g = (globalThis as any).google;
    if (!g?.maps) return;

    if (!mapRef.current) {
      mapRef.current = new g.maps.Map(mapDivRef.current, {
        center: { lat: coords.latitude, lng: coords.longitude },
        zoom: 14,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      });
    }

    if (!markerRef.current) {
      markerRef.current = new g.maps.Marker({
        map: mapRef.current,
        position: { lat: coords.latitude, lng: coords.longitude },
        title: "You",
      });
    } else {
      markerRef.current.setPosition({
        lat: coords.latitude,
        lng: coords.longitude,
      });
    }

    if (!heatmapLayerRef.current) {
      const points = heatmapTowns.map((t) => ({
        location: new g.maps.LatLng(t.latitude, t.longitude),
        weight: t.count,
      }));

      const maxIntensity = Math.max(
        1,
        ...heatmapTowns.map((t) => (typeof t.count === "number" ? t.count : 1)),
      );

      heatmapLayerRef.current = new g.maps.visualization.HeatmapLayer({
        data: points,
        dissipating: true,
        radius: 45,
        opacity: 0.88,
        maxIntensity,
        gradient: [
          "rgba(59,130,246,0)",
          "rgba(59,130,246,1)",
          "rgba(34,197,94,1)",
          "rgba(234,179,8,1)",
          "rgba(249,115,22,1)",
          "rgba(239,68,68,1)",
        ],
      });
    }

    heatmapLayerRef.current.setMap(heatmapEnabled ? mapRef.current : null);

    // Clickable town dots for showing totals.
    if (!townInfoWindowRef.current) {
      townInfoWindowRef.current = new g.maps.InfoWindow();
    }

    if (townDotsRef.current.length === 0 && heatmapTowns.length > 0) {
      townDotsRef.current = heatmapTowns.map((t) => {
        const circle = new g.maps.Circle({
          map: heatmapEnabled ? mapRef.current : null,
          center: { lat: t.latitude, lng: t.longitude },
          radius: 90,
          fillColor: getDotColor(t.count),
          fillOpacity: 0.92,
          strokeColor: "#FFFFFF",
          strokeOpacity: 0.9,
          strokeWeight: 1,
          clickable: true,
        });

        circle.addListener("click", () => {
          townInfoWindowRef.current.setContent(
            `\n              <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:12px; padding:4px 2px;">\n                <div style="font-weight:600; margin-bottom:2px;">${t.town}</div>\n                <div>Total SOS alerts: <b>${t.count}</b></div>\n              </div>\n            `,
          );
          townInfoWindowRef.current.setPosition({
            lat: t.latitude,
            lng: t.longitude,
          });
          townInfoWindowRef.current.open({ map: mapRef.current });
        });

        return circle;
      });
    }

    for (const dot of townDotsRef.current) {
      dot.setMap(heatmapEnabled ? mapRef.current : null);
    }

    if (!heatmapEnabled && townInfoWindowRef.current) {
      townInfoWindowRef.current.close();
    }

    mapRef.current.setCenter({ lat: coords.latitude, lng: coords.longitude });
  }, [
    coords.latitude,
    coords.longitude,
    heatmapEnabled,
    heatmapMaxCount,
    heatmapTowns,
    mapsLoaded,
  ]);

  return (
    <View style={styles.container}>
      <View
        ref={(el) => {
          mapDivRef.current = el as unknown as HTMLDivElement;
        }}
        style={styles.webMap}
      />

      <View style={styles.heatmapToggleWrap}>
        <TouchableOpacity
          style={styles.heatmapToggleButton}
          onPress={() => setHeatmapEnabled((v) => !v)}
        >
          <Ionicons
            name={heatmapEnabled ? "flame" : "flame-outline"}
            size={18}
            color={heatmapEnabled ? "#EF4444" : "#111827"}
          />
          <Text style={styles.heatmapToggleText}>Heatmap</Text>
        </TouchableOpacity>

        <View
          style={[styles.heatmapLegendWrap, !heatmapEnabled && { opacity: 0.65 }]}
        >
          <View style={styles.heatmapBar}>
            <View
              style={[styles.heatmapBarSegment, { backgroundColor: "#3B82F6" }]}
            />
            <View
              style={[styles.heatmapBarSegment, { backgroundColor: "#22C55E" }]}
            />
            <View
              style={[styles.heatmapBarSegment, { backgroundColor: "#EAB308" }]}
            />
            <View
              style={[styles.heatmapBarSegment, { backgroundColor: "#F97316" }]}
            />
            <View
              style={[styles.heatmapBarSegment, { backgroundColor: "#EF4444" }]}
            />
          </View>

          <View style={styles.heatmapLegendRow}>
            <View style={styles.heatmapLegendItem}>
              <View
                style={[styles.heatmapLegendDot, { backgroundColor: "#3B82F6" }]}
              />
              <Text style={styles.heatmapLegendText}>Low</Text>
            </View>
            <View style={styles.heatmapLegendItem}>
              <View
                style={[styles.heatmapLegendDot, { backgroundColor: "#EAB308" }]}
              />
              <Text style={styles.heatmapLegendText}>Medium</Text>
            </View>
            <View style={styles.heatmapLegendItem}>
              <View
                style={[styles.heatmapLegendDot, { backgroundColor: "#EF4444" }]}
              />
              <Text style={styles.heatmapLegendText}>High</Text>
            </View>
          </View>
        </View>
      </View>

      {locationDenied && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Location is disabled — showing Sri Lanka.
          </Text>
        </View>
      )}

      {(loading || (googleApiKey ? !mapsLoaded : false)) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#FF0000" />
        </View>
      )}

      {!googleApiKey && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Missing EXPO_PUBLIC_GOOGLE_API_KEY — map disabled.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webMap: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
  heatmapToggleWrap: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  heatmapToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  heatmapToggleText: {
    fontSize: 12,
    color: "#111827",
  },
  heatmapLegendWrap: {
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  heatmapBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    flexDirection: "row",
  },
  heatmapBarSegment: {
    flex: 1,
  },
  heatmapLegendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  heatmapLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heatmapLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  heatmapLegendText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#111827",
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
