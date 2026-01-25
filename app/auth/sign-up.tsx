import { supabase } from '@/lib/superbase';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Button, Modal, Text, TextInput, View } from 'react-native';

import Hcaptcha from '@hcaptcha/react-native-hcaptcha';

export default function SignUp() {

    const router = useRouter();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nic, setNic] = useState('');
    const [birth, setBirth] = useState('');
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false)

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const [otpStep, setOtpStep] = useState(1);
    //const captchaRef = useRef(null);
    const captchaRef = useRef<Hcaptcha>(null);

    const handleSendOTP = () => {
        captchaRef.current?.show(); 
    };

    const onCaptchaSuccess = async (event) => {
        if (event && event.nativeEvent.data) {
            if (['cancel', 'error', 'expired'].includes(event.nativeEvent.data)) return;
            
            const captchaToken = event.nativeEvent.data;
            const { error } = await supabase.auth.signInWithOtp({
                phone: phone,
                options: { captchaToken }
            });

            if (error) {
                Alert.alert("Error sending OTP", error.message);
            } else {
                setOtpStep(2); // Move to OTP input view
            }
        }
    };

    const handleVerifyOTP = async () => {
        const { error } = await supabase.auth.verifyOtp({
            phone,
            token: otp,
            type: 'sms',
        });

        if (error) {
            Alert.alert("Error", "Invalid OTP. " + error.message);
        } else {
            Alert.alert("Success", "Phone verified successfully!");
            setIsPhoneVerified(true);
            setModalVisible(false); // Close Modal
        }
    };

    async function signUpAcc() {
        setLoading(true);
        

        if (email !== confirmEmail) {
            Alert.alert( "Email and Confirm Email Should Be Both Equal" )
            setLoading(true)
            
        } else {
            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { firstName: firstName, lastName: lastName, nic: nic, birth: birth, confirmEmail: confirmEmail, phone:phone }} });

            if (authError) {
                Alert.alert(authError.message)
                //console.log("auth error" + authError.message)
            };
            if (authData.user && email === confirmEmail  && isPhoneVerified) {
                    const { error: dbError } = await supabase.from('userpeople').insert([{
                    id:authData.user.id,

                    firstName:firstName,
                    lastName: lastName, 
                    nic: nic, 
                    birth: birth, 
                    confirmEmail: confirmEmail,

                    email: email,
                    password: password,

                    phone: phone
                }])


                if (dbError) {
                    console.log("dbError" + dbError.message);
                    Alert.alert(dbError.message);
                }   
            }
            setLoading(false);
        }
        
    }

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

        <Text>Contact No</Text>
        <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="PHONE NO"
            className=""
        />

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
            disabled={loading}
            title='Submit'
            //text={loading ? 'Creating account...' : 'Create account'}
        />

        {/* <Link 
            className=''
        > Sign In</Link> */}

        <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setModalVisible(true)}>
                <View>
                    <View>
                        <Text>
                            {otpStep === 1 ? "Verify Phone Number" : "Enter Verification Code"}
                        </Text>

                        {otpStep === 1 ? (
                            <>
                                <Text>We will send an OTP to {phone}</Text>
                                <View>
                                    <Button title="Cancel" color="red" onPress={() => setModalVisible(false)} />
                                    <Button title="Send OTP" onPress={handleSendOTP} />
                                </View>
                                
                                <Hcaptcha
                                    ref={captchaRef}
                                    siteKey="HCAPTCHA_SITE_KEY"
                                    baseUrl="http://localhost"
                                    languageCode="en"
                                    onMessage={onCaptchaSuccess}
                                />
                            </>
                        ) : (
                            <>
                                <TextInput 
                                    placeholder="Enter 6-digit OTP" 
                                    value={otp} 
                                    onChangeText={setOtp} 
                                    keyboardType="numeric"
                                />
                                <View>
                                    <Button title="Back" color="gray" onPress={() => setOtpStep(1)} />
                                    <Button title="Verify" onPress={handleVerifyOTP} />
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        
    </View>
        )
    }