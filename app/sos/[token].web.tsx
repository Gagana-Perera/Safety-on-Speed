import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
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

export default function SOSShareScreenWeb() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const shareToken = getRouteParam(params.token);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
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

  const iframeSrc = useMemo(() => {
    if (sessionRow?.last_lat == null || sessionRow?.last_lng == null) return null;
    return `https://www.google.com/maps/@${sessionRow.last_lat},${sessionRow.last_lng},16z?output=embed`;
  }, [sessionRow]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
      ) : errorMessage || !iframeSrc || !sessionRow ? (
        <View style={styles.centerContent}>
          <Text style={[styles.message, { color: theme.text }]}>
            {errorMessage ?? "No live location is available."}
          </Text>
        </View>
      ) : (
        <>
          <iframe
            title="sos-share-map"
            src={iframeSrc}
            loading="lazy"
            onLoad={() => setIframeLoaded(true)}
            style={styles.iframe}
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          {!iframeLoaded && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#E53935" />
            </View>
          )}

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
          </View>
        </>
      )}
    </View>
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
    paddingTop: 32,
    paddingBottom: 16,
  },
  iframe: {
    border: 0,
    flex: 1,
    width: "100%",
  } as any,
  loadingOverlay: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 999,
    padding: 12,
    position: "absolute",
    top: 100,
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
