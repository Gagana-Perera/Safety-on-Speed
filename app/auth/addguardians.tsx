import { icons } from "@/constants/icons";
import { officialdoc } from "@/constants/officialdoc";
import { saveGuardians } from "@/lib/saveguardians";
import { supabase } from "@/lib/superbase";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

type Contact = {
  name: string;
  phone: string;
};

export default function GuardianSetup() {
  const router = useRouter();
  const MAX_CONTACTS = 5;
  const [contacts, setContacts] = useState<Contact[]>([
    { name: "", phone: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  // Track whether we were opened from within the app (manage) or from signup
  // If a session already existed before this screen rendered, it's the manage flow
  const [isManageFlow, setIsManageFlow] = useState(false);

  // ── Load existing guardians on mount ────────────────────────────────────
  useEffect(() => {
    async function loadGuardians() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Check if existing guardians row exists
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
          // We found an existing row → this is the manage flow
          setIsManageFlow(true);

          // Build the contacts array from the flat columns
          const loaded: Contact[] = [];
          for (let i = 1; i <= 5; i++) {
            const name = (data as any)[`g${i}_name`];
            const phone = (data as any)[`g${i}_phone`];
            if (name || phone) {
              loaded.push({ name: name ?? "", phone: phone ?? "" });
            }
          }
          if (loaded.length > 0) {
            setContacts(loaded);
          }
        }
      } catch (e) {
        console.error("loadGuardians error:", e);
      } finally {
        setLoading(false);
      }
    }

    loadGuardians();
  }, []);

  const handleContactChange = (
    index: number,
    field: keyof Contact,
    value: string,
  ) => {
    const updated = [...contacts];
    updated[index][field] = value;
    setContacts(updated);
  };

  const handleDeleteContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleAddContact = () => {
    if (contacts.length < MAX_CONTACTS) {
      setContacts([...contacts, { name: "", phone: "" }]);
    }
  };

  const isContactValid = (c: Contact) =>
    c.name.trim().length > 0 && c.phone.trim().length >= 9;

  const isAllContactsValid =
    contacts.length > 0 && contacts.every(isContactValid);

  const handleConfirm = async () => {
    if (!isAllContactsValid) {
      Alert.alert(
        "Invalid Contacts",
        "Please ensure all contacts have a name and a valid phone number.",
      );
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "You must be logged in to save guardians.");
        return;
      }

      await saveGuardians(user.id, contacts);

      Alert.alert("Success", "Guardians saved successfully!", [
        {
          text: "OK",
          onPress: () => {
            if (isManageFlow) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error("Error in handleConfirm:", error);
      Alert.alert("Error", `Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 bg-[#002747] items-center justify-center">
          <ActivityIndicator size="large" color="#D9F5FF" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-[#002747] pt-14">
        <ImageBackground
          source={officialdoc.bgImage}
          className="absolute inset-0 mt-20"
          resizeMode="cover"
          imageStyle={{ opacity: 0.1 }}
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 10 }}
          >
            {/* Back button for manage flow */}
            {isManageFlow && (
              <View className="px-6 mt-2">
                <Pressable
                  onPress={() => router.back()}
                  className="flex-row items-center bg-white/10 border border-white/10 rounded-2xl px-4 py-2 self-start"
                >
                  <Text className="text-white text-xl mr-2">{"<"}</Text>
                  <Text className="text-white text-xl font-light">Back</Text>
                </Pressable>
              </View>
            )}

            <Text className="text-[#D9F5FF] text-[40px] font-normal px-8 mt-4">
              {isManageFlow ? "Manage Guardians" : "Add Guardian"}
            </Text>
            <Text className="text-[#D9F5FF] text-base mt-8 px-8">
              Add up to 5 contacts that will be notified if you are in danger.
            </Text>

            {contacts.map((contact, index) => (
              <View
                key={index}
                className="bg-black/20 rounded-2xl mx-4 mt-6 pb-8"
              >
                <View className="flex-row justify-between items-center px-8">
                  <Text className="text-[#D9F5FF] text-xl mt-8">
                    Contact {index + 1}
                  </Text>
                  {contacts.length > 1 && (
                    <Pressable onPress={() => handleDeleteContact(index)}>
                      <Image
                        source={icons.deleteButton}
                        className="w-6 h-6 pt-1"
                      />
                    </Pressable>
                  )}
                </View>

                <Text className="text-[#D9F5FF] text-base mt-5 px-8">Name</Text>
                <TextInput
                  value={contact.name}
                  onChangeText={(text) =>
                    handleContactChange(index, "name", text)
                  }
                  placeholder={`Guardian ${index + 1} Name`}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  className="bg-white/5 p-3 my-2 rounded-md text-white px-3 mx-8"
                />

                <Text className="text-[#D9F5FF] text-base mt-5 px-8">
                  Phone Number
                </Text>
                <View className="flex-row mx-8 gap-2">
                  <View className="bg-white/5 p-3 my-2 rounded-md justify-center">
                    <Text className="text-[#D9F5FF]">+ 94 |</Text>
                  </View>
                  <TextInput
                    value={contact.phone}
                    onChangeText={(text) =>
                      handleContactChange(index, "phone", text)
                    }
                    placeholder={`Guardian ${index + 1} Phone Number`}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="phone-pad"
                    className="bg-white/5 p-3 my-2 rounded-md text-white px-3 flex-1"
                  />
                </View>
              </View>
            ))}

            {contacts.length < MAX_CONTACTS && (
              <Pressable
                className="my-2 font-bold items-center flex-row mx-8 self-start mt-6"
                onPress={handleAddContact}
              >
                <Image source={icons.addButton} />
                <Text className="text-white text-center py-1 font-bold p-2">
                  Add Contact
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <View className="bg-[#002747] pb-10">
        <Pressable
          className={`px-4 rounded-md items-center p-3 border border-[#DCDDE0] mx-8 my-3 ${
            saving ? "opacity-50" : ""
          } bg-[#011C33]`}
          onPress={handleConfirm}
          disabled={saving}
        >
          <Text className="text-[#DCDDE0] text-lg font-semibold">
            {saving ? "Saving..." : "Confirm All Contacts"}
          </Text>
        </Pressable>
      </View>
    </>
  );
}
