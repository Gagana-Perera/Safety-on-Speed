import AuthLayout, { authStyles } from "@/components/auth/AuthLayout";
import {
  GUARDIAN_PHONE_EXAMPLE,
  isValidGuardianPhone,
  normalizeGuardianPhone,
  sanitizeGuardianPhoneInput,
} from "@/lib/guardianPhone";
import { loadCachedGuardians, saveGuardians } from "@/lib/saveguardians";
import { supabase } from "@/lib/superbase";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Contact = {
  name: string;
  phone: string;
};

const LOCATION_PREPROMPT_PENDING_KEY = "location_preprompt_pending_v1";

export default function GuardianSetup() {
  const router = useRouter();
  const params = useLocalSearchParams<{ flow?: string | string[] }>();
  const MAX_CONTACTS = 5;
  const [contacts, setContacts] = useState<Contact[]>([{ name: "", phone: "" }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isManageFlow, setIsManageFlow] = useState(false);

  const flowParam = Array.isArray(params.flow) ? params.flow[0] : params.flow;
  const isSignupFlow = flowParam === "signup";
  const title = isManageFlow && !isSignupFlow ? "Manage Guardians" : "Add Guardians";
  const eyebrow = isSignupFlow ? "Final Step" : "Safety Contacts";
  const footerHint = isSignupFlow
    ? "You can update these contacts later from your profile."
    : "These contacts will receive future SOS alerts.";

  useEffect(() => {
    async function loadGuardians() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("guardians")
          .select(
            "g1_name,g1_phone,g2_name,g2_phone,g3_name,g3_phone,g4_name,g4_phone,g5_name,g5_phone",
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error loading guardians:", error);
          setLoading(false);
          return;
        }

        if (data) {
          if (!isSignupFlow) {
            setIsManageFlow(true);
          }

          const loaded: Contact[] = [];
          for (let i = 1; i <= 5; i++) {
            const name = (data as any)[`g${i}_name`];
            const phone = (data as any)[`g${i}_phone`];
            if (name || phone) {
              loaded.push({
                name: name ?? "",
                phone: normalizeGuardianPhone(phone ?? ""),
              });
            }
          }

          if (loaded.length > 0) {
            setContacts(loaded);
          }
        } else {
          const cached = await loadCachedGuardians(user.id);
          if (cached && cached.length > 0) {
            if (!isSignupFlow) {
              setIsManageFlow(true);
            }
            setContacts(
              cached.map((contact) => ({
                name: contact.name,
                phone: normalizeGuardianPhone(contact.phone),
              })),
            );
          }
        }
      } catch (error) {
        console.error("loadGuardians error:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadGuardians();
  }, [isSignupFlow]);

  function handleContactChange(
    index: number,
    field: keyof Contact,
    value: string,
  ) {
    const updated = [...contacts];
    updated[index][field] =
      field === "phone" ? sanitizeGuardianPhoneInput(value) : value;
    setContacts(updated);
  }

  function handleDeleteContact(index: number) {
    setContacts(contacts.filter((_, i) => i !== index));
  }

  function handleAddContact() {
    if (contacts.length < MAX_CONTACTS) {
      setContacts([...contacts, { name: "", phone: "" }]);
    }
  }

  const isContactValid = (contact: Contact) =>
    contact.name.trim().length > 0 && isValidGuardianPhone(contact.phone);

  const isAllContactsValid =
    contacts.length > 0 && contacts.every(isContactValid);

  async function handleConfirm() {
    if (!isAllContactsValid) {
      Alert.alert(
        "Invalid Contacts",
        `Please enter each guardian phone number in ${GUARDIAN_PHONE_EXAMPLE} format.`,
      );
      return;
    }

    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        Alert.alert("Error", "You must be logged in to save guardians.");
        return;
      }

      await saveGuardians(user.id, contacts);

      if (isSignupFlow) {
        await AsyncStorage.setItem(LOCATION_PREPROMPT_PENDING_KEY, "true");
      }

      Alert.alert("Success", "Guardians saved successfully!", [
        {
          text: "OK",
          onPress: () => {
            if (isSignupFlow) {
              router.replace("/(tabs)");
            } else if (isManageFlow) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error(
        `[Guardian Setup Error] Failed to save guardian list. Context: Action=handleConfirm | Error:`,
        error,
      );
      Alert.alert("Error", `Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <AuthLayout
          eyebrow={eyebrow}
          title={title}
          subtitle="Loading your guardian contacts."
          showBack={!isSignupFlow}
        >
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#74D7FF" />
            <Text style={styles.loadingText}>Preparing your contacts...</Text>
          </View>
        </AuthLayout>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthLayout
        eyebrow={eyebrow}
        title={title}
        subtitle={`Add up to 5 contacts that will be notified if you are in danger. Use ${GUARDIAN_PHONE_EXAMPLE} for phone numbers.`}
        showBack={!isSignupFlow}
        footer={
          <View style={[authStyles.footerBlock, styles.footerBlock]}>
            <Pressable
              onPress={handleConfirm}
              disabled={saving}
              style={({ pressed }) => [
                authStyles.primaryButton,
                styles.confirmButton,
                saving && authStyles.primaryButtonDisabled,
                pressed && authStyles.pressed,
              ]}
            >
              <Text style={authStyles.primaryButtonText}>
                {saving ? "Saving..." : "Confirm All Contacts"}
              </Text>
            </Pressable>
            <Text style={authStyles.supportingText}>{footerHint}</Text>
          </View>
        }
      >
        <View style={styles.cardsStack}>
          {contacts.map((contact, index) => (
            <View key={index} style={styles.contactPanel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelEyebrow}>Guardian</Text>
                  <Text style={styles.panelTitle}>Contact {index + 1}</Text>
                </View>

                {contacts.length > 1 ? (
                  <Pressable
                    onPress={() => handleDeleteContact(index)}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && authStyles.pressed,
                    ]}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={18}
                      color="#DDEEFF"
                    />
                    <Text style={styles.deleteButtonText}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={authStyles.formGrid}>
                <View style={authStyles.fieldGroup}>
                  <Text style={authStyles.fieldLabel}>Name</Text>
                  <View style={authStyles.fieldShell}>
                    <TextInput
                      value={contact.name}
                      onChangeText={(text) =>
                        handleContactChange(index, "name", text)
                      }
                      placeholder={`Guardian ${index + 1} Name`}
                      placeholderTextColor="rgba(214, 236, 255, 0.42)"
                      autoCapitalize="words"
                      autoCorrect={false}
                      style={authStyles.fieldInput}
                    />
                  </View>
                </View>

                <View style={authStyles.fieldGroup}>
                  <Text style={authStyles.fieldLabel}>Phone Number</Text>
                  <View style={authStyles.fieldShell}>
                    <TextInput
                      value={contact.phone}
                      onChangeText={(text) =>
                        handleContactChange(index, "phone", text)
                      }
                      placeholder={GUARDIAN_PHONE_EXAMPLE}
                      placeholderTextColor="rgba(214, 236, 255, 0.42)"
                      keyboardType="phone-pad"
                      maxLength={11}
                      style={authStyles.fieldInput}
                    />
                  </View>
                </View>
              </View>
            </View>
          ))}

          {contacts.length < MAX_CONTACTS ? (
            <Pressable
              onPress={handleAddContact}
              style={({ pressed }) => [
                styles.addContactButton,
                pressed && authStyles.pressed,
              ]}
            >
              <MaterialIcons
                name="add-circle-outline"
                size={20}
                color="#74D7FF"
              />
              <Text style={styles.addContactText}>Add Contact</Text>
            </Pressable>
          ) : null}

          <Text style={styles.helperText}>
            Add at least one trusted contact before you start using SOS. Phone
            numbers should be entered as {GUARDIAN_PHONE_EXAMPLE}.
          </Text>
        </View>
      </AuthLayout>
    </>
  );
}

const styles = StyleSheet.create({
  addContactButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(116, 215, 255, 0.08)",
    borderColor: "rgba(116, 215, 255, 0.25)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 22,
    width: "100%",
  },
  addContactText: {
    color: "#74D7FF",
    fontSize: 15,
    fontWeight: "700",
  },
  cardsStack: {
    gap: 16,
  },
  confirmButton: {
    width: "100%",
  },
  contactPanel: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: "#DDEEFF",
    fontSize: 13,
    fontWeight: "700",
  },
  footerBlock: {
    width: "100%",
  },
  helperText: {
    color: "rgba(214, 236, 255, 0.72)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  loadingState: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
  },
  loadingText: {
    color: "#DDEEFF",
    fontSize: 15,
    fontWeight: "600",
  },
  panelEyebrow: {
    color: "#74D7FF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  panelHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  panelTitle: {
    color: "#F5FBFF",
    fontSize: 20,
    fontWeight: "800",
  },
});
