import { supabase } from "@/lib/superbase";

export async function saveGuardians(
  userId: string,
  contacts: { name: string; phone: string }[],
) {
  // The remote guardians table uses a flat schema: one row per user,
  // with columns g1_name, g1_phone, g2_name, g2_phone, ... g5_name, g5_phone
  const row: Record<string, any> = {
    user_id: userId,
    g1_verified: false,
    g2_verified: false,
    g3_verified: false,
    g4_verified: false,
    g5_verified: false,
  };

  // Populate provided contacts, null out empty slots
  for (let i = 1; i <= 5; i++) {
    const contact = contacts[i - 1];
    if (contact) {
      row[`g${i}_name`] = contact.name.trim();
      row[`g${i}_phone`] = contact.phone.trim();
    } else {
      row[`g${i}_name`] = null;
      row[`g${i}_phone`] = null;
    }
  }

  const { error } = await supabase
    .from("guardians")
    .upsert([row] as any, { onConflict: "user_id" });

  if (error) {
    console.error("Failed to save guardians:", error);
    throw error;
  }
}
