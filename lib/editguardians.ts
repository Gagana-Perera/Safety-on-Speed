import { supabase } from "@/lib/superbase";

export async function bringGuardians(userId: string) {
  const { data, error } = await supabase
    .from("guardians")
    .select(
      "g1_name, g1_phone, g2_name, g2_phone, g3_name, g3_phone, g4_name, g4_phone, g5_name, g5_phone",
    )
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Failed to retrieve guardians:", error);
    throw error;
  }

  // Parse the data and return as an array of guardians with name and phone
  const guardians: { name: string; phone: string }[] = [];

  for (let i = 1; i <= 5; i++) {
    const name = (data as any)[`g${i}_name`];
    const phone = (data as any)[`g${i}_phone`];

    if (name && phone) {
      guardians.push({ name, phone });
    }
  }

  return guardians;
}
