// App/profile.ts
import { getMergedProfileData } from "../lib/profileService";

// This is a conceptual function representing your component logic
async function loadProfileData() {
  const profileData = await getMergedProfileData();

  if (!profileData) {
    console.log("No user logged in");
    return;
  }

  console.log("Name:", profileData.fullName);
  console.log("Phone:", profileData.phone);
  console.log("Email:", profileData.email);
}
