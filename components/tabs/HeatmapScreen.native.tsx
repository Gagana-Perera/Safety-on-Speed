import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Circle, PROVIDER_GOOGLE, Region } from "react-native-maps";

import { useTheme } from "@/components/theme/ThemeContext";
import {
  aggregateSosAlertsByTown,
  dummySosAlerts,
  SosTownAggregate,
} from "@/services/sosHeatmap";

const SRI_LANKA_REGION: Region = {
  latitude: 7.8731,
  longitude: 80.7718,
  latitudeDelta: 2.5,
  longitudeDelta: 2.5,
};

export default function Heatmap() {
  const { theme } = useTheme();
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [towns, setTowns] = useState<SosTownAggregate[]>([]);

  useEffect(() => {
    // NOTE: Currently backed by dummy data.
    // Replace `dummySosAlerts` with DB rows later (same shape).
    setTowns(aggregateSosAlertsByTown(dummySosAlerts));
  }, []);

  const circles = useMemo(() => {
    // Build a small visual scale based on counts.
    return towns.map((t) => {
      const count = Math.max(1, t.count);
      const radius = 350 + Math.min(6, count) * 220; // meters
      const fillColor =
        count >= 5
          ? "rgba(178,24,43,0.35)"
          : count >= 3
            ? "rgba(239,138,98,0.32)"
            : "rgba(103,169,207,0.28)";
      const strokeColor =
        count >= 5
          ? "rgba(178,24,43,0.55)"
          : count >= 3
            ? "rgba(239,138,98,0.5)"
            : "rgba(103,169,207,0.45)";

      return {
        key: `${t.town}-${t.latitude.toFixed(4)}-${t.longitude.toFixed(4)}`,
        center: { latitude: t.latitude, longitude: t.longitude },
        radius,
        fillColor,
        strokeColor,
      };
    });
  }, [towns]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={SRI_LANKA_REGION}
      >
        {heatmapEnabled
          ? circles.map((c) => (
              <Circle
                key={c.key}
                center={c.center}
                radius={c.radius}
                fillColor={c.fillColor}
                strokeColor={c.strokeColor}
                strokeWidth={1}
              />
            ))
          : null}
      </MapView>

      <View
        style={[
          styles.toggleCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.toggleLabel, { color: theme.text }]}>Heatmap</Text>
        <View style={styles.toggleRightRow}>
          <Text style={[styles.toggleValue, { color: theme.icon }]}>
            {heatmapEnabled ? "On" : "Off"}
          </Text>
          <Switch value={heatmapEnabled} onValueChange={setHeatmapEnabled} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  toggleCard: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 2,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  toggleRightRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  toggleValue: {
    fontSize: 13,
    fontWeight: "600",
    marginRight: 8,
  },
});
