// lib/profileService.ts
import { supabase } from "./superbase";

// 1. Define the shape of the data (TypeScript Interface)
export interface UserProfile {
  full_name?: string;
  phone_number?: string;
  email?: string;
  avatar_url?: string | null;
  location?: string;
  updated_at?: string;
}

// 2. The Logic to fetch data
export const getUserProfile = async (
  userId: string,
): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone_number, email, avatar_url, location")
      .eq("id", userId)
      .single(); // We expect only one result

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
    // 1. "upsert" means: Create if new, Update if exists.
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: userId, // We MUST match the Auth ID
        ...updates,
        updated_at: new Date().toISOString(), // Optional: track when they edited
      })
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
