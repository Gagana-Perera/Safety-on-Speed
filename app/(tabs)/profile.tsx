import { Feather } from "@expo/vector-icons"; // Added MaterialIcons for more icons
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/superbase";
import { useTheme } from "../themeContext";

export default function Profile() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme();

  // --- STATE VARIABLES FOR TOGGLES ---
  // Notifications
  const [emailNotif, setEmailNotif] = useState(false);
  const [pushNotif, setPushNotif] = useState(false);
  const [AlertNotif, setAlertNotif] = useState(false);

  // Privacy & Permissions
  const [personalDataAccess, setPersonalDataAccess] = useState(false);
  const [cameraAccess, setCameraAccess] = useState(false);
  const [liveLocation, setLiveLocation] = useState(false);

  // General
  const [language, setLanguage] = useState("English");
  const [locationRegion, setLocationRegion] = useState("Colombo, Sri Lanka");

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  // Reusable Row Component
  const SettingRow = ({
    icon,
    label,
    value,
    onValueChange,
    type = "switch",
    subText = "",
  }: any) => (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.card }]}>
          <Feather name={icon} size={20} color={theme.text} />
        </View>
        <View>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
          {subText ? (
            <Text style={{ fontSize: 12, color: theme.icon }}>{subText}</Text>
          ) : null}
        </View>
      </View>

      {/* Render Switch or Arrow based on type */}
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
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <View style={[styles.avatarContainer, { borderColor: theme.border }]}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=80",
              }}
              style={styles.avatar}
            />
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() => router.push("/editProfile")}
            >
              <Feather name="edit-2" size={14} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.name, { color: theme.text }]}>User Name</Text>
          <Text style={[styles.email, { color: theme.text }]}>
            user@example.com
          </Text>
        </View>

        {/* --- 1. APPEARANCE --- */}
        <View
          style={[styles.sectionContainer, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>
            APPEARANCE
          </Text>
          <SettingRow
            icon="moon"
            label="Dark Mode"
            value={isDark}
            onValueChange={toggleTheme}
          />
        </View>

        {/* --- 4. GENERAL (Language & Region) --- */}
        <View
          style={[styles.sectionContainer, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>
            GENERAL
          </Text>

          <TouchableOpacity
            onPress={() =>
              Alert.alert("Change Language", "Language picker would open here")
            }
          >
            <SettingRow
              icon="globe"
              label="Language"
              value={language}
              type="link"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              Alert.alert("Change Location", "Region picker would open here")
            }
          >
            <SettingRow
              icon="map"
              label="Location"
              value={locationRegion}
              type="link"
            />
          </TouchableOpacity>
        </View>

        {/* --- 2. NOTIFICATIONS --- */}
        <View
          style={[styles.sectionContainer, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>
            NOTIFICATIONS
          </Text>

          <SettingRow
            icon="mail"
            label="Email Notifications"
            subText="Receive daily summaries"
            value={emailNotif}
            onValueChange={setEmailNotif}
          />

          <SettingRow
            icon="bell"
            label="Push Notification"
            subText="Security & Update alerts"
            value={pushNotif}
            onValueChange={setPushNotif}
          />

          <SettingRow
            icon="alert-triangle"
            label="Alert Notification"
            subText="Security & Update alerts"
            value={AlertNotif}
            onValueChange={setAlertNotif}
          />
        </View>

        {/* --- 3. PRIVACY & DATA --- */}
        <View
          style={[styles.sectionContainer, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>
            PRIVACY & PERMISSIONS
          </Text>

          <SettingRow
            icon="database"
            label="Personal Data Access"
            subText="Allow to use data customization"
            value={personalDataAccess}
            onValueChange={setPersonalDataAccess}
          />

          <SettingRow
            icon="camera"
            label="Camera Access"
            subText="Allow app to use camera"
            value={cameraAccess}
            onValueChange={setCameraAccess}
          />

          <SettingRow
            icon="map-pin"
            label="Live Location Access"
            subText="Share location in real-time"
            value={liveLocation}
            onValueChange={setLiveLocation}
          />
        </View>

        {/* --- ACCOUNT SECURITY --- */}
        <View
          style={[styles.sectionContainer, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>
            ACCOUNT
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/auth/change-password")}
          >
            <SettingRow
              icon="lock"
              label="Change Password"
              subText="Update your account password"
              type="link"
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/auth/addguardians")}>
            <SettingRow
              icon="users"
              label="Manage Guardians"
              subText="Add or edit emergency contacts"
              type="link"
            />
          </TouchableOpacity>
        </View>

        {/* --- LOGOUT --- */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: theme.icon }]}>
          App Version 1.2.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  /* Header */
  header: {
    alignItems: "center",
    marginBottom: 25,
    marginTop: 10,
  },
  avatarContainer: {
    position: "relative",
    borderWidth: 2,
    borderRadius: 60,
    padding: 2,
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
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
  name: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    opacity: 0.6,
  },
  /* Sections */
  sectionContainer: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    paddingVertical: 5,
    // Shadow for depth
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
    paddingVertical: 14, // Taller rows for better touch targets
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  /* Logout */
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F0",
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  logoutText: {
    color: "#FF3B30",
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
});
