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


async function getCurrentUserName(userId: string, fallbackName: string) {
  // We try the profile name first so the guardian sees a friendly sender name.
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
  // Put this public webhook URL in your Expo .env file.
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


export async function sendSOS(
  alertType: SOSAlertType = "normal",
): Promise<SendSOSResponse> {


  const servicesEnabled = await Location.hasServicesEnabledAsync().catch(
    () => true,
  );
  if (!servicesEnabled) {
    throw new Error("Location services are turned off.");
  }

  // The app needs permission before it can read the current GPS location.
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

  try {
    // DEBUG: Verify session is valid against the database before calling Edge Function
    const { error: sessionCheckError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .single();

    if (sessionCheckError && sessionCheckError.code === "PGRST301") {
      console.error("[sendSOS] Session invalid via DB check:", sessionCheckError);
      throw new Error("Your session is invalid (JWT Mismatch). Please sign out and sign in again.");
    }
    console.log("[sendSOS] Session verified against DB.");

    // The app sends the current location once. Twilio secrets stay on the server.
    const url = `${supabaseUrl}/functions/v1/sos-twilio-alert`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
      },
      body: JSON.stringify({
        accuracy:
          typeof currentPosition.coords.accuracy === "number"
            ? currentPosition.coords.accuracy
            : null,
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
        userName: userName,
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[sendSOS] Edge Function Error:", {
        status: response.status,
        body: errorText,
      });
      throw new Error(`Edge Function returned ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as SendSOSResponse;
    return data;
  } catch (error) {
    console.error("[sendSOS] Error:", error);
    throw new Error(
      responseJson?.error ||
        responseJson?.message ||
        "SOS SMS delivery failed.",
    );
  }
}
