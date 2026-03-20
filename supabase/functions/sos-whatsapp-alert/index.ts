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
}

function jsonResponse(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Validate Environment Variables
    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
    const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      console.error("Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID environment variables.");
      return jsonResponse(500, {
        success: false,
        error: "Server configuration error: Meta API credentials missing.",
      });
    }

    // 3. Parse and Validate Request Body
    const body: RequestBody = await req.json();
    const { guardians } = body;

    if (!guardians || !Array.isArray(guardians) || guardians.length === 0) {
      return jsonResponse(400, {
        success: false,
        error: "The 'guardians' field must be a non-empty array of phone numbers.",
      });
    }

    const results = [];
    let successCount = 0;

    // 4. Process each guardian number
    for (const rawNumber of guardians) {
      // Clean number to digits only (Meta expects country code, e.g., 94771234567)
      const cleanedNumber = rawNumber.replace(/\D/g, "");

      if (!cleanedNumber) {
        results.push({
          to: rawNumber,
          ok: false,
          error: "Invalid phone number format.",
        });
        continue;
      }

      try {
        const metaApiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;
        
        const response = await fetch(metaApiUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: cleanedNumber,
            type: "template",
            template: {
              name: "hello_world", // Using hello_world for testing as requested
              language: {
                code: "en_US",
              },
            },
          }),
        });

        const metaData = await response.json();

        if (response.ok) {
          successCount++;
          results.push({
            to: cleaningNumber(rawNumber), // Return the number we processed
            ok: true,
            status: response.status,
            response: metaData,
          });
        } else {
          results.push({
            to: rawNumber,
            ok: false,
            status: response.status,
            error: metaData.error?.message || "Meta API error.",
            response: metaData,
          });
        }
      } catch (innerError) {
        results.push({
          to: rawNumber,
          ok: false,
          error: innerError instanceof Error ? innerError.message : "Failed to fetch Meta API.",
        });
      }
    }

    // Helper for consistency
    function cleaningNumber(num: string) { return num.replace(/\D/g, ""); }

    // 5. Final Response
    return jsonResponse(200, {
      success: successCount > 0,
      message: `Processed ${guardians.length} guardian(s). Sent: ${successCount}.`,
      results,
    });

  } catch (error) {
    console.error("Critical edge function error:", error);
    return jsonResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
});
