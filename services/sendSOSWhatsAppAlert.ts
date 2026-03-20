import { supabase } from "@/lib/superbase";

/**
 * Sends a WhatsApp SOS alert by calling the Supabase Edge Function.
 */
export async function sendSOSWhatsAppAlert(phoneNumbers: string[]) {
  try {
    console.log("-----------------------------------------");
    console.log("[SOS] Calling Edge Function: sos-whatsapp-alert");
    console.log("[SOS] Payload:", { guardians: phoneNumbers });

    // 1. Invoke the function using the official Supabase client
    const { data, error } = await supabase.functions.invoke("sos-whatsapp-alert", {
      body: { guardians: phoneNumbers },
    });

    // 2. Log exactly what we got back
    console.log("[SOS] Response data:", data);

    if (error) {
      console.error("[SOS] Response error object:", error);
      throw new Error(error.message || "Failed to contact SOS service");
    }

    // 3. Check for the custom success flag in your function's response
    // Your revamped edge function returns { success: boolean, message: string, ... }
    if (!data || data.success === false) {
      console.warn("[SOS] Function returned unsuccessful state:", data?.message);
      throw new Error(data?.message || "WhatsApp message delivery failed.");
    }

    console.log("[SOS] Success! WhatsApp alerts are being processed.");
    return data;

  } catch (err: any) {
    console.error("[SOS] Critical Exception:", err.message);
    throw err; // Re-throw so the UI can handle it
  }
}
