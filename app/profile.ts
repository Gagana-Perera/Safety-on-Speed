// App/profile.ts
import { getUserProfile } from "../lib/profileService";
import { supabase } from "../lib/superbase";

// This is a conceptual function representing your component logic
async function loadProfileData() {
  // 1. Get the currently logged-in user's ID
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // 2. Fetch their details from the database
    const profileData = await getUserProfile(user.id);

    if (profileData) {
      // 3. Update your UI with these variables:
      console.log("Name:", profileData.full_name); // Display "Shenal Arosha"
      console.log("Phone:", profileData.phone_number); // Display "0711..."
      console.log("Email:", profileData.email); // Display "shenal@..."
    }
  } else {
    console.log("No user logged in");
  }
}
