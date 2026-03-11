import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View>
      <Text>RNF is the code</Text>
      <Text>RNF is the code</Text>
      <Text>RNF is the code</Text>
      <Text>RNF is the code</Text>
      <Text>RNF is the code</Text>
      <Text>RNF is the code</Text>
      <Text>RNF is the code</Text>
      <Text>RNF is the code</Text>
      <Text>RNF is the code</Text>
      <Link className='' href={"/auth/sign-up"}>Sign Up</Link>
      <Link className='' href={'/auth/login'}>Login</Link>
    </View>
  );
}
