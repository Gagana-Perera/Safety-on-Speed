import {StyleSheet, ImageBackground, View, Text, TextInput, Pressable, Image } from "react-native";
import { officialdoc } from "@/constants/officialdoc";
import { icons } from "@/constants/icons";
import { useState } from "react";
import { Stack } from "expo-router";



export default function AddGuardian() {
  const [showContact, setShowContact] = useState(false);
  return (
    //<Stack screenOptions={{headerShown: false}}>
    <View className="flex-1 px-16 bg-[#002747]">

            {/* Background image */}
      <ImageBackground 
        source={officialdoc.bgImage}
        className="absolute inset-0"
        resizeMode="cover"
        imageStyle={{ opacity: 0.1 }}
      />
      <Text className="text-[#D9F5FF] text-[40px] font-normal">Add Guardian</Text>
      <Text className="text-[#D9F5FF] text-base mt-8">Add up to 3 contacts that will be notified if you are in danger.</Text>

      <Text className="text-[#D9F5FF] text-xl mt-8">Contact 1</Text>
      <Text className="text-[#D9F5FF] text-base mt-5">Name</Text>
      <TextInput
        placeholder="Guardian 1 Name"
        keyboardType="phone-pad"
        className="bg-white/5 p-3 my-2 rounded-md text-white"
      />
      <Text className="text-[#D9F5FF] text-base mt-5">Phone Number</Text>
      <TextInput
        placeholder="Guardian 1 Phone Number"
        keyboardType="phone-pad"
        className="bg-white/5 p-3 my-2 rounded-md text-white"
      />

      
      <Pressable
        className="bg-white/5 my-2 font-bold items-center flex-row p-3 " onPress={()=>setShowContact(true)}
      >
        <Image source={icons.addButton}/>
        <Text className="text-white text-center px-2 py-1 font-bold">
          Add Contact 2
        </Text>
      </Pressable>
      setShowContact(false),
      {showContact && (
        <View>
              <Text className="text-[#D9F5FF] text-xl mt-8" >Contact 2</Text>
      <Text className="text-[#D9F5FF] text-base mt-5">Name</Text>
      <TextInput
        placeholder="Guardian 2 Name"
        keyboardType="phone-pad"
        className="bg-white/5 p-3 my-2 rounded-md text-white"
      />
      <Text className="text-[#D9F5FF] text-base mt-5">Phone Number</Text>
      <TextInput
        placeholder="Guardian 2 Phone Number"
        keyboardType="phone-pad"
        className="bg-white/5 p-3 my-2 rounded-md text-white"
      />

      
      <Pressable
        className="bg-white/5 my-2 font-bold items-center flex-row p-3 " onPress={()=>setShowContact(true)}
      >
        <Image source={icons.addButton}/>
        <Text className="text-white text-center px-2 py-1 font-bold">
          Add Contact 2
        </Text>
      </Pressable>
      </View>
      )}

      {setShowContact && (
        <View>      
          <Pressable
        className="bg-white/5 my-2 font-bold items-center flex-row p-3 " onPress={()=>setShowContact(true)}
      >
        <Image source={icons.addButton}/>
        <Text className="text-white text-center px-2 py-1 font-bold">
          Add Contact 2
        </Text>
      </Pressable>

      {showContact && (
        setShowContact(false),
      <View>
              <Text className="text-[#D9F5FF] text-xl mt-8" >Contact 2</Text>
      <Text className="text-[#D9F5FF] text-base mt-5">Name</Text>
      <TextInput
        placeholder="Guardian 2 Name"
        keyboardType="phone-pad"
        className="bg-white/5 p-3 my-2 rounded-md text-white"
      />
      <Text className="text-[#D9F5FF] text-base mt-5">Phone Number</Text>
      <TextInput
        placeholder="Guardian 2 Phone Number"
        keyboardType="phone-pad"
        className="bg-white/5 p-3 my-2 rounded-md text-white"
      />

      
      <Pressable
        className="bg-white/5 my-2 font-bold items-center flex-row p-3 " onPress={()=>setShowContact(true)}
      >
        <Image source={icons.addButton}/>
        <Text className="text-white text-center px-2 py-1 font-bold">
          Add Contact 2
        </Text>
      </Pressable>
      </View>
      )}

      </View>
       )} </View>
       //</Stack>
  );
}



