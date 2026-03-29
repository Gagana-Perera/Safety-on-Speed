import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * WhatsApp SOS Alert Edge Function
 *
 * This function sends the approved WhatsApp Cloud API template `sos_alert`
 * to one or more guardians using the permanent Meta system-user token
 * stored in Supabase secrets.
 */

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const WHATSAPP_API_VERSION = "v23.0";
const TEMPLATE_NAME = "sos_alert";
const TEMPLATE_LANGUAGE = "en";

type RequestBody = {
  guardians?: string[];
  latitude?: number;
  longitude?: number;
  userName?: string;
};

type MetaSuccessResponse = {
  messages?: Array<{
    id?: string;
  }>;
  messaging_product?: string;
};

type MetaErrorResponse = {
  error?: {
    code?: number;
    error_data?: unknown;
    fbtrace_id?: string;
    message?: string;
    type?: string;
  };
};

type GuardianSendResult = {
  error?: string;
  messageId?: string;
  ok: boolean;
  response?: MetaSuccessResponse | MetaErrorResponse | unknown;
  status?: number;
  to: string;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function normalizePhoneNumber(phone: string) {
  const digitsOnly = phone.trim().replace(/\D/g, "");
  if (!digitsOnly) return "";
  return digitsOnly;
}

function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function buildGoogleMapsLink(latitude: number, longitude: number) {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

function formatSriLankaTime(date: Date) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // sv-SE gives `YYYY-MM-DD HH:mm`, which matches the requested format.
  return formatter.format(date);
}

function buildTemplatePayload(
  guardianNumber: string,
  userName: string,
  locationLink: string,
  recordedTime: string,
) {
  return {
    messaging_product: "whatsapp",
    to: guardianNumber,
    type: "template",
    template: {
      name: TEMPLATE_NAME,
      language: { code: TEMPLATE_LANGUAGE },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              parameter_name: "user_name",
              text: userName,
            },
            {
              type: "text",
              parameter_name: "location_link",
              text: locationLink,
            },
            {
              type: "text",
              parameter_name: "time",
              text: recordedTime,
            },
          ],
        },
      ],
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      error: "Method not allowed. Use POST.",
      success: false,
    });
  }

  try {
    const whatsappToken = Deno.env.get("WHATSAPP_TOKEN")?.trim();
    const phoneNumberId = Deno.env.get("PHONE_NUMBER_ID")?.trim();

    if (!whatsappToken || !phoneNumberId) {
      return jsonResponse(500, {
        error:
          "Missing required environment variables: WHATSAPP_TOKEN and/or PHONE_NUMBER_ID.",
        success: false,
      });
    }

    const body = (await req.json().catch(() => null)) as RequestBody | null;
    const guardians = Array.isArray(body?.guardians) ? body.guardians : [];
    const latitude = body?.latitude;
    const longitude = body?.longitude;
    const userName =
      typeof body?.userName === "string" && body.userName.trim().length > 0
        ? body.userName.trim()
        : "Safety on Speed user";

    if (guardians.length === 0) {
      return jsonResponse(400, {
        error: "The guardians field is required and must be a non-empty array.",
        success: false,
      });
    }

    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
      return jsonResponse(400, {
        error: "Both latitude and longitude are required.",
        success: false,
      });
    }

    const locationLink = buildGoogleMapsLink(latitude, longitude);
    const recordedTime = formatSriLankaTime(new Date());
    const metaApiUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

    const results: GuardianSendResult[] = await Promise.all(
      guardians.map(async (guardian) => {
        const normalizedNumber = normalizePhoneNumber(guardian);

        if (!normalizedNumber) {
          return {
            error: "Invalid guardian phone number.",
            ok: false,
            to: guardian,
          };
        }

        try {
          const payload = buildTemplatePayload(
            normalizedNumber,
            userName,
            locationLink,
            recordedTime,
          );

          const response = await fetch(metaApiUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${whatsappToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const responseData = (await response.json().catch(() => ({}))) as
            | MetaSuccessResponse
            | MetaErrorResponse;

          if (response.ok) {
            return {
              messageId:
                "messages" in responseData
                  ? responseData.messages?.[0]?.id
                  : undefined,
              ok: true,
              response: responseData,
              status: response.status,
              to: normalizedNumber,
            };
          }

          return {
            error:
              "error" in responseData
                ? responseData.error?.message || "Meta WhatsApp API error."
                : "Meta WhatsApp API error.",
            ok: false,
            response: responseData,
            status: response.status,
            to: normalizedNumber,
          };
        } catch (error) {
          return {
            error:
              error instanceof Error
                ? error.message
                : "Unexpected error while sending WhatsApp message.",
            ok: false,
            to: normalizedNumber,
          };
        }
      })
    );

    const sentCount = results.filter((r) => r.ok).length;

    const failedCount = results.length - sentCount;

    return jsonResponse(200, {
      failedCount,
      language: TEMPLATE_LANGUAGE,
      locationLink,
      recordedTime,
      results,
      sentCount,
      success: sentCount > 0,
      templateName: TEMPLATE_NAME,
    });
  } catch (error) {
    return jsonResponse(500, {
      error:
        error instanceof Error
          ? error.message
          : "Unexpected server error while sending WhatsApp alerts.",
      success: false,
    });
  }
});
