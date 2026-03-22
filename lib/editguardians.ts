import { loadCachedGuardians } from "@/lib/saveguardians";
import { supabase } from "@/lib/superbase";
import { normalizeGuardianPhone } from "@/lib/guardianPhone";

type GuardiansRow = {
  g1_name: string | null;
  g1_phone: string | null;
  g2_name: string | null;
  g2_phone: string | null;
  g3_name: string | null;
  g3_phone: string | null;
  g4_name: string | null;
  g4_phone: string | null;
  g5_name: string | null;
  g5_phone: string | null;
};

type GuardianNameKey =
  | "g1_name"
  | "g2_name"
  | "g3_name"
  | "g4_name"
  | "g5_name";
type GuardianPhoneKey =
  | "g1_phone"
  | "g2_phone"
  | "g3_phone"
  | "g4_phone"
  | "g5_phone";

export async function bringGuardians(userId: string) {
  const { data, error } = await supabase
    .from("guardians")
    .select(
      "g1_name, g1_phone, g2_name, g2_phone, g3_name, g3_phone, g4_name, g4_phone, g5_name, g5_phone",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // Common cases:
    // - PGRST116: no row found (new user)
    // - RLS/policy missing: select may be blocked in production
    // In both cases, try local cache first and otherwise return an empty list.
    if (error.code !== "PGRST116") {
      console.error("Failed to retrieve guardians:", error);
    }

    const cached = await loadCachedGuardians(userId);
    if (cached && cached.length > 0) {
      return cached.map((guardian) => ({
        name: guardian.name,
        phone: normalizeGuardianPhone(guardian.phone),
      }));
    }
    return [];
  }

  // Parse the data and return as an array of guardians with name and phone
  const guardians: { name: string; phone: string }[] = [];

  if (!data) {
    const cached = await loadCachedGuardians(userId);
    if (cached && cached.length > 0) {
      return cached.map((guardian) => ({
        name: guardian.name,
        phone: normalizeGuardianPhone(guardian.phone),
      }));
    }
    return guardians;
  }

  const row = data as GuardiansRow;

  for (let i = 1; i <= 5; i++) {
    const nameKey = `g${i}_name` as GuardianNameKey;
    const phoneKey = `g${i}_phone` as GuardianPhoneKey;
    const name = row[nameKey];
    const phone = row[phoneKey];

    if (name && phone) {
      guardians.push({ name, phone: normalizeGuardianPhone(phone) });
    }
  }

  return guardians;
}
