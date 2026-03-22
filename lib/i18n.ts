import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Profile Screen

      appearance: "APPEARANCE",
      dark_mode: "Dark Mode",
      general: "GENERAL",
      language: "Language",
      location: "Location",
      
      notifications: "NOTIFICATIONS",
      push_notif_label: "Push Notification",
      push_notif_sub: "Security & Update alerts",
      alert_notif_label: "Alert Notification",
      alert_notif_sub: "Receive nearby safety & incident alerts",
      
      privacy: "PRIVACY & PERMISSIONS",
      personal_data_label: "Personal Data Access",
      personal_data_sub: "Share anonymous data to improve the app",
      camera_access_label: "Camera Access",
      camera_access_sub: "Allow app to use camera",
      live_location_label: "Live Location Access",
      live_location_sub: "Share location in real-time",

      tap_to_close: "Tap anywhere to close",
      close: "Close",
      select_district: "Select District",
      location_settings: "Location Settings",
      choose_option: "Choose an option",
      use_gps: "Use My GPS",
      choose_manually: "Choose Manually",
      cancel: "Cancel",
      permission_denied: "Permission Denied",
      location_permission_msg: "Please allow location access in settings.",
      error: "Error",
      gps_error_msg: "Could not fetch GPS location.",
      select_language: "Select Language",
      choose_language: "Choose your preferred language",
      sign_out_confirm: "Are you sure you want to sign out?",
      profile_incomplete: "Profile Incomplete",
      profile_incomplete_msg: "Please update your name so we can identify you.",
      update_now: "Update Now",
      user_name: "User Name",
      no_email: "No Email",
      
      sign_out: "Sign Out",
      app_version: "App Version 1.2.0",

      //Emergency Contact Screen

      emergency_services: "Emergency Services",
      emergency_hotlines: "EMERGENCY HOTLINES",
      emergency_contacts: "Emergency Contacts",
      ambulance_service: "Ambulance Service",
      women_child_bureau: "Women & Child Bureau",
      fire_rescue: "Fire & Rescue",
      hospital: "Hospitals",
      police_station: "Police Stations",
      call: "Call",

      // Home

      personal_safety: "PERSONAL SAFETY",
      sos_control: "SOS Control",
      sos_control_desc: "One tap starts a Quick SOS. Three fast taps starts the emergency flow and prompts a 119 call.",
      send_sms: "Send SMS",
      sos_button_desc: "The button sends one SMS alert with your current Google Maps location. It does not start live tracking.",
      guardians: "GUARDIANS",
      guardians_desc: "Configured to receive SOS SMS alerts",
      gps: "GPS",
      gps_ready: "GPS Ready",
      gps_ready_desc: "Location access is required before the app can send your SMS alert.",
      internet: "INTERNET",
      offline: "Offline",
      offline_desc: "Automatic guardian alerts need a connected network and backend endpoint.",
      open_hotlines_desc: "Open hotlines and emergency support contacts.",
      manage_guardians_desc: "Review the contacts that receive SOS alerts.",

      add_guardians_before_sos: "Add guardians before using SOS",
      add_guardians: "Add Guardians",
      setup_contacts_emergency_desc: "Set up contacts before your next emergency.",

      //Guardians Screen

      manage_guardians: "Manage Guardians",
      edit_guardian: "Edit Guardians",
      guardian_sub: "Add up to 5 contacts that will be notified if you are in danger.",
      contact: "Contact",
      name: "Name",
      phone_number: "Phone Number",
      add_contact: "Add Contact",
      confirm_all_contacts: "Confirm All Contacts",

      //Map

      pharmacies: "Pharmacies",
      search_places: "Search places",
      sort_by_distance: "Sort by distance",
      wheelchair_accessible: "Wheelchair accessible",
      open_now: "Open now",
      search_here: "Search here",
      nearby_places: "Nearby places",

      //Edit Profile

      change_profile_photo: "Change Profile Photo",
      first_name: "FIRST NAME",
      last_name: "LAST NAME",
      email_address: "EMAIL ADDRESS",
      save_changes: "Save Changes",
    }
  },
  si: {
    translation: {
      // Profile Screen - Sinhala

      appearance: "පෙනුම",
      dark_mode: "අඳුරු මාදිලිය",
      general: "සාමාන්‍ය",
      language: "භාෂාව",
      location: "ස්ථානය",
      
      notifications: "දැනුම්දීම්",
      push_notif_label: "තල්ලු දැනුම්දීම්",
      push_notif_sub: "ආරක්ෂක සහ යාවත්කාලීන ඇඟවීම්",
      alert_notif_label: "ඇඟවීම් දැනුම්දීම්",
      alert_notif_sub: "ආසන්න ආරක්ෂක සහ සිදුවීම් ඇඟවීම් ලබා ගන්න",
      
      privacy: "පෞද්ගලිකත්වය සහ අවසර",
      personal_data_label: "පුද්ගලික දත්ත ප්‍රවේශය",
      personal_data_sub: "යෙදුම වැඩිදියුණු කිරීමට නිර්නාමික දත්ත බෙදා ගන්න",
      camera_access_label: "කැමරා ප්‍රවේශය",
      camera_access_sub: "යෙදුමට කැමරාව භාවිතා කිරීමට ඉඩ දෙන්න",
      live_location_label: "සජීවී ස්ථාන ප්‍රවේශය",
      live_location_sub: "තත්‍ය කාලීනව ස්ථානය බෙදා ගන්න",

      tap_to_close: "ස්පර්ශ කර වසන්න",
      close: "වසන්න",
      select_district: "දිස්ත්‍රික්කය තෝරන්න",
      location_settings: "ස්ථාන සැකසුම්",
      choose_option: "විකල්පයක් තෝරන්න",
      use_gps: "මගේ GPS භාවිතා කරන්න",
      choose_manually: "අතින් තෝරන්න",
      cancel: "අවලංගු කරන්න",
      permission_denied: "අවසර ප්‍රතික්ෂේප විය",
      location_permission_msg: "සැකසුම් තුළ ස්ථාන ප්‍රවේශයට ඉඩ දෙන්න.",
      error: "දෝෂයකි",
      gps_error_msg: "GPS ස්ථානය ලබා ගත නොහැකි විය.",
      select_language: "භාෂාව තෝරන්න",
      choose_language: "ඔබගේ කැමති භාෂාව තෝරන්න",
      sign_out_confirm: "ඔබට ඉවත් වීමට අවශ්‍යද?",
      profile_incomplete: "පැතිකඩ අසම්පූර්ණයි",
      profile_incomplete_msg: "ඔබව හඳුනා ගැනීමට ඔබේ නම යාවත්කාලීන කරන්න.",
      update_now: "දැන් යාවත්කාලීන කරන්න",
      user_name: "පරිශීලක නාමය",
      no_email: "විද්‍යුත් තැපෑලක් නැත",
      
      sign_out: "ඉවත් වන්න",
      app_version: "යෙදුම් අනුවාදය 1.2.0",

      //Emergency Contact Screen - Sinhala

      emergency_services: "හදිසි සේවා",
      emergency_hotlines: "හදිසි ඇමතුම් අංක",
      emergency_contacts: "හදිසි සම්බන්ධතා",
      ambulance_service: "ගිලන් රථ සේවාව",
      women_child_bureau: "කාන්තා හා ළමා කාර්යාංශය",
      fire_rescue: "ගිනි නිවීම් සහ ගලවා ගැනීම",
      hospital: "රෝහල",
      police_station: "පොලිස් ස්ථානය",
      call: "ඇමතුම",

      // Home - Sinhala

      personal_safety: "පෞද්ගලික ආරක්ෂාව",
      sos_control: "SOS පාලනය",
      sos_control_desc: "එක් තට්ටුවකින් ඉක්මන් SOS ආරම්භ වේ. වේගවත් තට්ටු තුනකින් හදිසි ප්‍රවාහය ආරම්භ වී 119 ඇමතුමක් ලබා ගැනීමට දිරිමත් කරයි.",
      send_sms: "SMS යවන්න",
      sos_button_desc: "මෙම බොත්තම ඔබගේ වත්මන් Google Maps ස්ථානය සමඟ එක් SMS ඇඟවීමක් යවයි. එය සජීවී ලුහුබැඳීමක් ආරම්භ නොකරයි",
      guardians: "භාරකරුවන්",
      guardians_desc: "SOS SMS ඇඟවීම් ලබා ගැනීමට සකසා ඇත",
      gps: "GPS",
      gps_ready: "GPS සූදානම්",
      gps_ready_desc: "යෙදුමට ඔබේ SMS ඇඟවීම යැවීමට පෙර ස්ථාන ප්‍රවේශය අවශ්‍ය වේ.",
      internet: "අන්තර්ජාලය",
      offline: "නොබැඳි",
      offline_desc: "ස්වක්‍රීය භාරකරු ඇඟවීම් සඳහා සම්බන්ධිත ජාලයක් සහ backend endpoint එකක් අවශ්‍ය වේ.",
      open_hotlines_desc: "හදිසි ඇමතුම් සහ හදිසි සහාය සම්බන්ධතා විවෘත කරන්න.",
      manage_guardians_desc: "SOS ඇඟවීම් ලබන සම්බන්ධතා සමාලෝචනය කරන්න.",

      add_guardians_before_sos: "SOS භාවිතා කිරීමට පෙර භාරකරුවන් එක් කරන්න",
      add_guardians: "භාරකරුවන් එක් කරන්න",
      setup_contacts_emergency_desc: "මීළඟ හදිසි අවස්ථාවට පෙර සම්බන්ධතා සකසන්න.",

      //Guardians Screen - Sinhala

      manage_guardians: "භාරකරුවන් කළමනාකරණය",
      edit_guardian: "භාරකරුවන් සංස්කරණය කරන්න",
      guardian_sub: "ඔබ අනතුරේ සිටී නම් දැනුම් දෙනු ලබන සම්බන්ධතා 5 දක්වා එකතු කරන්න.",
      contact: "සම්බන්ධතාව",
      name: "නම",
      phone_number: "දුරකථන අංකය",
      add_contact: "සම්බන්ධතාව එකතු කරන්න",
      confirm_all_contacts: "සියලු සම්බන්ධතා තහවුරු කරන්න",

      //Map - Sinhala

      pharmacies: "ෆාමසි",
      search_places: "ස්ථාන සොයන්න",
      sort_by_distance: "දුර අනුව වර්ග කරන්න",
      wheelchair_accessible: "රෝද පුටු ප්‍රවේශය",
      open_now: "දැන් විවෘතයි",
      search_here: "මෙහි සොයන්න",
      nearby_places: "ආසන්න ස්ථාන",

      //Edit Profile - Sinhala

      change_profile_photo: "පැතිකඩ ඡායාරූපය වෙනස් කරන්න",
      first_name: "මුල් නම",
      last_name: "අවසාන නම",
      email_address: "විද්‍යුත් තැපැල් ලිපිනය",
      save_changes: "වෙනස්කම් සුරකින්න",
    }
  },
  ta: {
    translation: {
      // Profile Screen - Tamil
      
      appearance: "தோற்றம்",
      dark_mode: "இருண்ட பயன்முறை",
      general: "பொது",
      language: "மொழி",
      location: "இடம்",
      
      notifications: "அறிவிப்புகள்",
      push_notif_label: "புஷ் அறிவிப்பு",
      push_notif_sub: "பாதுகாப்பு மற்றும் புதுப்பிப்பு எச்சரிக்கைகள்",
      alert_notif_label: "எச்சரிக்கை அறிவிப்பு",
      alert_notif_sub: "அருகிலுள்ள பாதுகாப்பு மற்றும் சம்பவ எச்சரிக்கைகளை பெறுங்கள்",
      
      privacy: "தனியுரிமை மற்றும் அனுமதிகள்",
      personal_data_label: "தனிப்பட்ட தரவு அணுகல்",
      personal_data_sub: "பயன்பாட்டை மேம்படுத்த அனாமதேய தரவை பகிரவும்",
      camera_access_label: "கேமரா அணுகல்",
      camera_access_sub: "கேமராவைப் பயன்படுத்த பயன்பாட்டை அனுமதிக்கவும்",
      live_location_label: "நேரலை இருப்பிட அணுகல்",
      live_location_sub: "நிகழ்நேரத்தில் இருப்பிடத்தைப் பகிரவும்",

      tap_to_close: "மூட எங்கும் தட்டவும்",
      close: "மூடு",
      select_district: "மாவட்டத்தை தேர்ந்தெடுக்கவும்",
      location_settings: "இருப்பிட அமைப்புகள்",
      choose_option: "ஒரு விருப்பத்தை தேர்ந்தெடுக்கவும்",
      use_gps: "என் GPS ஐ பயன்படுத்து",
      choose_manually: "கைமுறையாக தேர்ந்தெடு",
      cancel: "ரத்து செய்",
      permission_denied: "அனுமதி மறுக்கப்பட்டது",
      location_permission_msg: "அமைப்புகளில் இருப்பிட அணுகலை அனுமதிக்கவும்.",
      error: "பிழை",
      gps_error_msg: "GPS இருப்பிடத்தை பெற முடியவில்லை.",
      select_language: "மொழியை தேர்ந்தெடுக்கவும்",
      choose_language: "உங்கள் விருப்பமான மொழியை தேர்ந்தெடுக்கவும்",
      sign_out_confirm: "நீங்கள் வெளியேற விரும்புகிறீர்களா?",
      profile_incomplete: "சுயவிவரம் முழுமையடையவில்லை",
      profile_incomplete_msg: "உங்களை அடையாளம் காண உங்கள் பெயரை புதுப்பிக்கவும்.",
      update_now: "இப்போது புதுப்பிக்கவும்",
      user_name: "பயனர் பெயர்",
      no_email: "மின்னஞ்சல் இல்லை",
      
      sign_out: "வெளியேறு",
      app_version: "பயன்பாட்டு பதிப்பு 1.2.0",

      //Emergency Contact Screen - Tamil

      emergency_services: "அவசர சேவைகள்",
      emergency_hotlines: "அவசர நேரடி இணைப்புகள்",
      emergency_contacts: "அவசர தொடர்புகள்",
      ambulance_service: "ஆம்புலன்ஸ் சேவை",
      women_child_bureau: "பெண்கள் மற்றும் குழந்தை பணியகம்",
      fire_rescue: "தீ & மீட்பு",
      hospital: "மருத்துவமனை",
      police_station: "காவல் நிலையம்",
      call: "அழைப்பு",

      // Home - Tamil

      personal_safety: "தனிப்பட்ட பாதுகாப்பு",
      sos_control: "SOS கட்டுப்பாடு",
      sos_control_desc: "ஒரு தட்டல் விரைவான SOS ஐ தொடங்குகிறது. மூன்று வேகமான தட்டல்கள் அவசர ஓட்டத்தை தொடங்கி 119 அழைப்பை தூண்டுகிறது.",
      send_sms: "SMS அனுப்பு",
      sos_button_desc: "பொத்தான் உங்கள் தற்போதைய Google Maps இருப்பிடத்துடன் ஒரு SMS எச்சரிக்கையை அனுப்புகிறது. இது நேரலை கண்காணிப்பை தொடங்காது.",
      guardians: "பாதுகாவலர்கள்",
      guardians_desc: "SOS SMS எச்சரிக்கைகளை பெற கட்டமைக்கப்பட்டுள்ளது",
      gps: "GPS",
      gps_ready: "GPS தயார்",
      gps_ready_desc: "பயன்பாடு உங்கள் SMS எச்சரிக்கையை அனுப்புவதற்கு முன் இருப்பிட அணுகல் தேவை.",
      internet: "இணையம்",
      offline: "ஆஃப்லைன்",
      offline_desc: "தானியங்கி பாதுகாவலர் எச்சரிக்கைகளுக்கு இணைக்கப்பட்ட நெட்வொர்க் மற்றும் backend endpoint தேவை.",
      open_hotlines_desc: "ஹாட்லைன்கள் மற்றும் அவசர ஆதரவு தொடர்புகளை திறக்கவும்.",
      manage_guardians_desc: "SOS எச்சரிக்கைகளை பெறும் தொடர்புகளை மதிப்பாய்வு செய்யவும்",

      add_guardians_before_sos: "SOS-ஐப் பயன்படுத்துவதற்கு முன் பாதுகாவலர்களைச் சேர்க்கவும்",
      add_guardians: "பாதுகாவலர்களைச் சேர்க்கவும்",
      setup_contacts_emergency_desc: "அடுத்த அவசரநிலைக்கு முன் தொடர்புகளை அமைக்கவும்.",

      //Guardians Screen - Tamil

      manage_guardians: "பாதுகாவலர்களை நிர்வகி",
      edit_guardian: "பாதுகாவலர்களை திருத்து",
      guardian_sub: "நீங்கள் ஆபத்தில் இருந்தால் அறிவிக்கப்படும் 5 தொடர்புகள் வரை சேர்க்கவும்.",
      contact: "தொடர்பு",
      name: "பெயர்",
      phone_number: "தொலைபேசி எண்",
      add_contact: "தொடர்பு சேர்க்கவும்",
      confirm_all_contacts: "அனைத்து தொடர்புகளையும் உறுதிப்படுத்தவும்",

      //Map - Tamil

      pharmacies: "மருந்தகங்கள்",
      search_places: "இடங்களை தேடுங்கள்",
      sort_by_distance: "தூரத்தின் படி வரிசைப்படுத்து",
      wheelchair_accessible: "ஊனமுற்றோர் கூடை அணுகல்",
      open_now: "இப்போது திறந்திருக்கிறது",
      search_here: "இங்கே தேடுங்கள்",
      nearby_places: "அருகிலுள்ள இடங்கள்",

      //Edit Profile - Tamil

      change_profile_photo: "சுயவிவர புகைப்படத்தை மாற்றவும்",
      first_name: "முதல் பெயர்",
      last_name: "கடைசி பெயர்",
      email_address: "மின்னஞ்சல் முகவரி",
      save_changes: "மாற்றங்களை சேமிக்கவும்",

    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;