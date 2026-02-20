import React from "react";
import { Text, View } from "react-native";
import {Link} from "expo-router";


export default function Index() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text>RNF is the code</Text>
       <Link href={'/guardian/ui'}>Add Guardians</Link>
       <Link href={'/guardian/newui'}>New Guardian</Link>
       <Link href={'/backbutton'}>back button</Link>
    </View>
  );
}
