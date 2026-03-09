import { supabase } from "@/lib/superbase";

export async function saveGuardians(
  userId: string,
  contacts: { name: string; phone: string }[],
) {
  // The remote guardians table uses a flat schema with a UNIQUE constraint on user_id.
  // Strategy: try INSERT first (new users), if 23505 duplicate key → UPDATE (existing users).
  // This avoids relying on a DELETE policy or UPDATE policy via upsert.

  const row: Record<string, string | null | boolean> = {
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

  // 1. Try INSERT (works for new users who have no guardian row yet)
  const { error: insertError } = await supabase
    .from("guardians")
    .insert([row] as any);

  if (!insertError) {
    console.log("Guardians saved via INSERT.");
    return;
  }

  // 2. If row already exists (23505 = unique_violation), UPDATE it
  if (insertError.code === "23505") {
    console.log("Guardian row exists, updating via UPDATE...");
    const { user_id, ...updateFields } = row;
    const { error: updateError } = await supabase
      .from("guardians")
      .update(updateFields as any)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to update guardians:", updateError);
      throw updateError;
    }
    console.log("Guardians saved via UPDATE.");
    return;
  }

  // 3. Any other error — throw it
  console.error("Failed to save guardians:", insertError);
  throw insertError;
}
