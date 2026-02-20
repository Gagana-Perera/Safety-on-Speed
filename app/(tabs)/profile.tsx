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
  ActivityIndicator
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import { Feather } from "@expo/vector-icons"; 
import { useTheme } from "../themeContext";
import BackButton from '../backButton'; 
import { supabase } from "../../lib/superbase"; 

export default function Profile() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme();

  // --- STATE VARIABLES ---
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("User Name");
  const [email, setEmail] = useState("user@example.com"); 
  const [avatarUrl, setAvatarUrl] = useState("");

  // Toggles
  const [emailNotif, setEmailNotif] = useState(false);
  const [pushNotif, setPushNotif] = useState(false);
  const [AlertNotif, setAlertNotif] = useState(false);
  const [personalDataAccess, setPersonalDataAccess] = useState(false);
  const [cameraAccess, setCameraAccess] = useState(false);
  const [liveLocation, setLiveLocation] = useState(false);
  const [language, setLanguage] = useState("English");
  const [locationRegion, setLocationRegion] = useState("Colombo, Sri Lanka");

  // --- FETCH DATA ON FOCUS ---
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchProfileData = async () => {
        try {
          // 1. Get Session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          // 2. Fetch Profile Data from Database
          const { data, error } = await (supabase
            .from('profiles')
            .select('full_name, avatar_url, email, email_notif, push_notif, alert_notif, personal_data_access, camera_access, live_location') // fetching email column
            .eq('id', session.user.id)
            .single() as any);

          if (error) {
             console.log("Error fetching profile:", error);
          }

          if (isActive && data) {
            setFullName(data.full_name || "User Name");
            
            // FIX: Priority Logic + Type Safety
            // If DB has email, use it. Otherwise use session email. 
            const displayEmail = data.email || session.user.email || "No Email";
            setEmail(displayEmail);
            
            if (data.avatar_url) setAvatarUrl(data.avatar_url);

            // --- NEW: Set local state from database values ---
            setEmailNotif(data.email_notif || false);
            setPushNotif(data.push_notif || false);
            setAlertNotif(data.alert_notif || false);

            // --- NEW: Set Permission States ---
            setPersonalDataAccess(data.personal_data_access || false);
            setCameraAccess(data.camera_access || false);
            setLiveLocation(data.live_location || false);

          } else if (isActive) {
            // Fallback if no profile data found at all
            setEmail(session.user.email || "No Email");
          }

        } catch (error) {
          console.log("Unexpected error:", error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchProfileData();

      return () => {
        isActive = false;
      };
    }, [])
  );

  // Update Preferences in database
  const toggleSetting = async (
    field: 'email_notif' | 'push_notif' | 'alert_notif' | 'personal_data_access' | 'camera_access' | 'live_location', 
    newValue: boolean
  ) => {
    // 1. Instant UI update
    if (field === 'email_notif') setEmailNotif(newValue);
    if (field === 'push_notif') setPushNotif(newValue);
    if (field === 'alert_notif') setAlertNotif(newValue);
    if (field === 'personal_data_access') setPersonalDataAccess(newValue);
    if (field === 'camera_access') setCameraAccess(newValue);
    if (field === 'live_location') setLiveLocation(newValue);

    // 2. Push to Supabase
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

  // --- UPLOAD NEW AVATAR ---
  const [uploading, setUploading] = useState(false); // Add this near your other state variables at the top

  const changeAvatar = async () => {
    try {
      // 1. Open phone gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // Lets user crop the image
        aspect: [1, 1],      // Forces a square crop
        quality: 0.5,        // Compresses image to save database space
      });

      if (result.canceled) return;

      setUploading(true);
      const imageUri = result.assets[0].uri;

      // 2. Convert image for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      // 3. Get user session & create unique file name
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");
      
      const fileExt = imageUri.split('.').pop() || 'jpeg';
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;

      // 4. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) throw uploadError;

      // 5. Get the new public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // 6. Save the new URL to the user's profile table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      // 7. Update the screen instantly
      setAvatarUrl(publicUrl);

    } catch (error) {
      console.log("Error uploading image: ", error);
      alert("Failed to upload image.");
    } finally {
      setUploading(false);
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
      <ScrollView contentContainerStyle={styles.content}>

        <View>
          <BackButton color={theme.text} />
        </View>
        
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <View style={[styles.avatarContainer, { borderColor: theme.border }]}>
            
            {/* --- Image Upload Part --- */}
            <TouchableOpacity onPress={changeAvatar} disabled={uploading}>
              {uploading ? (
                <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator size="large" color={theme.text} />
                </View>
              ) : (
                <Image
                  source={{ 
                    uri: avatarUrl 
                      ? avatarUrl 
                      : "https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=80" 
                  }}
                  style={styles.avatar}
                />
              )}
            </TouchableOpacity>

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
              <Text style={[styles.name, { color: theme.text }]}>{fullName}</Text>
              <Text style={[styles.email, { color: theme.text }]}>{email}</Text>
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
});