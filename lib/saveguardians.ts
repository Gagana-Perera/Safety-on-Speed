import { supabase } from "@/lib/superbase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = (userId: string) => `guardians_cache_${userId}`;

export type Guardian = { name: string; phone: string };

/** Persist guardian contacts locally so we can display them
 *  even when the remote SELECT RLS policy is missing. */
export async function cacheGuardians(userId: string, contacts: Guardian[]) {
  try {
    await AsyncStorage.setItem(CACHE_KEY(userId), JSON.stringify(contacts));
  } catch (e) {
    console.warn("Failed to cache guardians locally:", e);
  }
}

/** Load the locally-cached contacts for a user. */
export async function loadCachedGuardians(
  userId: string,
): Promise<Guardian[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY(userId));
    if (!raw) return null;
    return JSON.parse(raw) as Guardian[];
  } catch (e) {
    console.warn("Failed to load cached guardians:", e);
    return null;
  }
}

export async function saveGuardians(userId: string, contacts: Guardian[]) {
  // Build the flat row matching the remote DB schema
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

  // Try INSERT first (new users), fall back to UPDATE on 23505 (existing row)
  const { error: insertError } = await supabase
    .from("guardians")
    .insert([row] as any);

  if (!insertError) {
    console.log("Guardians saved via INSERT.");
    await cacheGuardians(userId, contacts);
    return;
  }

  if (insertError.code === "23505") {
    // Row exists — UPDATE it
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
    await cacheGuardians(userId, contacts);
    return;
  }

  console.error("Failed to save guardians:", insertError);
  throw insertError;
}
