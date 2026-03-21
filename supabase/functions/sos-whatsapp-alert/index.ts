import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * WhatsApp SOS Alert Edge Function
 * 
 * This function handles sending WhatsApp template messages (default: hello_world)
 * to a list of guardian phone numbers using the Meta WhatsApp Cloud API.
 */

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

interface RequestBody {
  guardians: string[];
  userName?: string;
  latitude?: number;
  longitude?: number;
}

function jsonResponse(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
    const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const TEMPLATE_NAME = Deno.env.get("WHATSAPP_TEMPLATE_NAME") || "sos_alert";
    const TEMPLATE_LANG = Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "en_US";

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      return jsonResponse(500, {
        success: false,
        error: "Server credentials missing (WHATSAPP_TOKEN/PHONE_NUMBER_ID).",
      });
    }

    const { guardians, userName, latitude, longitude }: RequestBody = await req.json();

    if (!guardians?.length) {
      return jsonResponse(400, { success: false, error: "Missing guardians array." });
    }

    // Prepare Template Variables
    const nameStr = userName || "A user";
    const locStr = (latitude && longitude) 
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : "Unknown Location";
    
    // Sri Lanka Time (UTC+5:30)
    const now = new Date();
    const slTime = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Colombo",
    }).format(now);

    const results = [];
    let successCount = 0;

    for (const rawNumber of guardians) {
      const cleanedNumber = rawNumber.replace(/\D/g, "");
      if (!cleanedNumber || cleanedNumber.length < 11 || cleanedNumber.length > 15) {
        results.push({
          to: rawNumber,
          ok: false,
          error:
            "Invalid phone number format. Use full international format like +9477XXXXXXX.",
        });
        continue;
      }

      try {
        const metaApiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;
        
        // Build payload based on template name
        const isHelloWorld = TEMPLATE_NAME === "hello_world";
        const payload: any = {
          messaging_product: "whatsapp",
          to: cleanedNumber,
          type: "template",
          template: {
            name: TEMPLATE_NAME,
            language: { code: TEMPLATE_LANG },
          },
        };

        if (!isHelloWorld) {
          // sos_alert expects 3 variables: user_name, location_link, time
          payload.template.components = [
            {
              type: "body",
              parameters: [
                { type: "text", text: nameStr },
                { type: "text", text: locStr },
                { type: "text", text: slTime },
              ],
            },
          ];
        }

        const response = await fetch(metaApiUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const metaData = await response.json();

        if (response.ok) {
          successCount++;
          results.push({ to: cleanedNumber, ok: true, status: response.status });
        } else {
          results.push({
            to: cleanedNumber,
            ok: false,
            status: response.status,
            error: metaData.error?.message || "Meta API Error",
            details: metaData,
          });
        }
      } catch (e: any) {
        results.push({ to: rawNumber, ok: false, error: e.message });
      }
    }

    return jsonResponse(200, {
      success: successCount > 0,
      message: `Processed ${guardians.length} guardian(s). Sent: ${successCount}.`,
      template_used: TEMPLATE_NAME,
      results,
    });

  } catch (error: any) {
    return jsonResponse(500, { success: false, error: error.message });
  }
});
