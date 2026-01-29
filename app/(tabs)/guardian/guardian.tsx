  import { ScrollView, ImageBackground, View, Text, TextInput, Pressable, Image } from "react-native";
  import { officialdoc } from "@/constants/officialdoc";
  import { icons } from "@/constants/icons";
  import { useState } from "react";
  import { Stack } from "expo-router";



  export default function AddGuardian() {
    const [showContact2, setShowContact2] = useState(false);
    const [showContact3, setShowContact3] = useState(false);
    const [showContact4, setShowContact4] = useState(false);
    const [showContact5, setShowContact5] = useState(false);



    return (
      <>
      <Stack screenOptions={{headerShown: false}} />
      <View  className="flex-1 bg-[#002747]">
              {/* Background image */}
        <ImageBackground 
          source={officialdoc.bgImage}
          className="absolute inset-0 mt-20"
          resizeMode="cover"
          imageStyle={{ opacity: 0.1 }}
        />
      
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 10 }}>


        <Text className="text-[#D9F5FF] text-[40px] font-normal px-8">Add Guardian</Text>
        <Text className="text-[#D9F5FF] text-base mt-8 px-8">Add up to 5 contacts that will be notified if you are in danger.</Text>


        {/*--- UI for Add Contact 1 --- */}

  <View>
        <Text className="text-[#D9F5FF] text-xl mt-8 px-8">Contact 1</Text>
        <Text className="text-[#D9F5FF] text-base mt-5 px-8">Name</Text>
        <TextInput
          placeholder="Guardian 1 Name"
          keyboardType="phone-pad"
          className="bg-white/5 p-3 my-2 rounded-md text-white px-8 mx-8"
        />
        <Text className="text-[#D9F5FF] text-base mt-5 px-8">Phone Number</Text>
        <TextInput
          placeholder="Guardian 1 Phone Number"
          keyboardType="phone-pad"
          className="bg-white/5 p-3 my-2 mx-8 rounded-md text-white px-8"
        />

        {!showContact2 && (      
        <Pressable
          className=" my-2 font-bold items-center flex-row mx-8 position-relative flex self-start " onPress={()=>setShowContact2(true)}
        >
          <Image source={icons.addButton}/>
          <Text className="text-white text-center py-1 font-bold  p-2">
            Add Contact 2
          </Text>
        </Pressable>)}

        </View>

    {/*--- UI for Add Contact 2 --- */}

        {showContact2 && (
          <View>
                <Text className="text-[#D9F5FF] text-xl mt-8 px-8">Contact 2</Text>
        <Text className="text-[#D9F5FF] text-base mt-5 px-8">Name</Text>
        <TextInput
          placeholder="Guardian 2 Name"
          keyboardType="phone-pad"
          className="bg-white/5 p-3 my-2 rounded-md text-white px-8 mx-8"
        />
        <Text className="text-[#D9F5FF] text-base mt-5 px-8">Phone Number</Text>
        <TextInput
          placeholder="Guardian 2 Phone Number"
          keyboardType="phone-pad"
          className="bg-white/5 p-3 my-2 rounded-md text-white px-8 mx-8"
        />

        {!showContact3 && (  
        <Pressable
          className="my-2 font-bold items-center flex-row mx-8 position-relative flex self-start  " onPress={()=>setShowContact3(true)}
        >
          <Image source={icons.addButton}/>
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
          placeholder="Guardian 2 Name"
          keyboardType="phone-pad"
          className="bg-white/5 p-3 my-2 rounded-md text-white px-8 mx-8"
        />
        <Text className="text-[#D9F5FF] text-base mt-5 px-8">Phone Number</Text>
        <TextInput
          placeholder="Guardian 2 Phone Number"
          keyboardType="phone-pad"
          className="bg-white/5 p-3 my-2 rounded-md text-white px-8 mx-8"
        />
          {!showContact4 && (  
            <Pressable
          className="my-2 font-bold items-center flex-row mx-8 position-relative flex self-start " onPress={()=>setShowContact4(true)}
        >
          <Image source={icons.addButton}/>
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
          placeholder="Guardian 4 Name"
          keyboardType="phone-pad"
          className="bg-white/5 p-3 my-2 rounded-md text-white px-8 mx-8"
        />
        <Text className="text-[#D9F5FF] text-base mt-5 px-8">Phone Number</Text>
        <TextInput
          placeholder="Guardian 4 Phone Number"
          keyboardType="phone-pad"
          className="bg-white/5 p-3 my-2 rounded-md text-white px-8 mx-8"
        />
        {!showContact5 && (  
        <Pressable
          className="my-2 font-bold items-center flex-row mx-8 position-relative flex self-start  " onPress={()=>setShowContact5(true)}
        >
          <Image source={icons.addButton}/>
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
          placeholder="Guardian 5 Name"
          keyboardType="phone-pad"
          className="bg-white/5 p-3 my-2 rounded-md text-white px-8 mx-8"
        />
        <Text className="text-[#D9F5FF] text-base mt-5 px-8">Phone Number</Text>
        <TextInput
          placeholder="Guardian 5 Phone Number"
          keyboardType="phone-pad"
          className="bg-white/5 p-3 my-2 rounded-md text-white px-8 mx-8"
        />

        </View>

    )}


        </View>
        
        </ScrollView></View>
        <View className="bg-[#002747]">
              <Pressable className="bg-[#011C33] px-4 rounded-md items-center p-3 border border-[#DCDDE0] mx-8 my-3">
          <Text className="text-[#DCDDE0]">Confirm All Contacts</Text>
        </Pressable></View>
    </>
    );
  }
