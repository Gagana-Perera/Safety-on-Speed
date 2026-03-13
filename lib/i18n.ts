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

      //Emergency Contact Screen

      emergency_services: "Emergency Services",
      emergency_hotlines: "EMERGENCY HOTLINES",
      ambulance_service: "Ambulance Service",
      fire_rescue: "Fire & Rescue",
      hospital: "Hospital",
      police_station: "Police Station",
      call: "Call",

      //Guardians Screen

      manage_guardians: "Manage Guardians",
      edit_guardian: "Edit Guardian",
      guardian_sub: "Add up to 5 contacts that will be notified if you are in danger.",
      contact: "Contact",
      name: "Name",
      phone_number: "Phone Number",
      add_contact: "Add Contact",
      confirm_all_contacts: "Confirm All Contacts",
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

      //Emergency Contact Screen - Sinhala

      emergency_services: "හදිසි සේවා",
      emergency_hotlines: "හදිසි ඇමතුම් අංක",
      ambulance_service: "ගිලන් රථ සේවාව",
      fire_rescue: "ගිනි නිවීම් සහ ගලවා ගැනීම",
      hospital: "රෝහල",
      police_station: "පොලිස් ස්ථානය",
      call: "ඇමතුම",

      //Guardians Screen - Sinhala

      manage_guardians: "භාරකරුවන් කළමනාකරණය",
      edit_guardian: "භාරකරු සංස්කරණය කරන්න",
      guardian_sub: "ඔබ අනතුරේ සිටී නම් දැනුම් දෙනු ලබන සම්බන්ධතා 5 දක්වා එකතු කරන්න.",
      contact: "සම්බන්ධතාව",
      name: "නම",
      phone_number: "දුරකථන අංකය",
      add_contact: "සම්බන්ධතාව එකතු කරන්න",
      confirm_all_contacts: "සියලු සම්බන්ධතා තහවුරු කරන්න",
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

      //Emergency Contact Screen - Tamil

      emergency_services: "அவசர சேவைகள்",
      emergency_hotlines: "அவசர நேரடி இணைப்புகள்",
      ambulance_service: "ஆம்புலன்ஸ் சேவை",
      fire_rescue: "தீ & மீட்பு",
      hospital: "மருத்துவமனை",
      police_station: "காவல் நிலையம்",
      call: "அழைப்பு",

      //Guardians Screen - Tamil

      manage_guardians: "பாதுகாவலர்களை நிர்வகி",
      edit_guardian: "பாதுகாவலரை திருத்து",
      guardian_sub: "நீங்கள் ஆபத்தில் இருந்தால் அறிவிக்கப்படும் 5 தொடர்புகள் வரை சேர்க்கவும்.",
      contact: "தொடர்பு",
      name: "பெயர்",
      phone_number: "தொலைபேசி எண்",
      add_contact: "தொடர்பு சேர்க்கவும்",
      confirm_all_contacts: "அனைத்து தொடர்புகளையும் உறுதிப்படுத்தவும்",
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