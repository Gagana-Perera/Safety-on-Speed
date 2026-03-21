import { supabase } from "@/lib/superbase";

/**
 * Sends a WhatsApp SOS alert by calling the Supabase Edge Function.
 */
export async function sendSOSWhatsAppAlert(
  phoneNumbers: string[],
  userName?: string,
  latitude?: number,
  longitude?: number
) {
  try {
    console.log("-----------------------------------------");
    console.log("[SOS] Calling Edge Function: sos-whatsapp-alert", {
      count: phoneNumbers.length,
      userName,
      hasCoords: !!(latitude && longitude),
    });

    // 1. Invoke the function using the official Supabase client
    const { data, error } = await supabase.functions.invoke("sos-whatsapp-alert", {
      body: { 
        guardians: phoneNumbers,
        userName,
        latitude,
        longitude,
      },
    });

    // 2. Log exactly what we got back
    if (data) {
      console.log("[SOS] Response data:", data);
    }

    if (error) {
      console.error("[SOS] Invoke error object:", error);
      throw new Error(error.message || "Failed to contact SOS service");
    }

    // 3. Check for successful delivery
    if (!data || data.success === false) {
      console.warn("[SOS] Delivery Failure Results:", JSON.stringify(data?.results, null, 2));
      
      const firstError = data?.results?.[0]?.error || "";
      let userMessage = data?.message || "WhatsApp message delivery failed.";

      if (firstError.toLowerCase().includes("access token") || firstError.toLowerCase().includes("expired")) {
        userMessage = "WhatsApp session expired. Please refresh your WHATSAPP_TOKEN in Supabase.";
      } else if (firstError.toLowerCase().includes("template")) {
        userMessage = "WhatsApp template error. Please check your Meta dashboard.";
      }

      throw new Error(userMessage);
    }

    console.log("[SOS] Success! WhatsApp alerts are being processed.");
    return data;

  } catch (err: any) {
    console.error("[SOS] Critical Exception:", err.message);
    throw err; // Re-throw so the UI can handle it
  }
}
