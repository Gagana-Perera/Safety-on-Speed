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
      email_notif_label: "Email Notifications",
      email_notif_sub: "Receive daily summaries",
      push_notif_label: "Push Notification",
      push_notif_sub: "Security & Update alerts",
      alert_notif_label: "Alert Notification",
      alert_notif_sub: "Security & Update alerts",
      
      privacy: "PRIVACY & PERMISSIONS",
      personal_data_label: "Personal Data Access",
      personal_data_sub: "Allow to use data customization",
      camera_access_label: "Camera Access",
      camera_access_sub: "Allow app to use camera",
      live_location_label: "Live Location Access",
      live_location_sub: "Share location in real-time",
      
      sign_out: "Sign Out",
      app_version: "App Version 1.2.0",

      //Emergency Contact Screen

      emergency_services: "Emergency Services",
      emergency_hotlines: "EMERGENCY HOTLINES",
      ambulance_service: "Ambulance Service",
      women_child_bureau: "Women & Child Bureau",
      fire_rescue: "Fire & Rescue",
      hospital: "Hospitals",
      police_station: "Police Stations",
      call: "Call",

      // Home

      live_location: "Live Location",
      live_location_desc: "Your location is being tracked to keep you safe.",
      emergency_services_desc: "Quick access to emergency contacts and services.",
      news_alerts: "News & Alerts",
      news_alerts_desc: "Stay updated with the latest safety news in your area.",
      view_news: "View News →",

      //Guardians Screen

      manage_guardians: "Manage Guardians",
      edit_guardian: "Edit Guardian",
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
      email_notif_label: "විද්‍යුත් තැපැල් දැනුම්දීම්",
      email_notif_sub: "දෛනික සාරාංශ ලබා ගන්න",
      push_notif_label: "තල්ලු දැනුම්දීම්",
      push_notif_sub: "ආරක්ෂක සහ යාවත්කාලීන ඇඟවීම්",
      alert_notif_label: "ඇඟවීම් දැනුම්දීම්",
      alert_notif_sub: "ආරක්ෂක සහ යාවත්කාලීන ඇඟවීම්",
      
      privacy: "පෞද්ගලිකත්වය සහ අවසර",
      personal_data_label: "පුද්ගලික දත්ත ප්‍රවේශය",
      personal_data_sub: "දත්ත අභිරුචිකරණය භාවිතා කිරීමට ඉඩ දෙන්න",
      camera_access_label: "කැමරා ප්‍රවේශය",
      camera_access_sub: "යෙදුමට කැමරාව භාවිතා කිරීමට ඉඩ දෙන්න",
      live_location_label: "සජීවී ස්ථාන ප්‍රවේශය",
      live_location_sub: "තත්‍ය කාලීනව ස්ථානය බෙදා ගන්න",
      
      sign_out: "ඉවත් වන්න",
      app_version: "යෙදුම් අනුවාදය 1.2.0",

      //Emergency Contact Screen - Sinhala

      emergency_services: "හදිසි සේවා",
      emergency_hotlines: "හදිසි ඇමතුම් අංක",
      ambulance_service: "ගිලන් රථ සේවාව",
      women_child_bureau: "කාන්තා හා ළමා කාර්යාංශය",
      fire_rescue: "ගිනි නිවීම් සහ ගලවා ගැනීම",
      hospital: "රෝහල",
      police_station: "පොලිස් ස්ථානය",
      call: "ඇමතුම",

      // Home - Sinhala

      live_location: "සජීවී ස්ථානය",
      live_location_desc: "ඔබව ආරක්ෂිතව තබා ගැනීම සඳහා ඔබේ ස්ථානය නිරීක්ෂණය කෙරේ.",
      emergency_services_desc: "හදිසි සම්බන්ධතා සහ සේවා වෙත ඉක්මන් ප්‍රවේශය.",
      news_alerts: "පුවත් සහ ඇඟවීම්",
      news_alerts_desc: "ඔබේ ප්‍රදේශයේ නවතම ආරක්ෂක පුවත් සමඟ යාවත්කාලීනව සිටින්න.",
      view_news: "පුවත් බලන්න →",

      //Guardians Screen - Sinhala

      manage_guardians: "භාරකරුවන් කළමනාකරණය",
      edit_guardian: "භාරකරු සංස්කරණය කරන්න",
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
      email_notif_label: "மின்னஞ்சல் அறிவிப்புகள்",
      email_notif_sub: "தினசரி சுருக்கங்களைப் பெறுங்கள்",
      push_notif_label: "புஷ் அறிவிப்பு",
      push_notif_sub: "பாதுகாப்பு மற்றும் புதுப்பிப்பு எச்சரிக்கைகள்",
      alert_notif_label: "எச்சரிக்கை அறிவிப்பு",
      alert_notif_sub: "பாதுகாப்பு மற்றும் புதுப்பிப்பு எச்சரிக்கைகள்",
      
      privacy: "தனியுரிமை மற்றும் அனுமதிகள்",
      personal_data_label: "தனிப்பட்ட தரவு அணுகல்",
      personal_data_sub: "தரவு தனிப்பயனாக்கத்தைப் பயன்படுத்த அனுமதிக்கவும்",
      camera_access_label: "கேமரா அணுகல்",
      camera_access_sub: "கேமராவைப் பயன்படுத்த பயன்பாட்டை அனுமதிக்கவும்",
      live_location_label: "நேரலை இருப்பிட அணுகல்",
      live_location_sub: "நிகழ்நேரத்தில் இருப்பிடத்தைப் பகிரவும்",
      
      sign_out: "வெளியேறு",
      app_version: "பயன்பாட்டு பதிப்பு 1.2.0",

      //Emergency Contact Screen - Tamil

      emergency_services: "அவசர சேவைகள்",
      emergency_hotlines: "அவசர நேரடி இணைப்புகள்",
      ambulance_service: "ஆம்புலன்ஸ் சேவை",
      women_child_bureau: "பெண்கள் மற்றும் குழந்தை பணியகம்",
      fire_rescue: "தீ & மீட்பு",
      hospital: "மருத்துவமனை",
      police_station: "காவல் நிலையம்",
      call: "அழைப்பு",

      // Home - Tamil

      live_location: "நேரலை இருப்பிடம்",
      live_location_desc: "உங்களை பாதுகாப்பாக வைக்க உங்கள் இருப்பிடம் கண்காணிக்கப்படுகிறது.",
      emergency_services_desc: "அவசர தொடர்புகள் மற்றும் சேவைகளுக்கான விரைவான அணுகல்.",
      news_alerts: "செய்திகள் மற்றும் எச்சரிக்கைகள்",
      news_alerts_desc: "உங்கள் பகுதியில் சமீபத்திய பாதுகாப்பு செய்திகளுடன் புதுப்பித்த நிலையில் இருங்கள்.",
      view_news: "செய்திகளை காண்க →",

      //Guardians Screen - Tamil

      manage_guardians: "பாதுகாவலர்களை நிர்வகி",
      edit_guardian: "பாதுகாவலரை திருத்து",
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