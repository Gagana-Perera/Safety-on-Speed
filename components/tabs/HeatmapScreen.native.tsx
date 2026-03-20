import { useEffect, useMemo, useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
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
        {circles.map((c) => (
          <Circle
            key={c.key}
            center={c.center}
            radius={c.radius}
            fillColor={c.fillColor}
            strokeColor={c.strokeColor}
            strokeWidth={1}
          />
        ))}
      </MapView>
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
});
