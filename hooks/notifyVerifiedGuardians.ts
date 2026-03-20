import { Linking, Share } from "react-native";

import type { Tables } from "@/database.types";
import { loadCachedGuardians } from "@/lib/saveguardians";
import { supabase } from "@/lib/superbase";

export type SOSMode = "quick" | "emergency";

export type GuardianRecipient = {
  isVerified: boolean;
  name: string;
  phone: string;
  whatsappNumber: string;
};

export type GuardianAlertDeliveryMethod =
  | "manual-whatsapp"
  | "none"
  | "share-sheet"
  | "sms-api"
  | "whatsapp-api";

export type GuardianAlertDeliveryStatus = "pending" | "sent" | "skipped";

export type GuardianAlertDeliveryResult = {
  guardianCount: number;
  message: string;
  method: GuardianAlertDeliveryMethod;
  status: GuardianAlertDeliveryStatus;
};

type AlertWebhookSuccessResponse = {
  message?: string;
  provider?: "sms" | "whatsapp";
};

type GuardiansRow = Pick<
  Tables<"guardians">,
  | "g1_name"
  | "g1_phone"
  | "g1_verified"
  | "g2_name"
  | "g2_phone"
  | "g2_verified"
  | "g3_name"
  | "g3_phone"
  | "g3_verified"
  | "g4_name"
  | "g4_phone"
  | "g4_verified"
  | "g5_name"
  | "g5_phone"
  | "g5_verified"
>;

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function extractGuardianRecipients(row: GuardiansRow | null) {
  if (!row) return [];

  const allRecipients: GuardianRecipient[] = [];
  const verifiedRecipients: GuardianRecipient[] = [];

  for (let i = 1; i <= 5; i += 1) {
    const name = row[`g${i}_name` as keyof GuardiansRow];
    const phone = row[`g${i}_phone` as keyof GuardiansRow];
    const verified = row[`g${i}_verified` as keyof GuardiansRow];

    if (typeof name !== "string" || typeof phone !== "string") continue;

    const trimmedName = name.trim();
    const normalizedPhone = normalizePhone(phone.trim());
    if (!trimmedName || !normalizedPhone) continue;

    const recipient = {
      isVerified: verified === true,
      name: trimmedName,
      phone: normalizedPhone,
      whatsappNumber: normalizedPhone,
    };

    allRecipients.push(recipient);
    if (recipient.isVerified) {
      verifiedRecipients.push(recipient);
    }
  }

  return verifiedRecipients.length > 0 ? verifiedRecipients : allRecipients;
}

export async function loadGuardianRecipients(
  userId: string,
): Promise<GuardianRecipient[]> {
  const { data, error } = await supabase
    .from("guardians")
    .select(
      "g1_name, g1_phone, g1_verified, g2_name, g2_phone, g2_verified, g3_name, g3_phone, g3_verified, g4_name, g4_phone, g4_verified, g5_name, g5_phone, g5_verified",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching guardians:", error);
  }

  const remoteRecipients = extractGuardianRecipients(
    (data as GuardiansRow | null) ?? null,
  );

  if (remoteRecipients.length > 0) {
    return remoteRecipients;
  }

  const cachedRecipients = await loadCachedGuardians(userId);
  return (cachedRecipients ?? []).map((recipient) => ({
    isVerified: false,
    name: recipient.name.trim(),
    phone: normalizePhone(recipient.phone.trim()),
    whatsappNumber: normalizePhone(recipient.phone.trim()),
  }));
}

export async function countGuardianRecipients(userId: string) {
  const recipients = await loadGuardianRecipients(userId);
  return recipients.length;
}

export function buildSOSAlertMessage({
  liveLocationLink,
  mode,
  senderName,
  startedAt,
}: {
  liveLocationLink: string;
  mode: SOSMode;
  senderName: string;
  startedAt: string;
}) {
  const label = mode === "emergency" ? "EMERGENCY SOS" : "SOS alert";
  const responseLine =
    mode === "emergency"
      ? "Please respond immediately."
      : "Please check in as soon as possible.";

  return `${label} from ${senderName}\n\nLive location:\n${liveLocationLink}\n\nTime: ${new Date(
    startedAt,
  ).toLocaleString()}\nTracking remains live until SOS is stopped.\n\n${responseLine}`;
}

function buildSingleRecipientWhatsAppUrl(recipient: GuardianRecipient, message: string) {
  const phone = recipient.whatsappNumber.replace(/[^\d]/g, "");
  return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

function buildBroadcastWhatsAppUrl(message: string) {
  return `whatsapp://send?text=${encodeURIComponent(message)}`;
}

export async function dispatchGuardianAlert({
  guardians,
  liveLocationLink,
  mode,
  senderName,
  sessionId,
  startedAt,
}: {
  guardians: GuardianRecipient[];
  liveLocationLink: string;
  mode: SOSMode;
  senderName: string;
  sessionId: string;
  startedAt: string;
}): Promise<GuardianAlertDeliveryResult> {
  const message = buildSOSAlertMessage({
    liveLocationLink,
    mode,
    senderName,
    startedAt,
  });

  if (guardians.length === 0) {
    return {
      guardianCount: 0,
      message,
      method: "none",
      status: "skipped",
    };
  }

  const webhookUrl = process.env.EXPO_PUBLIC_SOS_ALERT_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return {
      guardianCount: guardians.length,
      message,
      method: "manual-whatsapp",
      status: "pending",
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(webhookUrl, {
    body: JSON.stringify({
      guardians,
      liveLocationLink,
      message,
      mode,
      senderName,
      sessionId,
      startedAt,
    }),
    headers: {
      ...(process.env.EXPO_PUBLIC_SUPABASE_KEY
        ? { apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY }
        : {}),
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const rawBody = await response.text().catch(() => "");
    let errorMessage = rawBody.trim();

    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody) as { error?: unknown; message?: unknown };
        if (typeof parsed.error === "string" && parsed.error.trim().length > 0) {
          errorMessage = parsed.error;
        } else if (
          typeof parsed.message === "string" &&
          parsed.message.trim().length > 0
        ) {
          errorMessage = parsed.message;
        }
      } catch {
        // Leave the plain-text response body as-is.
      }
    }

    throw new Error(errorMessage || "Guardian alert delivery failed.");
  }

  const responseBody = (await response
    .json()
    .catch(() => null)) as AlertWebhookSuccessResponse | null;
  const method: GuardianAlertDeliveryMethod =
    responseBody?.provider === "sms" ? "sms-api" : "whatsapp-api";

  return {
    guardianCount: guardians.length,
    message:
      typeof responseBody?.message === "string" && responseBody.message.trim().length > 0
        ? responseBody.message
        : message,
    method,
    status: "sent",
  };
}

export async function openGuardianAlertComposer({
  guardians,
  message,
}: {
  guardians: GuardianRecipient[];
  message: string;
}) {
  if (guardians.length === 0) {
    return { method: "none" as const };
  }

  const deepLink =
    guardians.length === 1
      ? buildSingleRecipientWhatsAppUrl(guardians[0], message)
      : buildBroadcastWhatsAppUrl(message);

  try {
    await Linking.openURL(deepLink);
    return { method: "manual-whatsapp" as const };
  } catch (error) {
    console.warn("Unable to open WhatsApp composer:", error);
  }

  await Share.share({
    message,
    title: "SOS Alert",
  });

  return { method: "share-sheet" as const };
}
