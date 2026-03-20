import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";

type RequestBody = {
  accuracy?: number | null;
  latitude?: number;
  longitude?: number;
  userName?: string;
};

type TwilioSuccessBody = {
  sid?: string;
  status?: string;
};

type TwilioErrorBody = {
  code?: number;
  message?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
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

function xmlResponse(status: number, xml: string) {
  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
    },
    status,
  });
}

function isValidE164PhoneNumber(phone: string) {
  return /^\+\d{8,15}$/.test(phone.trim());
}

function buildTwilioAuthHeader(accountSid: string, authToken: string) {
  return `Basic ${btoa(`${accountSid}:${authToken}`)}`;
}

type GuardiansRow = {
  g1_phone: string | null;
  g2_phone: string | null;
  g3_phone: string | null;
  g4_phone: string | null;
  g5_phone: string | null;
};

async function loadGuardianPhonesForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("guardians")
    .select("g1_phone, g2_phone, g3_phone, g4_phone, g5_phone")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message || "Unable to load saved guardians for this user.",
    );
  }

  const row = (data as GuardiansRow | null) ?? null;
  if (!row) return [] as string[];

  const phones = [
    row.g1_phone,
    row.g2_phone,
    row.g3_phone,
    row.g4_phone,
    row.g5_phone,
  ]
    .filter((phone): phone is string => typeof phone === "string")
    .map((phone) => phone.trim())
    .filter((phone) => isValidE164PhoneNumber(phone));

  return [...new Set(phones)].slice(0, 5);
}

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function safeConferenceName(raw: string) {
  // Twilio conference names are simple strings; keep it predictable.
  // Allow letters, numbers, dash, underscore, dot.
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
  return cleaned || `sos-${crypto.randomUUID()}`;
}

async function createSOSHistoryRecord(
  supabase: ReturnType<typeof createClient>,
  {
    accuracy,
    guardianCount,
    latitude,
    longitude,
    userId,
    userName,
  }: {
    accuracy: number | null;
    guardianCount: number;
    latitude: number;
    longitude: number;
    userId: string;
    userName: string;
  },
) {
  const startedAt = new Date().toISOString();

  const { data: sessionRow, error: sessionError } = await supabase
    .from("sos_sessions")
    .insert({
      accuracy,
      alert_delivery_method: "voice-conference",
      alert_delivery_status: "pending",
      ended_at: startedAt,
      first_lat: latitude,
      first_lng: longitude,
      guardian_count: guardianCount,
      last_lat: latitude,
      last_lng: longitude,
      last_updated_at: startedAt,
      mode: "emergency",
      status: "ended",
      user_id: userId,
      user_name: userName,
    } as never)
    .select("id")
    .single();

  if (sessionError || !sessionRow?.id) {
    throw new Error(
      sessionError?.message || "Unable to create the SOS history record.",
    );
  }

  const { error: locationError } = await supabase.from("sos_locations").insert({
    accuracy,
    lat: latitude,
    lng: longitude,
    session_id: sessionRow.id,
  } as never);

  if (locationError) {
    throw new Error(
      locationError.message || "Unable to save the SOS location history.",
    );
  }

  return sessionRow.id as string;
}

async function finalizeSOSHistoryRecord(
  supabase: ReturnType<typeof createClient>,
  {
    sessionId,
    status,
  }: {
    sessionId: string;
    status: "failed" | "sent";
  },
) {
  const { error } = await supabase
    .from("sos_sessions")
    .update({
      alert_delivery_status: status,
      last_updated_at: new Date().toISOString(),
    } as never)
    .eq("id", sessionId);

  if (error) {
    console.error("Unable to finalize SOS history status:", error.message);
  }
}

function buildTwiml(conferenceName: string, userName: string) {
  const escapedConference = xmlEscape(conferenceName);
  const escapedName = xmlEscape(userName);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Emergency alert from ${escapedName}. Joining safety conference.</Say>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="false">${escapedConference}</Conference>
  </Dial>
</Response>`;
}

function buildTwimlUrl({
  requestUrl,
  conferenceName,
  userName,
  token,
}: {
  requestUrl: URL;
  conferenceName: string;
  userName: string;
  token: string;
}) {
  const basePath = requestUrl.pathname.replace(/\/$/, "");
  const twimlPath = basePath.endsWith("/twiml")
    ? basePath
    : `${basePath}/twiml`;

  const twimlUrl = new URL(`${requestUrl.origin}${twimlPath}`);
  twimlUrl.searchParams.set("conference", conferenceName);
  twimlUrl.searchParams.set("userName", userName);
  twimlUrl.searchParams.set("token", token);
  return twimlUrl.toString();
}

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const isTwimlRequest = pathname.endsWith("/twiml");

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Twilio hits this URL (no Authorization header) to fetch TwiML.
  if (isTwimlRequest) {
    if (request.method !== "GET") {
      return jsonResponse(405, {
        error: "Method not allowed.",
        success: false,
      });
    }

    const token = url.searchParams.get("token")?.trim() ?? "";
    const expectedToken = Deno.env.get("TWILIO_TWIML_TOKEN")?.trim() ?? "";

    if (!expectedToken || token !== expectedToken) {
      return jsonResponse(401, { error: "Unauthorized.", success: false });
    }

    const conferenceName = safeConferenceName(
      url.searchParams.get("conference")?.trim() ?? "sos-conference",
    );

    const userName =
      url.searchParams.get("userName")?.trim() || "Safety on Speed user";

    return xmlResponse(200, buildTwiml(conferenceName, userName));
  }

  // Start conference + dial guardians.
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed.", success: false });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey =
      Deno.env.get("SB_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = request.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse(500, {
        error: "Supabase function environment is incomplete.",
        success: false,
      });
    }

    if (!authHeader) {
      return jsonResponse(401, {
        error: "Missing Authorization header.",
        success: false,
      });
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
      return jsonResponse(401, { error: "Unauthorized.", success: false });
    }

    const body = (await request.json().catch(() => null)) as RequestBody | null;
    const accuracy =
      typeof body?.accuracy === "number" && Number.isFinite(body.accuracy)
        ? body.accuracy
        : null;
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);

    const userName =
      typeof body?.userName === "string" && body.userName.trim().length > 0
        ? body.userName.trim()
        : "Safety on Speed user";

    const guardians = await loadGuardianPhonesForUser(supabase, user.id);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return jsonResponse(400, {
        error: "Valid latitude and longitude are required.",
        success: false,
      });
    }

    if (guardians.length === 0) {
      return jsonResponse(400, {
        error:
          "No valid saved guardians found for this user. Add up to 5 guardians first.",
        success: false,
      });
    }

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim();
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim();

    // Use a dedicated voice-capable number if provided.
    const twilioFromNumber =
      Deno.env.get("TWILIO_VOICE_FROM_NUMBER")?.trim() ||
      Deno.env.get("TWILIO_FROM_NUMBER")?.trim();

    const twimlToken = Deno.env.get("TWILIO_TWIML_TOKEN")?.trim();

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      return jsonResponse(500, {
        error:
          "Twilio secrets are missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VOICE_FROM_NUMBER (or TWILIO_FROM_NUMBER).",
        success: false,
      });
    }

    if (!twimlToken) {
      return jsonResponse(500, {
        error:
          "Missing TWILIO_TWIML_TOKEN secret for TwiML endpoint protection.",
        success: false,
      });
    }

    const conferenceName = safeConferenceName(
      `sos-${user.id}-${new Date().toISOString()}`,
    );

    const historySessionId = await createSOSHistoryRecord(supabase, {
      accuracy,
      guardianCount: guardians.length,
      latitude,
      longitude,
      userId: user.id,
      userName,
    });

    const twimlUrl = buildTwimlUrl({
      requestUrl: url,
      conferenceName,
      userName,
      token: twimlToken,
    });

    const results: Array<{
      error?: string;
      sid?: string;
      status: "failed" | "sent";
      to: string;
    }> = [];

    for (const guardian of guardians) {
      try {
        const params = new URLSearchParams();
        params.set("From", twilioFromNumber);
        params.set("To", guardian);
        params.set("Url", twimlUrl);
        params.set("Method", "GET");

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`,
          {
            body: params.toString(),
            headers: {
              Authorization: buildTwilioAuthHeader(
                twilioAccountSid,
                twilioAuthToken,
              ),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            method: "POST",
          },
        );

        if (!response.ok) {
          const errorBody = (await response
            .json()
            .catch(() => null)) as TwilioErrorBody | null;

          results.push({
            error: errorBody?.message || "Twilio call request failed.",
            status: "failed",
            to: guardian,
          });
          continue;
        }

        const successBody = (await response
          .json()
          .catch(() => null)) as TwilioSuccessBody | null;

        results.push({
          sid: successBody?.sid,
          status: "sent",
          to: guardian,
        });
      } catch (error) {
        results.push({
          error:
            error instanceof Error
              ? error.message
              : "Unexpected error while starting call.",
          status: "failed",
          to: guardian,
        });
      }
    }

    const sentCount = results.filter((item) => item.status === "sent").length;
    const failedCount = results.length - sentCount;

    await finalizeSOSHistoryRecord(supabase, {
      sessionId: historySessionId,
      status: sentCount > 0 ? "sent" : "failed",
    });

    return jsonResponse(sentCount > 0 ? 200 : 502, {
      conferenceName,
      failedCount,
      historySessionId,
      message:
        sentCount > 0
          ? `Conference calls started for ${sentCount} guardian(s).`
          : "Failed to start conference calls.",
      results,
      sentCount,
      success: sentCount > 0,
    });
  } catch (error) {
    return jsonResponse(500, {
      error:
        error instanceof Error
          ? error.message
          : "Unexpected error while starting SOS conference calls.",
      success: false,
    });
  }
});
