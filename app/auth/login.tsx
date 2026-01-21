import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

export default function login() {

    const router = useRouter();
    const [email, setEmail] = useState('');
    const [passsword, setPassword] = useState('');
    const [loading, setLoading] = useState('')

    

  return (
    <View>
      <Text>login</Text>
    </View>
  )
}