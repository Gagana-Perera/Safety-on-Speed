import * as Location from "expo-location";

import { loadGuardianRecipients } from "@/hooks/notifyVerifiedGuardians";
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

function isValidE164PhoneNumber(phone: string) {
  return /^\+\d{8,15}$/.test(phone);
}

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
  const webhookUrl = process.env.EXPO_PUBLIC_SOS_ALERT_WEBHOOK_URL?.trim();
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

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("You need to sign in before sending an SOS alert.");
  }

  // Guardian numbers are loaded from the existing guardians table or cached fallback.
  const guardians = await loadGuardianRecipients(session.user.id);
  if (guardians.length === 0) {
    throw new Error("No guardians found. Add at least one guardian first.");
  }

  const invalidGuardians = guardians.filter(
    (guardian) => !isValidE164PhoneNumber(guardian.phone),
  );
  if (invalidGuardians.length > 0) {
    throw new Error(
      "One or more guardian phone numbers are invalid. Use E.164 format like +9477XXXXXXX.",
    );
  }

  const authName = [
    session.user.user_metadata?.first_name,
    session.user.user_metadata?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const userName = await getCurrentUserName(
    session.user.id,
    authName || session.user.email || "Safety on Speed user",
  );

  let response: Response;
  try {
    // The app sends the current location once. Twilio secrets stay on the server.
    response = await fetch(webhookUrl, {
      body: JSON.stringify({
        accuracy:
          typeof currentPosition.coords.accuracy === "number"
            ? currentPosition.coords.accuracy
            : null,
        guardians: guardians.map((guardian) => guardian.phone),
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
        userName,
      }),
      headers: {
        ...(process.env.EXPO_PUBLIC_SUPABASE_KEY
          ? { apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY }
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
      responseJson?.error || responseJson?.message || "SOS SMS delivery failed.",
    );
  }

  if (!responseJson?.success) {
    throw new Error(responseJson?.message || "SOS SMS delivery failed.");
  }

  return responseJson;
}
