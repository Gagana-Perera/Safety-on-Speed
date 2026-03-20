import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": "*",
};

type GuardianRecipient = {
  isVerified: boolean;
  name: string;
  phone: string;
  whatsappNumber: string;
};

type GuardiansRow = {
  g1_name: string | null;
  g1_phone: string | null;
  g1_verified: boolean | null;
  g2_name: string | null;
  g2_phone: string | null;
  g2_verified: boolean | null;
  g3_name: string | null;
  g3_phone: string | null;
  g3_verified: boolean | null;
  g4_name: string | null;
  g4_phone: string | null;
  g4_verified: boolean | null;
  g5_name: string | null;
  g5_phone: string | null;
  g5_verified: boolean | null;
};

type SOSSessionRow = {
  id: string;
  mode: "quick" | "emergency";
  share_token: string;
  started_at: string;
  status: "active" | "ended";
  user_id: string;
  user_name: string | null;
};

type RequestBody = {
  sessionId?: string;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    status,
  });
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function toWhatsAppNumber(phone: string) {
  return normalizePhone(phone).replace(/[^\d]/g, "");
}

function extractGuardianRecipients(row: GuardiansRow | null) {
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

function buildSOSShareUrl(shareToken: string) {
  const baseUrl = (
    Deno.env.get("SOS_BASE_URL") ?? Deno.env.get("EXPO_PUBLIC_SOS_BASE_URL") ?? ""
  )
    .trim()
    .replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("SOS_BASE_URL is not configured for WhatsApp alerts.");
  }

  return `${baseUrl}/sos/${encodeURIComponent(shareToken)}`;
}

function formatStartedAt(startedAt: string) {
  return new Date(startedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildSOSAlertMessage({
  liveLocationLink,
  mode,
  senderName,
  startedAt,
}: {
  liveLocationLink: string;
  mode: "quick" | "emergency";
  senderName: string;
  startedAt: string;
}) {
  const label = mode === "emergency" ? "EMERGENCY SOS" : "SOS alert";
  const responseLine =
    mode === "emergency"
      ? "Please respond immediately."
      : "Please check in as soon as possible.";

  return `${label} from ${senderName}\n\nLive location:\n${liveLocationLink}\n\nTime: ${formatStartedAt(
    startedAt,
  )}\nTracking remains live until SOS is stopped.\n\n${responseLine}`;
}

function buildTemplatePayload({
  liveLocationLink,
  mode,
  senderName,
  startedAt,
  to,
}: {
  liveLocationLink: string;
  mode: "quick" | "emergency";
  senderName: string;
  startedAt: string;
  to: string;
}) {
  const templateName = Deno.env.get("WHATSAPP_TEMPLATE_NAME")?.trim();
  if (!templateName) return null;

  const languageCode =
    Deno.env.get("WHATSAPP_TEMPLATE_LANGUAGE")?.trim() ?? "en_US";

  return {
    messaging_product: "whatsapp",
    template: {
      components: [
        {
          parameters: [
            { text: senderName, type: "text" },
            {
              text: mode === "emergency" ? "Emergency SOS" : "Quick SOS",
              type: "text",
            },
            { text: liveLocationLink, type: "text" },
            { text: formatStartedAt(startedAt), type: "text" },
          ],
          type: "body",
        },
      ],
      language: {
        code: languageCode,
      },
      name: templateName,
    },
    to,
    type: "template",
  };
}

function buildTextPayload({
  message,
  to,
}: {
  message: string;
  to: string;
}) {
  return {
    messaging_product: "whatsapp",
    text: {
      body: message,
      preview_url: true,
    },
    to,
    type: "text",
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey =
    Deno.env.get("SB_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = request.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, { error: "Supabase function environment is incomplete." });
  }

  if (!authHeader) {
    return jsonResponse(401, { error: "Missing Authorization header." });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse(401, { error: "Unauthorized." });
  }

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const sessionId = body?.sessionId?.trim();
  if (!sessionId) {
    return jsonResponse(400, { error: "sessionId is required." });
  }

  const { data: sessionRow, error: sessionError } = await supabase
    .from("sos_sessions")
    .select("id, mode, share_token, started_at, status, user_id, user_name")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    return jsonResponse(500, { error: sessionError.message });
  }

  const session = sessionRow as SOSSessionRow | null;
  if (!session || session.user_id !== user.id) {
    return jsonResponse(404, { error: "SOS session not found." });
  }

  if (session.status !== "active") {
    return jsonResponse(409, { error: "SOS session is no longer active." });
  }

  const { data: guardiansRow, error: guardiansError } = await supabase
    .from("guardians")
    .select(
      "g1_name, g1_phone, g1_verified, g2_name, g2_phone, g2_verified, g3_name, g3_phone, g3_verified, g4_name, g4_phone, g4_verified, g5_name, g5_phone, g5_verified",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (guardiansError) {
    return jsonResponse(500, { error: guardiansError.message });
  }

  const guardians = extractGuardianRecipients((guardiansRow as GuardiansRow | null) ?? null);
  if (guardians.length === 0) {
    return jsonResponse(422, { error: "No guardians are configured for this user." });
  }

  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim();
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim();
  const apiVersion = Deno.env.get("WHATSAPP_API_VERSION")?.trim() ?? "v23.0";

  if (!accessToken || !phoneNumberId) {
    return jsonResponse(500, {
      error: "WhatsApp credentials are not configured in function secrets.",
    });
  }

  const liveLocationLink = buildSOSShareUrl(session.share_token);
  const senderName = session.user_name?.trim() || "Safety on Speed user";
  const message = buildSOSAlertMessage({
    liveLocationLink,
    mode: session.mode,
    senderName,
    startedAt: session.started_at,
  });

  const results: Array<{
    guardianName: string;
    phone: string;
    status: "sent" | "failed";
    details?: string;
    whatsappMessageId?: string;
  }> = [];

  for (const guardian of guardians) {
    const to = toWhatsAppNumber(guardian.whatsappNumber);
    if (!to) {
      results.push({
        details: "Invalid WhatsApp number.",
        guardianName: guardian.name,
        phone: guardian.phone,
        status: "failed",
      });
      continue;
    }

    const payload =
      buildTemplatePayload({
        liveLocationLink,
        mode: session.mode,
        senderName,
        startedAt: session.started_at,
        to,
      }) ?? buildTextPayload({ message, to });

    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );

    const responseBody = await response.json().catch(() => null);
    if (!response.ok) {
      const details =
        (responseBody &&
          typeof responseBody === "object" &&
          "error" in responseBody &&
          responseBody.error &&
          typeof responseBody.error === "object" &&
          "message" in responseBody.error &&
          typeof responseBody.error.message === "string" &&
          responseBody.error.message) ||
        "WhatsApp API request failed.";

      results.push({
        details,
        guardianName: guardian.name,
        phone: guardian.phone,
        status: "failed",
      });
      continue;
    }

    const whatsappMessageId =
      Array.isArray((responseBody as { messages?: Array<{ id?: string }> } | null)?.messages)
        ? (responseBody as { messages?: Array<{ id?: string }> }).messages?.[0]?.id
        : undefined;

    results.push({
      guardianName: guardian.name,
      phone: guardian.phone,
      status: "sent",
      whatsappMessageId,
    });
  }

  const sentCount = results.filter((result) => result.status === "sent").length;
  const failedCount = results.length - sentCount;

  if (sentCount === 0) {
    return jsonResponse(502, {
      error: "WhatsApp delivery failed for all guardians.",
      failedCount,
      results,
      sentCount,
    });
  }

  return jsonResponse(failedCount > 0 ? 207 : 200, {
    failedCount,
    results,
    sentCount,
    status: failedCount > 0 ? "partial" : "sent",
  });
});
