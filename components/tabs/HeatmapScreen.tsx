// Imports: React, native UI primitives, and app theme context.
import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { useTheme } from "@/components/theme/ThemeContext";

// Component: web-safe fallback heatmap screen with an ON/OFF toggle.
export default function HeatmapScreen() {
  // State: theme colors and local toggle state.
  const { theme } = useTheme();
  const [heatmapEnabled, setHeatmapEnabled] = React.useState(true);

  // UI layout: centered card with toggle, title, and status description.
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>
            Heatmap
          </Text>
          <View style={styles.toggleRight}>
            <Text style={[styles.toggleValue, { color: theme.icon }]}>
              {heatmapEnabled ? "On" : "Off"}
            </Text>
            <Switch value={heatmapEnabled} onValueChange={setHeatmapEnabled} />
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Heatmap</Text>

        {/* Conditional rendering: detailed message when ON, short message when OFF. */}
        {heatmapEnabled ? (
          <Text style={[styles.body, { color: theme.icon }]}>
            The interactive heatmap uses native maps on iOS and Android. This
            web screen is a safe fallback so the browser build can load without
            react-native-maps.
          </Text>
        ) : (
          <Text style={[styles.body, { color: theme.icon }]}>
            Heatmap is off.
          </Text>
        )}
      </View>
    </View>
  );
}

// Styles: card-based layout, centered container, and readable typography.
const styles = StyleSheet.create({
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 420,
    padding: 24,
    width: "100%",
  },
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 12,
    textAlign: "center",
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  toggleRight: {
    alignItems: "center",
    flexDirection: "row",
  },
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  toggleValue: {
    fontSize: 13,
    fontWeight: "600",
    marginRight: 8,
  },
});
