import { supabase } from '@/lib/superbase';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

export default function signUp() {

    const router = useRouter();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nic, setNic] = useState('');
    const [birth, setBirth] = useState('');
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [passsword, setPassword] = useState('');
    const [confirmPasssword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false)

    async function signUp() {
        setLoading(true);
        const {error} = await supabase.auth.signUp({ firstName, lastName, nic, birth, email, confirmEmail, passsword, confirmPasssword });

        if (error) Alert.alert(error.message);
        setLoading(false);
    }

  return (
    <View>
        <Text>First Name</Text>
        <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="email@gmail.com"
            className=""
        />

        <Text>First Name</Text>
        <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="email@gmail.com"
            className=""
        />

        <Text>NIC</Text>
        <TextInput
            value={}
            onChangeText={}
            placeholder="email@gmail.com"
            className=""
        />

        <Text>Date of Birth</Text>
        <TextInput
            value={}
            onChangeText={}
            placeholder="email@gmail.com"
            className=""
        />

        <Text>Email</Text>
        <TextInput
            value={}
            onChangeText={}
            placeholder="email@gmail.com"
            className=""
        />

        <Text>Confirm Email</Text>
        <TextInput
            value={}
            onChangeText={}
            placeholder="email@gmail.com"
            className=""
        />

        <Text>Password</Text>
        <TextInput
            value={}
            onChangeText={}
            placeholder="email@gmail.com"
            className=""
        />

        <Text>Confirm Password</Text>
        <TextInput
            value={}
            onChangeText={}
            placeholder="email@gmail.com"
            className=""
        />

        <Link 
            className=''
        > Sign In</Link>
    </View>
  )
}