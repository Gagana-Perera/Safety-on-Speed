import { supabase } from "@/lib/superbase";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

export default function SignUp() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nic, setNic] = useState("");
  const [birth, setBirth] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPasssword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUpAcc() {
    //setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName: firstName,
          lastName: lastName,
          nic: nic,
          birth: birth,
          confirmEmail: confirmEmail,
          confirmPasssword: confirmPasssword,
        },
      },
    });

    /*if (authError) {Alert.alert(authError.message)};
        if (authData.user) {await supabase.from('login').insert([{
                id:authData.user.id,
                email: email,
                password: password
            }])*/
    //setLoading(false);
  }

  return (
    <View>
      {/* <Text className="text-2xl color-amber-950">First Name</Text>
        <TextInput 
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First Name"
            className=""
        />

        <Text>Last Name</Text>
        <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last Name"
            className=""
        />

        <Text>NIC</Text>
        <TextInput
            value={nic}
            onChangeText={setNic}
            placeholder="NIC NO"
            className=""
        />
        

        <Text>Date of Birth</Text>
        <TextInput
            value={birth}
            onChangeText={setBirth}
            placeholder="YYYY/MM/DD"
            className=""
        />

        <View>
            <Text>Contact No</Text>
            <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+94770000000"
                className=""
                // editable={!isPhoneVerified}
                keyboardType="phone-pad"
                maxLength={12}
            />
        </View>

        

      <Text>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="email@gmail.com"
        className=""
      />

      {/* <Text>Confirm Email</Text>
        <TextInput
            value={confirmEmail}
            onChangeText={setConfirmEmail}
            placeholder="Confirm email@gmail.com"
            className=""
        />


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
        title="aaaaaa"
        //text={loading ? 'Creating account...' : 'Create account'}
      />

      {/* <Link 
            className=''
        > Sign In</Link> */}
    </View>
  );
}
