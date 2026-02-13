import { KeyboardAvoidingView, Platform, ScrollView, ImageBackground, View, Text, TextInput, Pressable, Image } from "react-native";
import { officialdoc } from "@/constants/officialdoc";
import { icons } from "@/constants/icons";
import { useState } from "react";
import { Stack } from "expo-router";

type Contact = {
  name: string;
  phone: string;
};


export default function AddGuardian() {

  const MAX_CONTACTS = 5;
  const [contacts, setContacts] = useState<Contact[]>([{ name: "", phone: "" }]); // start with 1 contact

    const handleContactChange = (index: number, field: keyof Contact, value: string) => {
    const updatedContacts = [...contacts];
    updatedContacts[index][field] = value;
    setContacts(updatedContacts);
  };

  const handleDeleteContact = (index:number) => {
    const updatedContacts = contacts.filter((_, i) => i !== index);
    setContacts(updatedContacts);
  };

  const handleAddContact = () => {
    if (contacts.length < MAX_CONTACTS) {
      setContacts([...contacts, { name: "", phone: "" }]);
    }
  };

  const isContactValid = (contact: Contact) =>
    contact.name.trim().length > 0 && contact.phone.trim().length >= 9;

  const isAllContactsValid = contacts.every(isContactValid);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, statusBarHidden: true }} />
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
            <Text className="text-[#D9F5FF] text-[40px] font-normal px-8 mt-8">
              Add Guardian
            </Text>
            <Text className="text-[#D9F5FF] text-base mt-8 px-8">
              Add up to 5 contacts that will be notified if you are in danger.
            </Text>

            {contacts.map((contact, index) => (
              <View key={index}>
                <View className="flex-row justify-between items-center px-8">
                  <Text className="text-[#D9F5FF] text-xl mt-8">
                    Contact {index + 1}
                  </Text>
                  <Pressable onPress={() => handleDeleteContact(index)}>
                    <Image
                      source={icons.deleteButton}
                      className="w-6 h-6 pt-1"
                    />
                  </Pressable>
                </View>

                <Text className="text-[#D9F5FF] text-base mt-5 px-8">Name</Text>
                <TextInput
                  value={contact.name}
                  onChangeText={(text) =>
                    handleContactChange(index, "name", text)
                  }
                  placeholder={`Guardian ${index + 1} Name`}
                  keyboardType="default"
                  className="bg-white/5 p-3 my-2 rounded-md text-white px-3 mx-8"
                />

                <Text className="text-[#D9F5FF] text-base mt-5 px-8">
                  Phone Number
                </Text>
                <View className="flex-row mx-8 gap-2">
                  <Text className="text-[#D9F5FF] bg-white/5 p-3 my-2 rounded-md">
                    + 94  |
                  </Text>
                  <TextInput
                    value={contact.phone}
                    onChangeText={(text) =>
                      handleContactChange(index, "phone", text)
                    }
                    placeholder={`Guardian ${index + 1} Phone Number`}
                    keyboardType="phone-pad"
                    className="bg-white/5 p-3 my-2 rounded-md text-white px-3 flex-1"
                  />
                </View>
              </View>
            ))}

            {contacts.length < MAX_CONTACTS && (
              <Pressable
                className="my-2 font-bold items-center flex-row mx-8 self-start"
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

      <View className="bg-[#002747]">
        <Pressable
          className="bg-[#011C33] px-4 rounded-md items-center p-3 border border-[#DCDDE0] mx-8 my-3"
          onPress={() =>
            isAllContactsValid
              ? alert("All contacts are valid")
              : alert(  
                  "Please ensure all contacts are valid before confirming."
                )
          }
        >
          <Text className="text-[#DCDDE0]">Confirm All Contacts</Text>
        </Pressable>
      </View>
    </>
  );
}
