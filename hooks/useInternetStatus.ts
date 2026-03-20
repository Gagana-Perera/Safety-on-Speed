import { useEffect, useState } from "react";
import { Platform } from "react-native";

export type InternetStatus = "checking" | "offline" | "online";

const CONNECTIVITY_CHECK_URL =
  process.env.EXPO_PUBLIC_CONNECTIVITY_CHECK_URL?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
  "https://clients3.google.com/generate_204";

async function probeInternetConnection() {
  if (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    "onLine" in navigator
  ) {
    return navigator.onLine ? "online" : "offline";
  }

  try {
    const response = await fetch(CONNECTIVITY_CHECK_URL, {
      method: "HEAD",
    });
    return response.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}

export function useInternetStatus(pollIntervalMs = 30000) {
  const [status, setStatus] = useState<InternetStatus>("checking");

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      const nextStatus = await probeInternetConnection();
      if (isMounted) {
        setStatus(nextStatus);
      }
    };

    void checkStatus();

    const intervalId = setInterval(() => {
      void checkStatus();
    }, pollIntervalMs);

    let onlineHandler: (() => void) | null = null;
    let offlineHandler: (() => void) | null = null;

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      typeof window.addEventListener === "function"
    ) {
      onlineHandler = () => setStatus("online");
      offlineHandler = () => setStatus("offline");
      window.addEventListener("online", onlineHandler);
      window.addEventListener("offline", offlineHandler);
    }

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      if (onlineHandler) {
        window.removeEventListener("online", onlineHandler);
      }
      if (offlineHandler) {
        window.removeEventListener("offline", offlineHandler);
      }
    };
  }, [pollIntervalMs]);

  return status;
}
