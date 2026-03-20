import { supabase } from './superbase';

export const getMergedProfileData = async () => {
  try {
    // 1. Get original data from auth.users
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("No authenticated user found");

    const authMeta = user.user_metadata || {};

    // 2. Get updated data from the public profiles table
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single() as any; // Using 'as any' to prevent TS errors on your custom columns

    // Ignore "Row not found" errors, as new users might not have a profile row yet
    if (profileError && profileError.code !== 'PGRST116') {
      console.log("Profile fetch error:", profileError);
    }

    // 3. Merge them! (Priority: profiles table > auth metadata > empty string)
    const mergedData = {
      id: user.id,
      email: profileData?.email || user.email || "",
      fullName: profileData?.full_name || `${authMeta.first_name || ""} ${authMeta.last_name || ""}`.trim() || "",
      phone: profileData?.phone_number || authMeta.phone || authMeta.contact_phone || "",
      avatarUrl: profileData?.avatar_url || "",
      
      // Your App Settings (Defaulting to true/safe values if empty)
      language: profileData?.language || "en",
      location: profileData?.location || null,
      pushNotif: profileData?.push_notif ?? true,
      alertNotif: profileData?.alert_notif ?? true,
      personalDataAccess: profileData?.personal_data_access ?? false,
      cameraAccess: profileData?.camera_access ?? false,
      liveLocation: profileData?.live_location ?? false,
    };

    return mergedData;

  } catch (error) {
    console.error("Error in getMergedProfileData:", error);
    return null;
  }
};
