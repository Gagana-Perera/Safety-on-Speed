import React from 'react';
import { Button, Text, TextInput, View } from 'react-native';


import { useSignUpLogic } from '@/hooks/signup-db';


export default function SignUp() {

    const {
        firstName, setFirstName,
        lastName, setLastName,
        nic, setNic,
        birth, setBirth,
        email, setEmail,
        confirmEmail, setConfirmEmail,
        password, setPassword,
        loading,
        phone, setPhone,
        // otp, setOtp,
        // isPhoneVerified,
        // isModalVisible, setModalVisible,
        // otpStep, setOtpStep,
        // captchaRef,
        // hCaptchasiteKey,
        // handleSendOTP,
        // onCaptchaSuccess,
        // handleVerifyOTP,
        signUpAcc
    } = useSignUpLogic();

    // const {} = useOTP();

  return (
    <View>
        <Text className="">First Name</Text>
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
            {/* <Button 
                title={isPhoneVerified ? "Verified ✅" : "Verify Phone"} 
                color={isPhoneVerified ? "green" : "blue"}
                onPress={() => setModalVisible(true)} 
                disabled={isPhoneVerified || phone.length < 12}
            /> */}
        </View>

        

        <Text>Email</Text>
        <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email@gmail.com"
            className=""
        />

        <Text>Confirm Email</Text>
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
            placeholder="password"
            className=""
        />
    

        <Button
            onPress={signUpAcc}
            disabled={loading 
                // || !isPhoneVerified
            }
            title='Submit'
            //text={loading ? 'Creating account...' : 'Create account'}
        />

        {/* <Link 
            className=''
        > Sign In</Link> */}

    </View>
        )
    }