import React, { useState, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Switch, 
  ScrollView, 
  SafeAreaView, 
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons"; 
import { useTheme } from "../themeContext";
import BackButton from '../backButton'; 
import { supabase } from "../../lib/superbase"; 

export default function Profile() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme();

  // --- STATE VARIABLES ---
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(""); 
  const [avatarUrl, setAvatarUrl] = useState("");
  const [viewingAvatar, setViewingAvatar] = useState(false);

  // Toggles
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [AlertNotif, setAlertNotif] = useState(true);
  const [personalDataAccess, setPersonalDataAccess] = useState(true);
  const [cameraAccess, setCameraAccess] = useState(true);
  const [liveLocation, setLiveLocation] = useState(true);
  const [language, setLanguage] = useState("English");
  const [locationRegion, setLocationRegion] = useState("Colombo, Sri Lanka");

  const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=80";

  // --- FETCH DATA ON FOCUS ---
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchProfileData = async () => {
        try {
          // 1. Get auth user
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
          if (!user) return;

          // 2. Get full_name and settings from profiles table
          const { data: profileData, error: profileError } = await (supabase
            .from('profiles')
            .select('full_name, avatar_url, email, email_notif, push_notif, alert_notif, personal_data_access, camera_access, live_location')
            .eq('id', user.id)
            .single() as any);

          if (profileError) {
            console.log("Error fetching profile:", profileError);
          }

          if (isActive) {
            // 3. Get name — priority: profiles table → user_metadata → empty
            const nameFromDB = profileData?.full_name || "";
            const metaFirst = user.user_metadata?.first_name || "";
            const metaLast = user.user_metadata?.last_name || "";
            const nameFromMeta = `${metaFirst} ${metaLast}`.trim();
            const resolvedName = nameFromDB || nameFromMeta;

            setFullName(resolvedName);

            // 4. Only show alert if name is truly missing everywhere
            if (!resolvedName) {
              Alert.alert(
                "Complete Your Profile",
                "Please add your name in Edit Profile.",
                [{ text: "Go to Edit Profile", onPress: () => router.push("/editProfile") }]
              );
            }

            // 5. Email — priority: profiles table → auth email
            setEmail(profileData?.email || user.email || "No Email");

            // 6. Avatar
            if (profileData?.avatar_url) setAvatarUrl(profileData.avatar_url);

            // 7. Toggles
            setEmailNotif(profileData?.email_notif || true);
            setPushNotif(profileData?.push_notif || true);
            setAlertNotif(profileData?.alert_notif || true);
            setPersonalDataAccess(profileData?.personal_data_access || true);
            setCameraAccess(profileData?.camera_access || true);
            setLiveLocation(profileData?.live_location || true);
          }

        } catch (error) {
          console.log("Unexpected error:", error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchProfileData();

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user && isActive) {
          setEmail(session.user.email || "No Email");
        }
      });

      return () => {
        isActive = false;
        subscription.unsubscribe();
      };
    }, [])
  );

  // Update Preferences in database
  const toggleSetting = async (
    field: 'email_notif' | 'push_notif' | 'alert_notif' | 'personal_data_access' | 'camera_access' | 'live_location', 
    newValue: boolean
  ) => {
    if (field === 'email_notif') setEmailNotif(newValue);
    if (field === 'push_notif') setPushNotif(newValue);
    if (field === 'alert_notif') setAlertNotif(newValue);
    if (field === 'personal_data_access') setPersonalDataAccess(newValue);
    if (field === 'camera_access') setCameraAccess(newValue);
    if (field === 'live_location') setLiveLocation(newValue);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('profiles')
        .update({ [field]: newValue })
        .eq('id', session.user.id);

      if (error) {
        console.log(`Error saving ${field}:`, error);
      }
    } catch (error) {
      console.log("Unexpected error saving preference:", error);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Sign Out", 
        style: "destructive", 
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/auth/login");
        } 
      },
    ]);
  };

  // Reusable Row Component
  const SettingRow = ({ icon, label, value, onValueChange, type = "switch", subText = "" }: any) => (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.card }]}>
          <Feather name={icon} size={20} color={theme.text} />
        </View>
        <View>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
          {subText ? <Text style={{ fontSize: 12, color: theme.icon }}>{subText}</Text> : null}
        </View>
      </View>
      
      {type === "switch" ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: "#767577", true: "#34C759" }}
          thumbColor={"#f4f3f4"}
        />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ marginRight: 10, color: theme.icon, fontSize: 14 }}>{value}</Text>
          <Feather name="chevron-right" size={20} color={theme.icon} />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>

      {/* --- FULL SCREEN AVATAR VIEWER MODAL --- */}
      <Modal visible={viewingAvatar} transparent animationType="fade" onRequestClose={() => setViewingAvatar(false)}>
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
            <Text style={styles.modalCloseText}>Tap anywhere to close</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>

        <View>
          <BackButton color={theme.text} />
        </View>
        
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <View style={[styles.avatarContainer, { borderColor: theme.border }]}>
            
            {/* Tap avatar to VIEW full screen */}
            <TouchableOpacity onPress={() => setViewingAvatar(true)}>
              <Image
                source={{ uri: avatarUrl || DEFAULT_AVATAR }}
                style={styles.avatar}
              />
            </TouchableOpacity>

            {/* Edit badge navigates to Edit Profile */}
            <TouchableOpacity 
              style={styles.editBadge} 
              onPress={() => router.push("/editProfile")}
            >
              <Feather name="edit-2" size={14} color="white" />
            </TouchableOpacity>
          </View>

          {loading ? (
             <ActivityIndicator size="small" color={theme.text} style={{marginTop: 10}}/>
          ) : (
            <>
              <Text style={[styles.name, { color: theme.text }]}>
                {fullName || "User Name"}
              </Text>
              <Text style={[styles.email, { color: theme.text }]}>
                {email || "No Email"}
              </Text>
            </>
          )}
        </View>  

        {/* --- 1. APPEARANCE --- */}
        <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>APPEARANCE</Text>
          <SettingRow 
            icon="moon" 
            label="Dark Mode" 
            value={isDark} 
            onValueChange={toggleTheme} 
          />
        </View>

        {/* --- 4. GENERAL --- */}
        <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>GENERAL</Text>
          <TouchableOpacity onPress={() => Alert.alert("Change Language", "Picker here")}>
            <SettingRow icon="globe" label="Language" value={language} type="link" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert("Change Location", "Picker here")}>
            <SettingRow icon="map" label="Location" value={locationRegion} type="link" />
          </TouchableOpacity>
        </View>

        {/* --- 2. NOTIFICATIONS --- */}
        <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>NOTIFICATIONS</Text>
          <SettingRow 
            icon="mail" 
            label="Email Notifications" 
            subText="Receive daily summaries" 
            value={emailNotif} 
            onValueChange={(val: boolean) => toggleSetting('email_notif', val)} 
          />
          <SettingRow 
            icon="bell" 
            label="Push Notification" 
            subText="Security & Update alerts" 
            value={pushNotif} 
            onValueChange={(val: boolean) => toggleSetting('push_notif', val)} 
          />
          <SettingRow 
            icon="alert-triangle" 
            label="Alert Notification" 
            subText="Security & Update alerts" 
            value={AlertNotif} 
            onValueChange={(val: boolean) => toggleSetting('alert_notif', val)} 
          />
        </View>

        {/* --- 3. PRIVACY --- */}
        <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>PRIVACY & PERMISSIONS</Text>
          <SettingRow 
            icon="database" 
            label="Personal Data Access" 
            subText="Allow to use data customization" 
            value={personalDataAccess} 
            onValueChange={(val: boolean) => toggleSetting('personal_data_access', val)} 
          />
          <SettingRow 
            icon="camera" 
            label="Camera Access" 
            subText="Allow app to use camera" 
            value={cameraAccess} 
            onValueChange={(val: boolean) => toggleSetting('camera_access', val)} 
          />
          <SettingRow 
            icon="map-pin" 
            label="Live Location Access" 
            subText="Share location in real-time" 
            value={liveLocation} 
            onValueChange={(val: boolean) => toggleSetting('live_location', val)} 
          />
        </View>

        {/* --- LOGOUT --- */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#fff" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: theme.icon }]}>App Version 1.2.0</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: 
  { padding: 20, 
    paddingBottom: 50 
  },
  header: 
  { alignItems: "center", 
    marginBottom: 25, 
    marginTop: 10 
  },
  avatarContainer: 
  { position: "relative", 
    borderWidth: 2, 
    borderRadius: 60, 
    padding: 2, 
    marginBottom: 12 
  },
  avatar: 
  { width: 100, 
    height: 100, 
    borderRadius: 50 
  },
  editBadge: 
  { position: "absolute", 
    bottom: 0, 
    right: 0, 
    backgroundColor: "#2563eb", 
    padding: 8, 
    borderRadius: 20, 
    borderWidth: 2, 
    borderColor: "white" 
  },
  name: 
  { fontSize: 22, 
    fontWeight: "bold", 
    marginBottom: 4 
  },
  email: 
  { fontSize: 14, 
    opacity: 0.6 
  },
  sectionContainer: 
  { borderRadius: 16, 
    marginBottom: 20, 
    overflow: "hidden", 
    paddingVertical: 5, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 5, 
    elevation: 2 
  },
  sectionTitle: 
  { fontSize: 12, 
    fontWeight: "800", 
    marginLeft: 16, 
    marginTop: 12, 
    marginBottom: 8, 
    opacity: 0.5, 
    letterSpacing: 1, 
    textTransform: "uppercase" 
  },
  row: 
  { flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderBottomWidth: StyleSheet.hairlineWidth 
  },
  rowLeft: 
  { flexDirection: "row", 
    alignItems: "center" 
  },
  iconContainer: 
  { width: 38,
    height: 38, 
    borderRadius: 10, 
    alignItems: "center", 
    justifyContent: "center", 
    marginRight: 14 
  },
  rowLabel: 
  { fontSize: 16, 
    fontWeight: "600" 
  },
  logoutButton: 
  { flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#2563eb", 
    padding: 16, 
    borderRadius: 16, 
    marginTop: 10, 
    marginBottom: 20 
  },
  logoutText: 
  { color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16, 
    marginLeft: 8 
  },
  versionText: 
  { textAlign: "center", 
    fontSize: 12, 
    opacity: 0.5, 
    marginBottom: 20 
  },
  modalOverlay:
  { flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenAvatar:
  { width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalCloseHint:
  { flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  modalCloseText:
  { color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});