import Constants from "expo-constants";
import * as Location from "expo-location";

import { supabase } from "@/lib/superbase";

export type SendSOSResponse = {
  failedCount: number;
  historySessionId?: string;
  message: string;
  results: Array<{
    error?: string;
    sid?: string;
    status: "failed" | "sent";
    to: string;
  }>;
  sentCount: number;
  success: boolean;
};

function parseJsonSafely(text: string) {
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as SendSOSResponse & {
      error?: string;
    };
  } catch {
    return null;
  }
}

async function getCurrentUserName(userId: string, fallbackName: string) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    return profile?.full_name?.trim() || fallbackName;
  } catch {
    return fallbackName;
  }
}

export async function sendSOS(): Promise<SendSOSResponse> {
  const webhookUrl =
    process.env.EXPO_PUBLIC_SOS_ALERT_WEBHOOK_URL?.trim() ||
    String(
      Constants.expoConfig?.extra?.EXPO_PUBLIC_SOS_ALERT_WEBHOOK_URL ?? "",
    ).trim();

  if (!webhookUrl) {
    throw new Error(
      "Set EXPO_PUBLIC_SOS_ALERT_WEBHOOK_URL in your Expo .env file.",
    );
  }

  if (!webhookUrl.startsWith("https://")) {
    throw new Error(
      "EXPO_PUBLIC_SOS_ALERT_WEBHOOK_URL must be a valid https URL.",
    );
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync().catch(
    () => true,
  );
  if (!servicesEnabled) {
    throw new Error("Location services are turned off.");
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error(
      "Location permission was denied. Enable GPS access and try again.",
    );
  }

  let currentPosition: Location.LocationObject;
  try {
    currentPosition = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  } catch {
    throw new Error(
      "Unable to get your current location. Make sure GPS is available and try again.",
    );
  }

  await supabase.auth.refreshSession();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user || !session) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const authName = [
    user.user_metadata?.first_name,
    user.user_metadata?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const userName = await getCurrentUserName(
    user.id,
    authName || user.email || "Safety on Speed user",
  );

  let response: Response;
  try {
    response = await fetch(webhookUrl, {
      body: JSON.stringify({
        accuracy:
          typeof currentPosition.coords.accuracy === "number"
            ? currentPosition.coords.accuracy
            : null,
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
        userName,
      }),
      headers: {
        ...(process.env.EXPO_PUBLIC_SUPABASE_KEY ||
        String(Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_KEY ?? "")
          ? {
              apikey:
                process.env.EXPO_PUBLIC_SUPABASE_KEY ||
                String(Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_KEY),
            }
          : {}),
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch {
    throw new Error(
      "Network error while contacting the SOS SMS service. Check your internet connection and try again.",
    );
  }

  const responseText = await response.text().catch(() => "");
  const responseJson = parseJsonSafely(responseText);

  if (!response.ok) {
    throw new Error(
      responseJson?.error ||
        responseJson?.message ||
        "SOS SMS delivery failed.",
    );
  }

  if (!responseJson?.success) {
    throw new Error(responseJson?.message || "SOS SMS delivery failed.");
  }

  return responseJson;
}
