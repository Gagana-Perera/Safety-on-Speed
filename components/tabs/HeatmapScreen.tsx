import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/theme/ThemeContext";

export default function HeatmapScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>Heatmap</Text>
        <Text style={[styles.body, { color: theme.icon }]}>
          The interactive heatmap uses native maps on iOS and Android. This web
          screen is a safe fallback so the browser build can load without
          `react-native-maps`.
        </Text>
      </View>
    </View>
  );
}

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
});
