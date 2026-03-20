import { Linking, Share, Alert } from "react-native";
import type { Tables } from "@/database.types";
import { loadCachedGuardians } from "@/lib/saveguardians";
import { supabase, supabaseKey, supabaseUrl } from "@/lib/superbase";
import { sendSOSWhatsAppAlert } from "@/services/sendSOSWhatsAppAlert";

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

  const remoteRecipients = extractGuardianRecipients(
    (data as GuardiansRow | null) ?? null,
  );

  if (remoteRecipients.length > 0) {
    return remoteRecipients;
  }

  const cachedRecipients = await loadCachedGuardians(userId);
  const mappedCachedRecipients = (cachedRecipients ?? []).map((recipient) => ({
    isVerified: false,
    name: recipient.name.trim(),
    phone: normalizePhone(recipient.phone.trim()),
    whatsappNumber: normalizePhone(recipient.phone.trim()),
  }));

  if (mappedCachedRecipients.length > 0) {
    return mappedCachedRecipients;
  }

  if (error) {
    throw new Error(
      "Unable to load guardian contacts right now. Check your internet connection and try again.",
    );
  }

  return mappedCachedRecipients;
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
  accuracy,
  guardians,
  latitude,
  liveLocationLink,
  longitude,
  mode,
  senderName,
  sessionId,
  startedAt,
}: {
  accuracy?: number | null;
  guardians: GuardianRecipient[];
  latitude: number;
  liveLocationLink: string;
  longitude: number;
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

  try {
    await supabase.auth.refreshSession();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const data = await sendSOSWhatsAppAlert(guardians.map((g) => g.phone));
    
    const method: GuardianAlertDeliveryMethod = "whatsapp-api";

    return {
      guardianCount: guardians.length,
      message:
        typeof data?.message === "string" &&
        data.message.trim().length > 0
          ? data.message
          : message,
      method,
      status: "sent",
    };
  } catch (error) {
    console.error("[dispatchGuardianAlert] Error:", error);
    // If auto-delivery fails, we fallback to manual whatsapp if possible.
    return {
      guardianCount: guardians.length,
      message,
      method: "manual-whatsapp",
      status: "pending",
    };
  }
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

export const notifyVerifiedGuardians = async (userId: string, liveLocationLink: string) => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('alert_notif')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }

    if (!profile?.alert_notif) {
      console.log('Alert notifications disabled by user.');
      return;
    }

    const { data, error } = await supabase
      .from('guardians')
      .select('g1_name, g1_phone, g1_verified, g2_name, g2_phone, g2_verified, g3_name, g3_phone, g3_verified, g4_name, g4_phone, g4_verified, g5_name, g5_phone, g5_verified')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.log('No guardians found to notify.');
      return;
    }

    const guardians = extractGuardianRecipients(data as any);
    if (guardians.length === 0) {
      console.log('No verified guardians found to notify.');
      return;
    }

    for (const guardian of guardians) {
      await supabase.functions.invoke('send-sos-sms', {
        body: {
          phone: guardian.phone,
          message: `SOS Alert! Someone needs help! Track live location: ${liveLocationLink}`
        }
      });
      console.log(`SMS sent to ${guardian.name} (${guardian.phone})`);
    }

    Alert.alert('Guardians Notified', `Sent alert to ${guardians.length} verified guardians.`);

  } catch (err) {
    console.error('Unexpected error notifying guardians:', err);
  }
};
