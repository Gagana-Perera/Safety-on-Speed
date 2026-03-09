import { supabase } from "@/lib/superbase";

export async function saveGuardians(
  userId: string,
  contacts: { name: string; phone: string }[],
) {
  // The remote guardians table uses a flat schema: one row per user,
  // with columns g1_name, g1_phone ... g5_name, g5_phone.
  // We cannot use upsert(onConflict:"user_id") because there is no UPDATE
  // RLS policy — only INSERT, SELECT, DELETE.
  // Strategy: DELETE the existing row (safe — DELETE policy exists), then INSERT fresh.

  // 1. Delete any existing row for this user (no-op if none exists)
  await supabase.from("guardians").delete().eq("user_id", userId);

  // 2. Build the flat row
  const row: Record<string, any> = {
    user_id: userId,
    g1_verified: false,
    g2_verified: false,
    g3_verified: false,
    g4_verified: false,
    g5_verified: false,
  };

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

  // 3. INSERT (no conflict path → INSERT RLS policy applies cleanly)
  const { error } = await supabase.from("guardians").insert([row] as any);

  if (error) {
    console.error("Failed to save guardians:", error);
    throw error;
  }
}
