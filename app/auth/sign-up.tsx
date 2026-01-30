import { supabase } from '@/lib/superbase';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';

export default function SignUp() {

    const router = useRouter();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nic, setNic] = useState('');
    const [birth, setBirth] = useState('');
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPasssword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false)

    async function signUpAcc() {
        //setLoading(true);
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { firstName: firstName, lastName: lastName, nic: nic, birth: birth, confirmEmail: confirmEmail , confirmPasssword: confirmPasssword }} });

        if (authError) {Alert.alert(authError.message)};
        if (authData.user) {await supabase.from('login').insert([{
                id:authData.user.id,
                email: email,
                password: password
            }])
        //setLoading(false);
    }

  return (
    <View>
        {/* <Text className="text-2xl color-amber-950">First Name</Text>
        <TextInput 
            value={firstName}
            onChangeText={setFirstName}
            placeholder="email@gmail.com"
            className="bg-red-500"
        />

        <Text>Last Name</Text>
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
        /> */}

        <Text>Email</Text>
        <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email@gmail.com"
            className=""
        />

        {/* <Text>Confirm Email</Text>
        <TextInput
            value={}
            onChangeText={}
            placeholder="email@gmail.com"
            className=""
        /> */}

        <Text>Password</Text>
        <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="email@gmail.com"
            className=""
        />

        {/* <Text>Confirm Password</Text>
        <TextInput
            value={}
            onChangeText={}
            placeholder="email@gmail.com"
            className=""
        /> */}

        <Button
            onPress={signUpAcc}
            disabled={loading}
            title='aaaaaa'
            //text={loading ? 'Creating account...' : 'Create account'}
        />

        {/* <Link 
            className=''
        > Sign In</Link> */}
    </View>
  )
}}