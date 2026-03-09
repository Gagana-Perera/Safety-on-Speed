// lib/profileService.ts
import { supabase } from "./superbase";

// The real profiles table schema: first_name, surname, phone_number, nic_number, email
export interface UserProfile {
  first_name?: string;
  surname?: string;
  phone_number?: string;
  nic_number?: string;
  email?: string;
  avatar_url?: string | null;
  location?: string;
  updated_at?: string;
}

// Convenience getter: builds a full_name string from first_name + surname
export function getFullName(profile: UserProfile): string {
  return `${profile.first_name || ""} ${profile.surname || ""}`.trim();
}

export const getUserProfile = async (
  userId: string,
): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "first_name, surname, phone_number, nic_number, email, avatar_url, location",
      )
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      }
      return null;
    }

    return data as UserProfile;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>,
) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};
