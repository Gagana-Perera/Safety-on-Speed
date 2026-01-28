import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { loginUser } from "@/lib/auth";


export default function login() {

    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
       const user = await loginUser(email, password);

       console.log("Logged in user:", user);

      // Navigate to the home screen after successful login
      router.push("/(tabs)");
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Text>login</Text>
    </View>
  )
}