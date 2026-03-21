import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RealtimeChannel } from "@supabase/supabase-js";
import * as ExpoLinking from "expo-linking";
import * as Location from "expo-location";
import { Linking, Platform } from "react-native";

import type { Tables } from "@/database.types";
import {
  buildSOSAlertMessage,
  loadGuardianRecipients,
  openGuardianAlertComposer,
  type GuardianAlertDeliveryMethod,
  type GuardianAlertDeliveryStatus,
  type GuardianRecipient,
  type SOSMode,
} from "@/hooks/notifyVerifiedGuardians";
import { supabase } from "@/lib/superbase";

export const SOS_LOCATION_TASK_NAME = "safety-on-speed-sos-location";

// Tracking cadence + smart write throttling.
// - Poll GPS around every 3-5 seconds.
// - Persist only when movement is meaningful OR enough time has passed.
const SOS_TRACKING_INTERVAL_MS = 4000;
const SOS_MIN_DISTANCE_METERS_FOR_UPDATE = 15;
const SOS_MAX_SILENCE_MS_FOR_UPDATE = 8000;

const ACTIVE_SOS_STORAGE_KEY = "active_sos_session_v1";

let webLocationWatch: Location.LocationSubscription | null = null;

export type SOSSessionRow = Tables<"sos_sessions">;

export type StoredSOSSession = {
  alertDeliveryMethod: GuardianAlertDeliveryMethod | null;
  alertDeliveryStatus: GuardianAlertDeliveryStatus;
  guardianCount: number;
  lastAccuracy: number | null;
  lastLat: number | null;
  lastLng: number | null;
  lastUpdatedAt: string | null;
  mode: SOSMode;
  sessionId: string;
  shareToken: string;
  shareUrl: string;
  startedAt: string;
  status: "active" | "ended";
  userId: string;
  userName: string;
};

export type StartSOSProgressKey =
  | "creating_session"
  | "capturing_location"
  | "alerting_guardians"
  | "starting_tracking";

export type StartSOSProgress = {
  done: boolean;
  key: StartSOSProgressKey;
  label: string;
};

export type StartSOSResult = {
  alertMessage: string;
  guardians: GuardianRecipient[];
  session: StoredSOSSession;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const earthRadiusM = 6371000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusM * c;
}

function shouldPersistSOSLocationUpdate({
  nextLatitude,
  nextLongitude,
  previous,
}: {
  nextLatitude: number;
  nextLongitude: number;
  previous: StoredSOSSession | null;
}) {
  if (!previous) return true;
  if (previous.lastLat == null || previous.lastLng == null) return true;

  const movedMeters = distanceMeters(
    { latitude: previous.lastLat, longitude: previous.lastLng },
    { latitude: nextLatitude, longitude: nextLongitude },
  );

  const elapsedMs = previous.lastUpdatedAt
    ? Date.now() - new Date(previous.lastUpdatedAt).getTime()
    : Number.POSITIVE_INFINITY;

  return (
    movedMeters >= SOS_MIN_DISTANCE_METERS_FOR_UPDATE ||
    elapsedMs >= SOS_MAX_SILENCE_MS_FOR_UPDATE
  );
}

const START_PROGRESS_LABELS: Record<StartSOSProgressKey, string> = {
  alerting_guardians: "Guardians alerted",
  capturing_location: "Location captured",
  creating_session: "SOS session created",
  starting_tracking: "Tracking started",
};

function toSOSMode(value: string | null | undefined): SOSMode {
  return value === "emergency" ? "emergency" : "quick";
}

export function buildSOSShareUrl(shareToken: string) {
  const baseUrl = process.env.EXPO_PUBLIC_SOS_BASE_URL?.trim().replace(
    /\/+$/,
    "",
  );

  if (baseUrl) {
    return `${baseUrl}/sos/${encodeURIComponent(shareToken)}`;
  }

  return ExpoLinking.createURL(`/sos/${shareToken}`);
}

export function buildGoogleMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function mapSOSSessionRowToStoredSession(
  session: SOSSessionRow,
): StoredSOSSession {
  return {
    alertDeliveryMethod:
      (session.alert_delivery_method as GuardianAlertDeliveryMethod | null) ??
      null,
    alertDeliveryStatus:
      (session.alert_delivery_status as GuardianAlertDeliveryStatus | null) ??
      "pending",
    guardianCount: session.guardian_count ?? 0,
    lastAccuracy: session.accuracy,
    lastLat: session.last_lat,
    lastLng: session.last_lng,
    lastUpdatedAt: session.last_updated_at,
    mode: toSOSMode(session.mode),
    sessionId: session.id,
    shareToken: session.share_token,
    shareUrl: buildSOSShareUrl(session.share_token),
    startedAt: session.started_at,
    status: session.status === "ended" ? "ended" : "active",
    userId: session.user_id,
    userName: session.user_name ?? "Safety on Speed user",
  };
}

export async function saveStoredActiveSOSSession(session: StoredSOSSession) {
  await AsyncStorage.setItem(ACTIVE_SOS_STORAGE_KEY, JSON.stringify(session));
}

export async function getStoredActiveSOSSession() {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_SOS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSOSSession;
  } catch (error) {
    console.warn("Failed to load stored SOS session:", error);
    return null;
  }
}

export async function clearStoredActiveSOSSession() {
  await AsyncStorage.removeItem(ACTIVE_SOS_STORAGE_KEY);
}

export async function getCurrentSOSContext() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("You need to sign in before using SOS.");
  }

  const user = session.user;
  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, live_location")
    .eq("id", user.id)
    .maybeSingle();

  const guardians = await loadGuardianRecipients(user.id);
  const authName = [
    user.user_metadata?.first_name,
    user.user_metadata?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    guardians,
    liveLocationEnabled: profileData?.live_location ?? true,
    userId: user.id,
    userName:
      profileData?.full_name?.trim() || authName || user.email || "Safety user",
  };
}

export async function getActiveSOSSessionForUser(userId: string) {
  const { data, error } = await supabase
    .from("sos_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as SOSSessionRow | null;
}

export async function hydrateStoredSOSSession(userId: string) {
  const activeSession = await getActiveSOSSessionForUser(userId);

  if (!activeSession) {
    await clearStoredActiveSOSSession();
    return null;
  }

  const stored = mapSOSSessionRowToStoredSession(activeSession);
  await saveStoredActiveSOSSession(stored);
  return stored;
}

export async function getSOSSessionById(sessionId: string) {
  const { data, error } = await supabase
    .from("sos_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw error;
  return data as SOSSessionRow | null;
}

export async function getSOSSessionByShareToken(shareToken: string) {
  const { data, error } = await supabase
    .from("sos_sessions")
    .select("*")
    .eq("share_token", shareToken)
    .maybeSingle();

  if (error) throw error;
  return data as SOSSessionRow | null;
}

export function subscribeToSOSSessionById(
  sessionId: string,
  onChange: (session: SOSSessionRow | null) => void,
  onError?: (error: Error) => void,
) {
  const channel = supabase
    .channel(`sos-session:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        filter: `id=eq.${sessionId}`,
        schema: "public",
        table: "sos_sessions",
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          onChange(null);
          return;
        }

        onChange(payload.new as SOSSessionRow);
      },
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        onError?.(new Error("Unable to subscribe to SOS session updates."));
      }
    });

  return channel;
}

export function subscribeToSOSSessionByShareToken(
  shareToken: string,
  onChange: (session: SOSSessionRow | null) => void,
  onError?: (error: Error) => void,
) {
  const channel = supabase
    .channel(`sos-token:${shareToken}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        filter: `share_token=eq.${shareToken}`,
        schema: "public",
        table: "sos_sessions",
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          onChange(null);
          return;
        }

        onChange(payload.new as SOSSessionRow);
      },
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        onError?.(new Error("Unable to subscribe to SOS share updates."));
      }
    });

  return channel;
}

export async function removeSOSSubscription(channel: RealtimeChannel | null) {
  if (!channel) return;
  await supabase.removeChannel(channel);
}

async function createSOSSessionRecord({
  guardianCount,
  mode,
  userId,
  userName,
}: {
  guardianCount: number;
  mode: SOSMode;
  userId: string;
  userName: string;
}) {
  const payload = {
    alert_delivery_status: "pending",
    guardian_count: guardianCount,
    mode,
    status: "active",
    user_id: userId,
    user_name: userName,
  };

  const { data, error } = await supabase
    .from("sos_sessions")
    .insert(payload as any)
    .select("*")
    .single();

  if (!error) {
    return data as SOSSessionRow;
  }

  if (error.code === "23505") {
    const existing = await getActiveSOSSessionForUser(userId);
    if (existing) return existing;
  }

  throw error;
}

async function getBestAvailableLocation() {
  const currentLocation = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  }).catch(() => null);

  if (currentLocation) {
    return currentLocation;
  }

  const lastKnownLocation = await Location.getLastKnownPositionAsync().catch(
    () => null,
  );

  if (lastKnownLocation) {
    return lastKnownLocation;
  }

  throw new Error(
    "Unable to get your current location. Turn on GPS and try again.",
  );
}

async function ensureSOSLocationPermissions() {
  const servicesEnabled = await Location.hasServicesEnabledAsync().catch(
    () => true,
  );

  if (!servicesEnabled) {
    throw new Error("Location services are turned off.");
  }

  const foregroundPermission =
    await Location.requestForegroundPermissionsAsync();
  if (foregroundPermission.status !== "granted") {
    throw new Error("Foreground location permission is required for SOS.");
  }

  if (Platform.OS !== "web") {
    const backgroundPermission =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundPermission.status !== "granted") {
      throw new Error(
        "Background location permission is required so SOS keeps updating when the phone is locked.",
      );
    }
  }
}

export async function updateSOSSessionLocation({
  accuracy,
  latitude,
  longitude,
  sessionId,
  writeFirstLocation = false,
}: {
  accuracy: number | null;
  latitude: number;
  longitude: number;
  sessionId: string;
  writeFirstLocation?: boolean;
}) {
  const storedSession = await getStoredActiveSOSSession();

  if (
    !writeFirstLocation &&
    storedSession?.sessionId === sessionId &&
    !shouldPersistSOSLocationUpdate({
      nextLatitude: latitude,
      nextLongitude: longitude,
      previous: storedSession,
    })
  ) {
    return;
  }

  const payload: Record<string, number | string | null> = {
    accuracy,
    last_lat: latitude,
    last_lng: longitude,
    last_updated_at: new Date().toISOString(),
  };

  if (writeFirstLocation) {
    payload.first_lat = latitude;
    payload.first_lng = longitude;
  }

  const { error: updateError } = await supabase
    .from("sos_sessions")
    .update(payload as any)
    .eq("id", sessionId);

  if (updateError) throw updateError;

  const { error: insertError } = await supabase.from("sos_locations").insert({
    accuracy,
    lat: latitude,
    lng: longitude,
    session_id: sessionId,
  } as any);

  if (insertError) throw insertError;

  if (storedSession?.sessionId === sessionId) {
    await saveStoredActiveSOSSession({
      ...storedSession,
      lastAccuracy: accuracy,
      lastLat: latitude,
      lastLng: longitude,
      lastUpdatedAt: payload.last_updated_at as string,
    });
  }
}

async function updateSOSSessionAlertState({
  alertDeliveryMethod,
  alertDeliveryStatus,
  guardianCount,
  sessionId,
}: {
  alertDeliveryMethod: GuardianAlertDeliveryMethod | null;
  alertDeliveryStatus: GuardianAlertDeliveryStatus;
  guardianCount: number;
  sessionId: string;
}) {
  const { error } = await supabase
    .from("sos_sessions")
    .update({
      alert_delivery_method: alertDeliveryMethod,
      alert_delivery_status: alertDeliveryStatus,
      guardian_count: guardianCount,
    } as any)
    .eq("id", sessionId);

  if (error) throw error;
}

export async function startLocationTracking(session: StoredSOSSession) {
  await saveStoredActiveSOSSession(session);

  if (Platform.OS === "web") {
    webLocationWatch?.remove();
    webLocationWatch = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 0,
        timeInterval: SOS_TRACKING_INTERVAL_MS,
      },
      async (location) => {
        try {
          await updateSOSSessionLocation({
            accuracy:
              typeof location.coords.accuracy === "number"
                ? location.coords.accuracy
                : null,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            sessionId: session.sessionId,
          });
        } catch (error) {
          console.error("Web SOS location update failed:", error);
        }
      },
    );
    return;
  }

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    SOS_LOCATION_TASK_NAME,
  );
  if (hasStarted) return;

  await Location.startLocationUpdatesAsync(SOS_LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    deferredUpdatesInterval: SOS_TRACKING_INTERVAL_MS,
    distanceInterval: 0,
    foregroundService: {
      notificationBody:
        "Your SOS alert is active and your guardians can track you.",
      notificationColor: "#E53935",
      notificationTitle: "SOS Active",
    },
    showsBackgroundLocationIndicator: true,
    timeInterval: SOS_TRACKING_INTERVAL_MS,
  });
}

export async function stopLocationTracking() {
  if (Platform.OS === "web") {
    webLocationWatch?.remove();
    webLocationWatch = null;
    return;
  }

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    SOS_LOCATION_TASK_NAME,
  );
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(SOS_LOCATION_TASK_NAME);
  }
}

export async function triggerCall119() {
  const phoneUrl = Platform.OS === "ios" ? "telprompt:119" : "tel:119";
  const supported = await Linking.canOpenURL(phoneUrl);

  if (!supported) {
    throw new Error("This device cannot place a 119 call from the app.");
  }

  await Linking.openURL(phoneUrl);
}

function emitStartProgress(
  onProgress: ((progress: StartSOSProgress) => void) | undefined,
  key: StartSOSProgressKey,
) {
  onProgress?.({
    done: true,
    key,
    label: START_PROGRESS_LABELS[key],
  });
}

export async function startSOS({
  mode,
  onProgress,
}: {
  mode: SOSMode;
  onProgress?: (progress: StartSOSProgress) => void;
}): Promise<StartSOSResult> {
  const context = await getCurrentSOSContext();

  if (!context.liveLocationEnabled) {
    throw new Error(
      "Live location is disabled in your Privacy settings. Enable it before starting SOS.",
    );
  }

  if (context.guardians.length === 0) {
    throw new Error("Add at least one guardian before starting SOS.");
  }

  const existingSession = await getActiveSOSSessionForUser(context.userId);
  if (existingSession) {
    const storedExisting = mapSOSSessionRowToStoredSession(existingSession);
    await saveStoredActiveSOSSession(storedExisting);

    return {
      alertMessage: buildSOSAlertMessage({
        liveLocationLink: storedExisting.shareUrl,
        mode: storedExisting.mode,
        senderName: storedExisting.userName,
        startedAt: storedExisting.startedAt,
      }),
      guardians: context.guardians,
      session: storedExisting,
    };
  }

  await ensureSOSLocationPermissions();

  const createdSession = await createSOSSessionRecord({
    guardianCount: context.guardians.length,
    mode,
    userId: context.userId,
    userName: context.userName,
  });
  emitStartProgress(onProgress, "creating_session");

  let storedSession = mapSOSSessionRowToStoredSession(createdSession);
  await saveStoredActiveSOSSession(storedSession);

  try {
    const location = await getBestAvailableLocation();
    await updateSOSSessionLocation({
      accuracy:
        typeof location.coords.accuracy === "number"
          ? location.coords.accuracy
          : null,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      sessionId: createdSession.id,
      writeFirstLocation: true,
    });
    emitStartProgress(onProgress, "capturing_location");

    const refreshedSession =
      (await getSOSSessionById(createdSession.id)) ?? createdSession;
    storedSession = mapSOSSessionRowToStoredSession(refreshedSession);
    await saveStoredActiveSOSSession(storedSession);

    onProgress?.({
      done: false,
      key: "alerting_guardians",
      label: "Alerting guardians...",
    });

    const { dispatchGuardianAlert } = await import("@/hooks/notifyVerifiedGuardians");
    await dispatchGuardianAlert({
      accuracy:
        typeof location.coords.accuracy === "number"
          ? location.coords.accuracy
          : null,
      guardians: context.guardians,
      latitude: location.coords.latitude,
      liveLocationLink: storedSession.shareUrl,
      longitude: location.coords.longitude,
      mode,
      senderName: context.userName,
      sessionId: createdSession.id,
      startedAt: createdSession.started_at,
    });

    onProgress?.({
      done: true,
      key: "alerting_guardians",
      label: "Guardian alert sent",
    });

    await startLocationTracking(storedSession);
    emitStartProgress(onProgress, "starting_tracking");

    return {
      alertMessage: "WhatsApp SOS Alert Sent",
      guardians: context.guardians,
      session: storedSession,
    };
  } catch (error) {
    await stopLocationTracking().catch(() => undefined);
    await clearStoredActiveSOSSession().catch(() => undefined);
    await supabase
      .from("sos_sessions")
      .update({
        ended_at: new Date().toISOString(),
        status: "ended",
      } as any)
      .eq("id", createdSession.id);
    throw error;
  }
}

export async function startQuickSOS(
  onProgress?: (progress: StartSOSProgress) => void,
) {
  return startSOS({ mode: "quick", onProgress });
}

export async function startEmergencySOS(
  onProgress?: (progress: StartSOSProgress) => void,
) {
  return startSOS({ mode: "emergency", onProgress });
}

export async function stopSOS(sessionId: string) {
  await stopLocationTracking();

  const { error } = await supabase
    .from("sos_sessions")
    .update({
      ended_at: new Date().toISOString(),
      status: "ended",
    } as any)
    .eq("id", sessionId);

  if (error) throw error;

  await clearStoredActiveSOSSession();
}

export async function openPendingGuardianAlert(session: StoredSOSSession) {
  const guardians = await loadGuardianRecipients(session.userId);
  const message = buildSOSAlertMessage({
    liveLocationLink: session.shareUrl,
    mode: session.mode,
    senderName: session.userName,
    startedAt: session.startedAt,
  });

  const composerResult = await openGuardianAlertComposer({
    guardians,
    message,
  });

  const alertDeliveryStatus: GuardianAlertDeliveryStatus =
    composerResult.method === "none" ? "skipped" : "pending";

  await updateSOSSessionAlertState({
    alertDeliveryMethod: composerResult.method,
    alertDeliveryStatus,
    guardianCount: guardians.length,
    sessionId: session.sessionId,
  });

  const nextSession = {
    ...session,
    alertDeliveryMethod: composerResult.method,
    alertDeliveryStatus,
    guardianCount: guardians.length,
  };

  await saveStoredActiveSOSSession(nextSession);
  return nextSession;
}

function extractSupabaseRelationName(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const candidates = ["message", "details", "hint"]
    .map((key) => {
      const value = error[key as keyof typeof error];
      return typeof value === "string" ? value : "";
    })
    .filter(Boolean);

  for (const candidate of candidates) {
    const schemaCacheMatch = candidate.match(
      /Could not find the table '([^']+)' in the schema cache/i,
    );
    if (schemaCacheMatch?.[1]) {
      return schemaCacheMatch[1];
    }

    const relationMissingMatch = candidate.match(
      /relation ["']?([^"']+)["']? does not exist/i,
    );
    if (relationMissingMatch?.[1]) {
      return relationMissingMatch[1];
    }
  }

  return null;
}

export function getSOSStatusMessage(error: unknown) {
  const missingRelation = extractSupabaseRelationName(error);
  if (
    missingRelation === "public.sos_sessions" ||
    missingRelation === "public.sos_locations"
  ) {
    return "SOS database setup is incomplete. Run the SQL in db_schema.sql in your Supabase project, then reopen the app.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  return "Unable to complete the SOS action right now.";
}
