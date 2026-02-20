import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import {Link} from "expo-router";


export default function Index() {
  return (
<<<<<<< HEAD
    <View className="flex-1 items-center justify-center">
      <Text>RNF is the code</Text>
       <Link href={'/guardian/ui'}>Add Guardians</Link>
       <Link href={'/guardian/newui'}>New Guardian</Link>
       <Link href={'/backbutton'}>back button</Link>
=======
    <View style={{ padding: 16, gap: 12 }}>
      <Text>Welcome</Text>

      <Link href="/auth/sign-up" asChild>
        <Text style={{ color: "#2563eb", fontWeight: "600" }}>Sign Up</Text>
      </Link>
      <Link href="/auth/login" asChild>
        <Text style={{ color: "#2563eb", fontWeight: "600" }}>Login</Text>
      </Link>
>>>>>>> ade500a3e9cc662fd59235bdcbfd82ea137a7b3c
    </View>
  );
}
