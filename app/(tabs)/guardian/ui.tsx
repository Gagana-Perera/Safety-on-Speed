import { KeyboardAvoidingView, Platform, ScrollView, ImageBackground, View, Text, TextInput, Pressable, Image } from "react-native";
import { officialdoc } from "@/constants/officialdoc";
import { icons } from "@/constants/icons";
import { useState } from "react";
import { Stack } from "expo-router";



export default function AddGuardian() {
  const [showContact2, setShowContact2] = useState(false);
  const [showContact3, setShowContact3] = useState(false);
  const [showContact4, setShowContact4] = useState(false);
  const [showContact5, setShowContact5] = useState(false);
  const [contact1Name, setContact1Name] = useState("");
  const [contact1Phone, setContact1Phone] = useState("");
  const [contact2Name, setContact2Name] = useState("");
  const [contact2Phone, setContact2Phone] = useState("");
  const [contact3Name, setContact3Name] = useState("");
  const [contact3Phone, setContact3Phone] = useState("");
  const [contact4Name, setContact4Name] = useState("");
  const [contact4Phone, setContact4Phone] = useState("");
  const [contact5Name, setContact5Name] = useState("");
  const [contact5Phone, setContact5Phone] = useState("");

  const isContact1Valid = (contact1Name.trim().length > 0) && (contact1Phone.trim().length >= 9);
  const isContact2Valid = !showContact2 || ((contact2Name.trim().length > 0) && (contact2Phone.trim().length >= 9));
  const isContact3Valid = !showContact3 || ((contact3Name.trim().length > 0) && (contact3Phone.trim().length >= 9));
  const isContact4Valid = !showContact4 || ((contact4Name.trim().length > 0) && (contact4Phone.trim().length >= 9));
  const isContact5Valid = !showContact5 || ((contact5Name.trim().length > 0) && (contact5Phone.trim().length >= 9));

  const isAllContactsValid = isContact1Valid && isContact2Valid && isContact3Valid && isContact4Valid && isContact5Valid;
  return (
    <>
      <Stack.Screen options={{ headerShown: false, statusBarHidden: true, }} />
      <View className="flex-1 bg-[#002747] pt-14">
        {/* Background image */}
        <ImageBackground
          source={officialdoc.bgImage}
          className="absolute inset-0 mt-20"
          resizeMode="cover"
          imageStyle={{ opacity: 0.1 }}
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? "padding" : "height"}
          keyboardVerticalOffset={0}>

          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 10 }}>


            <Text className="text-[#D9F5FF] text-[40px] font-normal px-8 mt-8">Add Guardian</Text>
            <Text className="text-[#D9F5FF] text-base mt-8 px-8">Add up to 5 contacts that will be notified if you are in danger.</Text>


            {/*--- UI for Add Contact 1 --- */}

            <View>
              <Text className="text-[#D9F5FF] text-xl mt-8 px-8">Contact 1</Text>
              <Text className="text-[#D9F5FF] text-base mt-5 px-8">Name</Text>
              <TextInput
                value={contact1Name}
                onChangeText={setContact1Name}
                placeholder="Guardian 1 Name"
                keyboardType="default"
                className="bg-white/5 p-3 my-2 rounded-md text-white px-3 mx-8"
              />
              <Text className="text-[#D9F5FF] text-base mt-5 px-8">Phone Number</Text>
              <View className="flex-row mx-8 gap-2 ">
                <Text className="text-[#D9F5FF] bg-white/5 p-3 my-2 rounded-md">+ 94  |</Text>
                <TextInput
                  value={contact1Phone}
                  onChangeText={setContact1Phone}
                  placeholder="Guardian 1 Phone Number"
                  keyboardType="phone-pad"
                  className="bg-white/5 p-3 my-2 rounded-md text-white px-3 flex-1"
                /></View>

              {!showContact2 && (
                <Pressable
                  className=" my-2 font-bold items-center flex-row mx-8 position-relative flex self-start "
                  onPress={() => {
                    if (!isContact1Valid) alert("Contact 1 invalid. Please fill in Contact 1 name and phone number correctly.");
                    else setShowContact2(true)
                  }}
                >
                  <Image source={icons.addButton} />
                  <Text className="text-white text-center py-1 font-bold  p-2">
                    Add Contact 2
                  </Text>
                </Pressable>)}

            </View>

            {/*--- UI for Add Contact 2 --- */}

            {showContact2 && isContact1Valid && (
              <View>
                <Text className="text-[#D9F5FF] text-xl mt-8 px-8">Contact 2</Text>
                <Text className="text-[#D9F5FF] text-base mt-5 px-8">Name</Text>
                <TextInput
                  value={contact2Name}
                  onChangeText={setContact2Name}
                  placeholder="Guardian 2 Name"
                  keyboardType="default"
                  className="bg-white/5 p-3 my-2 rounded-md text-white px-3 mx-8"
                />
                <Text className="text-[#D9F5FF] text-base mt-5 px-8">Phone Number</Text>
                <View className="flex-row mx-8 gap-2 ">
                  <Text className="text-[#D9F5FF] bg-white/5 p-3 my-2 rounded-md">+ 94  |</Text>
                  <TextInput
                    value={contact2Phone}
                    onChangeText={setContact2Phone}
                    placeholder="Guardian 2 Phone Number"
                    keyboardType="phone-pad"
                    className="bg-white/5 p-3 my-2 rounded-md text-white px-3 flex-1"
                  /></View>

                {!showContact3 &&  (
                  <Pressable
                    className="my-2 font-bold items-center flex-row mx-8 position-relative flex self-start  " 
                    onPress={() => {
                    if (!isContact2Valid) alert("Contact 2 invalid. Please fill in Contact 2 name and phone number correctly.");
                    else setShowContact3(true)
                  }}
                  >
                    <Image source={icons.addButton} />
                    <Text className="text-white text-center px-2 py-1 font-bold px-8">
                      Add Contact 3
                    </Text>
                  </Pressable>)}

              </View>
            )}

            {/*--- UI for Add Contact 3 --- */}


            {showContact3 && (

              <View>
                <Text className="text-[#D9F5FF] text-xl mt-8 px-8">Contact 3</Text>
                <Text className="text-[#D9F5FF] text-base mt-5 px-8 ">Name</Text>
                <TextInput
                  value={contact3Name}
                  onChangeText={setContact3Name}
                  placeholder="Guardian 3 Name"
                  keyboardType="default"
                  className="bg-white/5 p-3 my-2 rounded-md text-white px-3 mx-8"
                />
                <Text className="text-[#D9F5FF] text-base mt-5 px-8">Phone Number</Text>
                <View className="flex-row mx-8 gap-2 ">
                  <Text className="text-[#D9F5FF] bg-white/5 p-3 my-2 rounded-md">+ 94  |</Text>
                  <TextInput
                    value={contact3Phone}
                    onChangeText={setContact3Phone}
                    placeholder="Guardian 3 Phone Number"
                    keyboardType="phone-pad"
                    className="bg-white/5 p-3 my-2 rounded-md text-white px-3 flex-1"
                  /></View>
                {!showContact4 && (
                  <Pressable
                    className="my-2 font-bold items-center flex-row mx-8 position-relative flex self-start " 
                     onPress={() => {
                    if (!isContact3Valid) alert("Contact 3 invalid. Please fill in Contact 3 name and phone number correctly.");
                    else setShowContact4(true)
                  }}
                  >
                    <Image source={icons.addButton} />
                    <Text className="text-white text-center px-2 py-1 font-bold px-8">
                      Add Contact 4
                    </Text>
                  </Pressable>)}

              </View>)}

            {/*--- UI for Add Contact 4 --- */}

            {showContact4 && (

              <View>
                <Text className="text-[#D9F5FF] text-xl mt-8 px-8" >Contact 4</Text>
                <Text className="text-[#D9F5FF] text-base mt-5 px-8">Name</Text>
                <TextInput
                  value={contact4Name}
                  onChangeText={setContact4Name}
                  placeholder="Guardian 4 Name"
                  keyboardType="default"
                  className="bg-white/5 p-3 my-2 rounded-md text-white px-3 mx-8"
                />
                <Text className="text-[#D9F5FF] text-base mt-5 px-8">Phone Number</Text>
                  <View className="flex-row mx-8 gap-2 ">
                    <Text className="text-[#D9F5FF] bg-white/5 p-3 my-2 rounded-md">+ 94  |</Text>
                    <TextInput
                      value={contact4Phone}
                      onChangeText={setContact4Phone}
                      placeholder="Guardian 4 Phone Number"
                      keyboardType="phone-pad"
                      className="bg-white/5 p-3 my-2 rounded-md text-white px-3 flex-1"
                    /></View>
                {!showContact5 && isContact4Valid && (
                  <Pressable
                    className="my-2 font-bold items-center flex-row mx-8 position-relative flex self-start  " 
                    onPress={() => {
                    if (!isContact4Valid) alert("Contact 4 invalid. Please fill in Contact 4 name and phone number correctly.");
                    else setShowContact5(true)
                  }}
                  >
                    <Image source={icons.addButton} />
                    <Text className="text-white text-center px-2 py-1 font-bold">
                      Add Contact 5
                    </Text>
                  </Pressable>)}


              </View>
            )}
            {/*--- UI for Add Contact 5 --- */}
            <View>
              {showContact5 && (
                <View>
                  <Text className="text-[#D9F5FF] text-xl mt-8 px-8" >Contact 5</Text>
                  <Text className="text-[#D9F5FF] text-base mt-5 px-8">Name</Text>
                  <TextInput
                    value={contact5Name}
                    onChangeText={setContact5Name}
                    placeholder="Guardian 5 Name"
                    keyboardType="default"
                    className="bg-white/5 p-3 my-2 rounded-md text-white px-3 mx-8"
                  />
                  <Text className="text-[#D9F5FF] text-base mt-5 px-8">Phone Number</Text>
                  <View className="flex-row mx-8 gap-2 ">
                    <Text className="text-[#D9F5FF] bg-white/5 p-3 my-2 rounded-md">+ 94  |</Text>
                    <TextInput
                      value={contact5Phone}
                      onChangeText={setContact5Phone}
                      placeholder="Guardian 5 Phone Number"
                      keyboardType="phone-pad"
                      className="bg-white/5 p-3 my-2 rounded-md text-white px-3 flex-1"
                    /></View>

                </View>

              )}


            </View>

          </ScrollView></KeyboardAvoidingView></View>
    
        <View className="bg-[#002747]">
          <Pressable 
            className="bg-[#011C33] px-4 rounded-md items-center p-3 border border-[#DCDDE0] mx-8 my-3"
            onPress={()=> isAllContactsValid ? (alert("All contacts are valid")):(alert("Please ensure all contacts are valid before confirming."))}>
            <Text className="text-[#DCDDE0]">Confirm All Contacts</Text>
          </Pressable></View>
    </>
  );
}
