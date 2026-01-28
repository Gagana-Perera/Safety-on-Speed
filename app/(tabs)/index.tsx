import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {Link} from "expo-router";


export default function Index() {
  return (
    <View style={styles.container}>
      <Text>RNF is the code</Text>
       <Link href={'/guardian/guardian'}>Add Guardians</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})