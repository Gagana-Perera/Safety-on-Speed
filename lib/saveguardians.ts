import { supabase } from "@/lib/superbase";

export async function saveGuardians(
  userId: string,
  contacts: { name: string; phone: string }[],
) {
  // 1. Delete all existing guardians for this user (clean slate upsert)
  const { error: deleteError } = await supabase
    .from("guardians")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Failed to delete old guardians:", deleteError);
    throw deleteError;
  }

  // 2. Insert one row per contact
  const rows = contacts.map((contact) => ({
    user_id: userId,
    name: contact.name.trim(),
    phone_number: contact.phone.trim(),
  }));

  const { error: insertError } = await supabase
    .from("guardians")
    .insert(rows as any);

  if (insertError) {
    console.error("Failed to save guardians:", insertError);
    throw insertError;
  }
}
