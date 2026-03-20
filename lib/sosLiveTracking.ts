import { supabase } from "@/lib/superbase";
import {
  buildSOSShareUrl,
  getActiveSOSSessionForUser,
  getSOSSessionByShareToken,
  updateSOSSessionLocation,
} from "@/lib/sosService";

export const SOS_TRACKING_POLL_MS = 3000;

function createToken() {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function buildTrackingUrl(token: string) {
  return buildSOSShareUrl(token);
}

export async function getSOSSession(token: string) {
  return getSOSSessionByShareToken(token);
}

export async function startSOS(userId: string) {
  const existingSession = await getActiveSOSSessionForUser(userId);
  if (existingSession) {
    return existingSession.share_token;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  const token = createToken();
  const { data, error } = await supabase
    .from("sos_sessions")
    .insert({
      mode: "emergency",
      share_token: token,
      status: "active",
      user_id: userId,
      user_name: profile?.full_name?.trim() || "Safety on Speed user",
    } as never)
    .select("share_token")
    .single();

  if (error) throw error;
  return data.share_token;
}

export async function updateLocation(
  token: string,
  latitude: number,
  longitude: number,
) {
  const session = await getSOSSessionByShareToken(token);
  if (!session) {
    throw new Error("SOS session not found.");
  }

  if (session.status !== "active") {
    throw new Error("This SOS session has already been stopped.");
  }

  await updateSOSSessionLocation({
    accuracy: null,
    latitude,
    longitude,
    sessionId: session.id,
    writeFirstLocation: session.first_lat == null || session.first_lng == null,
  });

  return getSOSSessionByShareToken(token);
}

export async function stopSOS(token: string) {
  const session = await getSOSSessionByShareToken(token);
  if (!session) {
    throw new Error("SOS session not found.");
  }

  const endedAt = new Date().toISOString();
  const { error } = await supabase
    .from("sos_sessions")
    .update({
      ended_at: endedAt,
      status: "ended",
    } as never)
    .eq("id", session.id);

  if (error) throw error;

  return {
    ...session,
    ended_at: endedAt,
    status: "ended",
  };
}
