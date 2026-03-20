import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import i18n from "../../lib/i18n";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/superbase";
import { getMergedProfileData } from '../../lib/profileService';
import { useTheme } from "@/components/theme/ThemeContext";

const SRI_LANKAN_DISTRICTS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", 
  "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara", 
  "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", 
  "Matale", "Matara", "Moneragala", "Mullaitivu", "Nuwara Eliya", 
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
];

export default function Profile() {
  const { t } = useTranslation();
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme();

  // --- STATE VARIABLES ---
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [viewingAvatar, setViewingAvatar] = useState(false);

  // Toggles
  const [pushNotif, setPushNotif] = useState(true);
  const [AlertNotif, setAlertNotif] = useState(true);
  const [personalDataAccess, setPersonalDataAccess] = useState(false);
  const [cameraAccess, setCameraAccess] = useState(false);
  const [liveLocation, setLiveLocation] = useState(false);
  const [language, setLanguage] = useState("English");
  const [locationRegion, setLocationRegion] = useState("Choose");

  const DEFAULT_AVATAR =
    "https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=80";

  // --- FETCH DATA ON FOCUS ---
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchProfileData = async () => {
        try {
          if (isActive) setLoading(true);

          const data = await getMergedProfileData();

          if (isActive && data) {
            setFullName(data.fullName);
            setEmail(data.email);
            setPhoneNumber(data.phone);
            if (data.avatarUrl) setAvatarUrl(data.avatarUrl);

            if (data.location) {
              setLocationRegion(data.location);
            }

            if (data.language === 'si') setLanguage('Sinhala');
            else if (data.language === 'ta') setLanguage('Tamil');
            else setLanguage('English');

            if (i18n && typeof i18n.changeLanguage === 'function') {
              i18n.changeLanguage(data.language);
            }

            setPushNotif(data.pushNotif);
            setAlertNotif(data.alertNotif);
            setPersonalDataAccess(data.personalDataAccess);
            setCameraAccess(data.cameraAccess);
            setLiveLocation(data.liveLocation);

            if (!data.fullName || data.fullName.trim() === "") {
              Alert.alert(
                t('profile_incomplete'),
                t('profile_incomplete_msg'),
                [{ text: t('update_now'), onPress: () => router.push("/editProfile") }]
              );
            }
          }
        } catch (error) {
          console.error("Error setting profile data:", error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchProfileData();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user && isActive) {
          setEmail(session.user.email || t('no_email'));
        }
      });

      return () => {
        isActive = false;
        subscription.unsubscribe();
      };
    }, []),
  );

  // --- LOCATION LOGIC ---
  const updateLocationInDB = async (newLoc: string) => {
    setLocationRegion(newLoc);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { error } = await supabase
        .from("profiles")
        .update({ location: newLoc } as any)
        .eq("id", session.user.id);

      if (error) console.log("Error saving location:", error);
    } catch (e) {
      console.log("Unexpected error saving location:", e);
    }
  };

  const fetchGPSLocation = async () => {
    try {
      setLocationRegion("Locating...");
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permission_denied'), t('location_permission_msg'));
        setLocationRegion("Choose");
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      let reverse = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (reverse.length > 0) {
        const city = reverse[0].city || reverse[0].subregion || "Colombo";
        updateLocationInDB(city);
      }
    } catch (e) {
      console.log(e);
      Alert.alert(t('error'), t('gps_error_msg'));
      setLocationRegion("Choose");
    }
  };

  const showLocationPicker = () => {
    Alert.alert(t('location_settings'), t('choose_option'), [
      { text: t('use_gps'), onPress: fetchGPSLocation },
      { text: t('choose_manually'), onPress: () => setDistrictModalVisible(true) },
      { text: t('cancel'), style: "cancel" },
    ]);
  };

  // Update Preferences in database
  const toggleSetting = async (
    field: "push_notif" | "alert_notif" | "personal_data_access" | "camera_access" | "live_location",
    newValue: boolean,
  ) => {
    if (field === "camera_access" && newValue) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('camera_access_label'), t('camera_access_sub'));
        return;
      }
    }

    if (field === "live_location" && newValue) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permission_denied'), t('location_permission_msg'));
        return;
      }
    }

    if (field === "push_notif") setPushNotif(newValue);
    if (field === "alert_notif") setAlertNotif(newValue);
    if (field === "personal_data_access") setPersonalDataAccess(newValue);
    if (field === "camera_access") setCameraAccess(newValue);
    if (field === "live_location") setLiveLocation(newValue);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("profiles")
        .update({ [field]: newValue })
        .eq("id", session.user.id);

      if (error) console.log(`Error saving ${field}:`, error);
    } catch (error) {
      console.log("Unexpected error saving preference:", error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(t('sign_out'), t('sign_out_confirm'), [
      { text: t('cancel'), style: "cancel" },
      {
        text: t('sign_out'),
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const changeLanguage = async (langCode: string, langLabel: string) => {
    setLanguage(langLabel);
    i18n.changeLanguage(langCode);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("profiles")
        .update({ language: langCode } as any)
        .eq("id", session.user.id);

      if (error) {
        console.log("Error saving language:", error);
      }
    } catch (error) {
      console.log("Unexpected error saving language:", error);
    }
  };

  const showLanguagePicker = () => {
    Alert.alert(t('select_language'), t('choose_language'), [
      { text: "English", onPress: () => changeLanguage("en", "English") },
      { text: "සිංහල (Sinhala)", onPress: () => changeLanguage("si", "Sinhala") },
      { text: "தமிழ் (Tamil)", onPress: () => changeLanguage("ta", "Tamil") },
      { text: t('cancel'), style: "cancel" },
    ]);
  };

  const SettingRow = ({
    icon,
    label,
    value,
    onValueChange,
    type = "switch",
    subText = "",
  }: any) => (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={[styles.rowLeft, { flex: 1, paddingRight: 15 }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.card }]}>
          <Feather name={icon} size={20} color={theme.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>
            {label}
          </Text>
          {subText ? (
            <Text style={{ fontSize: 12, color: theme.icon, marginTop: 2 }}>
              {subText}
            </Text>
          ) : null}
        </View>
      </View>
      <View>
        {type === "switch" ? (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: "#767577", true: "#34C759" }}
            thumbColor={"#f4f3f4"}
          />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ marginRight: 10, color: theme.icon, fontSize: 14 }}>
              {value}
            </Text>
            <Feather name="chevron-right" size={20} color={theme.icon} />
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* --- FULL SCREEN AVATAR VIEWER MODAL --- */}
      <Modal
        visible={viewingAvatar}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingAvatar(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setViewingAvatar(false)}
        >
          <Image
            source={{ uri: avatarUrl || DEFAULT_AVATAR }}
            style={styles.fullScreenAvatar}
          />
          <View style={styles.modalCloseHint}>
            <Feather name="x-circle" size={20} color="white" />
            <Text style={styles.modalCloseText}>{t('tap_to_close')}</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* --- SCROLLABLE DISTRICT PICKER MODAL --- */}
      <Modal
        visible={districtModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDistrictModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('select_district')}</Text>
            <ScrollView style={{ maxHeight: 400, width: '100%' }}>
              {SRI_LANKAN_DISTRICTS.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.districtItem}
                  onPress={() => {
                    updateLocationInDB(item);
                    setDistrictModalVisible(false);
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 16 }}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDistrictModalVisible(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>

        {/* --- HEADER --- */}
        <View style={styles.header}>
          <View style={[styles.avatarContainer, { borderColor: theme.border }]}>
            <TouchableOpacity onPress={() => setViewingAvatar(true)}>
              <Image
                source={{ uri: avatarUrl || DEFAULT_AVATAR }}
                style={styles.avatar}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() => router.push("/editProfile")}
            >
              <Feather name="edit-2" size={14} color="white" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={theme.text} style={{ marginTop: 10 }} />
          ) : (
            <>
              <Text style={[styles.name, { color: theme.text }]}>
                {fullName || t('user_name')}
              </Text>
              <Text style={[styles.email, { color: theme.text }]}>
                {email || t('no_email')}
              </Text>
              {phoneNumber ? (
                <Text style={[styles.email, { color: theme.text, marginTop: 2 }]}>
                  {phoneNumber}
                </Text>
              ) : null}
            </>
          )}
        </View>

        {/* --- APPEARANCE --- */}
        <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>
            {t('appearance')}
          </Text>
          <SettingRow
            icon="moon"
            label={t('dark_mode')}
            value={isDark}
            onValueChange={toggleTheme}
          />
        </View>

        {/* --- GENERAL --- */}
        <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>
            {t('general')}
          </Text>
          <TouchableOpacity onPress={showLanguagePicker}>
            <SettingRow
              icon="globe"
              label={t('language')}
              value={language}
              type="link"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={showLocationPicker}>
            <SettingRow
              icon="map"
              label={t('location')}
              value={locationRegion}
              type="link"
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/auth/editguardians')}>
            <SettingRow
              icon="users"
              label={t('edit_guardian')}
              type="link"
            />
          </TouchableOpacity>
        </View>

        {/* --- NOTIFICATIONS --- */}
        <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>
            {t('notifications')}
          </Text>
          <SettingRow
            icon="bell"
            label={t('push_notif_label')}
            subText={t('push_notif_sub')}
            value={pushNotif}
            onValueChange={(val: boolean) => toggleSetting("push_notif", val)}
          />
          <SettingRow
            icon="alert-triangle"
            label={t('alert_notif_label')}
            subText={t('alert_notif_sub')}
            value={AlertNotif}
            onValueChange={(val: boolean) => toggleSetting("alert_notif", val)}
          />
        </View>

        {/* --- PRIVACY --- */}
        <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>
            {t('privacy')}
          </Text>
          <SettingRow
            icon="database"
            label={t('personal_data_label')}
            subText={t('personal_data_sub')}
            value={personalDataAccess}
            onValueChange={(val: boolean) => toggleSetting("personal_data_access", val)}
          />
          <SettingRow
            icon="camera"
            label={t('camera_access_label')}
            subText={t('camera_access_sub')}
            value={cameraAccess}
            onValueChange={(val: boolean) => toggleSetting("camera_access", val)}
          />
          <SettingRow
            icon="map-pin"
            label={t('live_location_label')}
            subText={t('live_location_sub')}
            value={liveLocation}
            onValueChange={(val: boolean) => toggleSetting("live_location", val)}
          />
        </View>

        {/* --- LOGOUT --- */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#fff" />
          <Text style={styles.logoutText}>{t('sign_out')}</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: theme.icon }]}>
          {t('app_version')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 50 },
  header: { alignItems: "center", marginBottom: 25, marginTop: 10 },
  avatarContainer: {
    position: "relative",
    borderWidth: 2,
    borderRadius: 60,
    padding: 2,
    marginBottom: 12,
  },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2563eb",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "white",
  },
  name: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  email: { fontSize: 14, opacity: 0.6 },
  sectionContainer: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 16,
    marginTop: 12,
    marginBottom: 8,
    opacity: 0.5,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { flexDirection: "row", alignItems: "center" },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowLabel: { fontSize: 16, fontWeight: "600" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    opacity: 0.5,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenAvatar: {
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
  },
  modalCloseHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    gap: 8,
  },
  modalCloseText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14
  },
  pickerContainer: {
    width: '80%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15
  },
  districtItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
    width: '100%',
    alignItems: 'center',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
});